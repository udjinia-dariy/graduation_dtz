
from prelude import *

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

def extract_features(data):
    features = [
        data.get('age_onset', -1),
        data.get('heredity', -1),
        data.get('smoking_status', -1),
        data.get('sex', -1),
        data.get('us1_thyroid_volume', -1),
        data.get('us1_nodules', -1),
        data.get('us1_nodules_cm', -1),
        data.get('tsh_1', -1),
        data.get('ft4_1', -1),
        data.get('ft3_1', -1),
        data.get('ft3_to_ft4_ratio', -1),
        data.get('exophthalmos', -1),
        data.get('thyrotoxic_cardiomyopathy', -1),
        data.get('treatment_type', -1),
        data.get('tsh_3', -1),
        data.get('us3_thyroid_volume', -1),
        data.get('us3_nodules', -1),
        data.get('us3_nodules_cm', -1)
    ]
    return features

def prepare_features(features, scaler):
    # Define categorical and numerical columns
    categorical_cols = [
        "heredity",
        "smoking_status", 
        "sex",
        "us1_nodules",
        "exophthalmos",
        "thyrotoxic_cardiomyopathy",
        "treatment_type", 
        "us3_nodules"
    ]

    # Create a list of all feature names in the correct order
    all_feature_names = [
        'age_onset', 'heredity', 'smoking_status', 'sex',
        'us1_thyroid_volume', 'us1_nodules', 'us1_nodules_cm',
        'tsh_1', 'ft4_1', 'ft3_1', 'ft3_to_ft4_ratio',
        'exophthalmos', 'thyrotoxic_cardiomyopathy', 'treatment_type',
        'tsh_3', 'us3_thyroid_volume', 'us3_nodules', 'us3_nodules_cm'
    ]

    # Create DataFrame with proper column names
    features_df = pd.DataFrame([features], columns=all_feature_names)

    # Identify numerical columns (all columns not in categorical_cols)
    num_cols = [col for col in all_feature_names if col not in categorical_cols]

    print(f"Categorical columns: {categorical_cols}")
    print(f"Numerical columns: {num_cols}")
    print(f"DataFrame shape: {features_df.shape}")

    # Convert to numpy array for prediction
    if scaler is not None:
        # Scale only numerical columns
        features_df[num_cols] = scaler.transform(features_df[num_cols])
        print(f"Scaled numerical columns: {num_cols}")

    # Convert to numpy array for prediction
    return features_df.values


class Model:
    def __init__(self, model_name, scaler_name):
        self.model_name = model_name
        self.scaler_name = scaler_name
        self._load()

    def _genPaths(self, base='models'):
        # Think about extensions
        return (os.path.join(base, self.model_name + '.pkl'), os.path.join(base, self.scaler_name + '.pkl'))

    def _load(self):
        (model_path, scaler_path) = self._genPaths() 
        self.model, self.scaler = load_ml_model(model_path, scaler_path)

    def predict(self, data):
        # Maybe extract_features should be done outside of this method
        features_array = prepare_features(extract_features(data), self.scaler)

        # Make prediction
        prediction = self.model.predict(features_array)
        probability = self.model.predict_proba(features_array)
        return (prediction.tolist()[0], probability.tolist()[0][1])

class GlobalInfo:
    models = dict()

    def add_model(self, model_name, scaler_name):
        self.models[model_name] = Model(model_name, scaler_name)
    
    def get_model(self, model_name):
        return self.models.get(model_name)
