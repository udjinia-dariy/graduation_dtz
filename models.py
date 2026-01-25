from prelude import *
import shap

# TODO:  Move it later in utils ===== 
def filter_array(source_array, reference_array):
    """Фильтрует source_array, оставляя только элементы из reference_array"""
    reference_set = set(reference_array)
    return [item for item in source_array if item in reference_set]
# ========== 

# data prepare part

# order of names is important
INITIAL_FEASTURES_NAMES = [
        'age_onset', 'heredity', 'smoking_status', 'sex',
        'us1_thyroid_volume', 'us1_nodules', 'us1_nodules_cm',
        'tsh_1', 'ft4_1', 'ft3_1', 'ft3_to_ft4_ratio',
        'exophthalmos', 'thyrotoxic_cardiomyopathy'
]

READMISSION_FEATURE_NAMES = [
        'treatment_type', 'tsh_3', 'us3_thyroid_volume', 'us3_nodules', 'us3_nodules_cm'
]

# thanks to good luck - ALL_FEATURE_NAMES order is same as inital case + readmission case
ALL_FEATURE_NAMES = INITIAL_FEASTURES_NAMES + READMISSION_FEATURE_NAMES

# Define categorical and numerical columns
CATEGORICAL_COLS = [
    "heredity",
    "smoking_status", 
    "sex",
    "us1_nodules",
    "exophthalmos",
    "thyrotoxic_cardiomyopathy",
    "treatment_type", 
    "us3_nodules"
]

# Identify numerical columns (all columns not in CATEGORICAL_COLS)
NUM_COLS = [col for col in ALL_FEATURE_NAMES if col not in CATEGORICAL_COLS]

print(f"Categorical columns: {CATEGORICAL_COLS}")
print(f"Numerical columns: {NUM_COLS}")

# Helper function to load ML model (for future use)
def load_ml_model(model_path, scaler_path):
    """
    Load ML model and scaler from pickle files.
    """
    try:
        with open(model_path, 'rb') as model_file:
            model = joblib.load(model_file)
        
        scaler = None
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as scaler_file:
                scaler = joblib.load(scaler_file)
        
        return model, scaler
    except FileNotFoundError:
        print(f"Model files not found at {model_path}")
        return None, None
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None, None

def extract_features(data, features_names_list):
    return [
        data.get(name, -1) 
        for name in features_names_list
    ]

def prepare_features(features, scaler, features_names_list):
    # Create DataFrame with proper column names
    features_df = pd.DataFrame([features], columns=features_names_list)

    print(f"DataFrame shape: {features_df.shape}")

    numerical_cols_names = filter_array(NUM_COLS, features_names_list)
    # Convert to numpy array for prediction
    if scaler is not None:
        # Scale only numerical columns
        features_df[numerical_cols_names] = scaler.transform(features_df[numerical_cols_names])
        print(f"Scaled numerical columns: {numerical_cols_names}")

    # Convert to numpy array for prediction
    return features_df.values

class Model:
    def __init__(self, model_name, scaler_name, is_initial, is_tree):
        self.model_name = model_name
        self.scaler_name = scaler_name
        # If models only for inital_cases - it works withanother set of params
        self.is_initial = is_initial
        self.all_features_names = INITIAL_FEASTURES_NAMES if is_initial else ALL_FEATURE_NAMES
        self._load(is_tree)

    def _gen_paths(self, base='models'):
        # Think about extensions
        return (os.path.join(base, self.model_name + '.pkl'), os.path.join(base, self.scaler_name + '.pkl'))

    # TODO: is_tree must be in another place
    def _load(self, is_tree):
        (model_path, scaler_path) = self._gen_paths() 
        self.model, self.scaler = load_ml_model(model_path, scaler_path)
        self.explainer = shap.TreeExplainer(self.model) if is_tree else None

    def get_type(self):
        return 'init' if self.is_initial else 'follow-up'

    def explain_features(self):
        if hasattr(self.model, 'feature_importances_'):
            return True, dict(zip(self.all_features_names, self.model.feature_importances_))
        else:
            importances = np.mean([
                est.feature_importances_ 
                for est in self.model.estimators_
            ], axis=0)
            return False, dict(zip(self.all_features_names, importances))

    def predict(self, data):
        # Maybe extract_features should be done outside of this method
        # TODO: sign about architecture problems - one parametr in two places
        features_array = prepare_features(extract_features(data, self.all_features_names), self.scaler, self.all_features_names)

        # Make prediction
        prediction = self.model.predict(features_array)
        probability = self.model.predict_proba(features_array)
        # if self.explainer == None:
        #     return {
        #         'prediction': prediction.tolist()[0],
        #         'probability': probability.tolist()[0][1],
        #     }
        # shap_values = self.explainer.shap_values(features_array)
        #
        # print("SHAP_VALUES", shap_values)
        #
        # # Prepare explanation
        # explanation = {}
        # for i, feature in enumerate(self.all_features_names):
        #     explanation[feature] = {
        #         'value': float(features_array[0][i]),
        #         'shap_effect': float(shap_values[1][0][i]) if isinstance(shap_values, list) else float(shap_values[0][i]),
        #         'scaled_importance': float(abs(shap_values[1][0][i])) if isinstance(shap_values, list) else float(abs(shap_values[0][i]))
        #     }
        #
        #
        # # Sort features by absolute impact
        # sorted_features = sorted(
        #     explanation.items(), 
        #     key=lambda x: abs(x[1]['shap_effect']), 
        #     reverse=True
        # )
        
        return {
            'prediction': prediction.tolist()[0],
            'probability': probability.tolist()[0][1],
            # 'feature_contributions': dict(sorted_features),
            # 'base_value': float(self.explainer.expected_value[1] if isinstance(self.explainer.expected_value, list) else self.explainer.expected_value)
        }

