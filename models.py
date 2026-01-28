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

def extract_features(data, features_names_list, fill_type=np.nan):
    features = []
    for name in features_names_list:
        value = data.get(name)
        if value is None or value == "":
            features.append(fill_type)
        else:
            features.append(value)
    return features

def prepare_features(features, scaler, features_names_list, fill_none=False):
    # Create DataFrame with proper column names
    features_df = pd.DataFrame([features], columns=features_names_list)

    if fill_none:
        # if nesseccary to fill None by hands
        numerical_cols_names = filter_array(NUM_COLS, features_names_list)
        # Convert to numpy array for prediction
        if scaler is not None:
            # Scale only numerical columns
            features_df[numerical_cols_names] = scaler.transform(features_df[numerical_cols_names])

        # Convert to numpy array for prediction
        return features_df.values

    # if None processing already in processor - do nothing else
    return scaler.transform(features_df)


class Model:
    def __init__(self, model_name, scaler_name, is_initial, is_tree, should_manualy_fill_none, display_name="NoName", description="No description"):
        self.model_name = model_name
        self.scaler_name = scaler_name
        # If models only for inital_cases - it works withanother set of params
        self.is_initial = is_initial
        self.all_features_names = INITIAL_FEASTURES_NAMES if is_initial else ALL_FEATURE_NAMES
        self.should_manualy_fill_none = should_manualy_fill_none
        self.description = description
        self.display_name = display_name if display_name != "NoName" else model_name
        self._load(is_tree)

    def _gen_paths(self, base='models'):
        # Think about extensions
        return (os.path.join(base, self.model_name + '.pkl'), os.path.join(base, self.scaler_name + '.pkl'))

    # TODO: is_tree must be in another place
    def _load(self, is_tree):
        (model_path, scaler_path) = self._gen_paths() 
        self.model, self.scaler = load_ml_model(model_path, scaler_path)
        self.explainer = shap.Explainer(self.model)

    def get_info(self):
        return {
            'display_name': self.display_name,
            'description': self.description,
            'type': 'init' if self.is_initial else 'follow-up',
        }

    def explain_features(self):
        if hasattr(self.model, 'feature_importances_'):
            return True, dict(zip(self.all_features_names, self.model.feature_importances_))
        else:
            importances = np.mean([
                est.feature_importances_ 
                for est in self.model.estimators_
            ], axis=0)
            return False, dict(zip(self.all_features_names, importances))

    def _explain(self, features_array):
        shap_values = self.explainer.shap_values(features_array)

        if len(shap_values.shape) == 2:  # Single class format
            # Already single class - xgboost explainer
            base_value = self.explainer.expected_value
            # Convert to probability effects (approximation)
            shap_values_positive  = shap_values * np.exp(-base_value) / (1 + np.exp(-base_value))**2
        elif len(shap_values.shape) == 3:  # Multi-class format
            shap_values_positive = shap_values[:, :, 1]  # Positive class only
        
        explanation = {}
        for i, feature in enumerate(self.all_features_names):
            shap_effect = float(shap_values_positive[0, i])
            
            explanation[feature] = {
                'value': float(features_array[0, i]),
                'shap_effect': shap_effect,
                'scaled_importance': float(abs(shap_effect)),
            }
        
        # Sort by absolute impact on positive class
        sorted_features = sorted(
            explanation.items(), 
            key=lambda x: abs(x[1]['shap_effect']), 
            reverse=True
        )
        
        # Get base value
        base_value = 0.0
        if hasattr(self.explainer, 'expected_value'):
            ev = self.explainer.expected_value
            if isinstance(ev, np.ndarray) and ev.shape == (2,):
                base_value = float(ev[1])  # Positive class base value

        return {
            'sorted_features': sorted_features,
            'base_value': base_value
        }

    def predict(self, data):
        features_array = prepare_features(extract_features(data, self.all_features_names), self.scaler, self.all_features_names, self.should_manualy_fill_none)

        # Make prediction
        prediction = self.model.predict(features_array)
        probability = self.model.predict_proba(features_array)

        if self.explainer is None:
            return {
                'prediction': prediction.tolist()[0],
                'probability': probability.tolist()[0][1],
            }

        explanation = self._explain(features_array)
        return {
            'prediction': prediction.tolist()[0],
            'probability': probability.tolist()[0][1],
            'feature_contributions': dict(explanation['sorted_features']),
            'base_value': explanation['base_value'],
        }

class ModelsStorage:
    def __init__(self, config_path):
        self.config_path = config_path
        self.models = {}
        self._load_config()
    
    def _load_config(self):
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            for model_config in config.get('models', []):
                self.add_model(
                    model_name=model_config['model_filename'],
                    scaler_name=model_config['scaler_filename'],
                    is_initial=model_config.get('is_initial', False),
                    is_tree=model_config.get('is_tree', True),
                    should_manualy_fill_none=model_config.get('should_manualy_fill_none', False),
                    display_name=model_config.get('display_name', 'NoName'),
                    description=model_config.get('description', 'No desc'),
                )
        except FileNotFoundError:
            print(f"Config file {self.config_path} not found")
        except Exception as e:
            print(f"Error loading config: {str(e)}")
    
    def add_model(self, model_name, scaler_name, is_initial=False, is_tree=True, should_manualy_fill_none=False, display_name=None, description=None):
        try:
            model = Model(model_name, scaler_name, is_initial, is_tree, should_manualy_fill_none, display_name, description)
            if model.model is not None:
                self.models[model_name] = model
                return True
        except Exception as e:
            print(f"Error adding model {model_name}: {str(e)}")
        return False
    
    def get_model(self, model_name):
        return self.models.get(model_name)
    
    def get_all_models(self):
        return self.models
    
    def get_all_models_info(self):
        return [{'name': name, 'info': model.get_info()} 
                for name, model in self.models.items()]
