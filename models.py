
from prelude import *

# data prepare part

ALL_FEATURE_NAMES = [
        'age_onset', 'heredity', 'smoking_status', 'sex',
        'us1_thyroid_volume', 'us1_nodules', 'us1_nodules_cm',
        'tsh_1', 'ft4_1', 'ft3_1', 'ft3_to_ft4_ratio',
        'exophthalmos', 'thyrotoxic_cardiomyopathy', 'treatment_type',
        'tsh_3', 'us3_thyroid_volume', 'us3_nodules', 'us3_nodules_cm'
]

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

def extract_features(data):
    return [
        data.get(name, -1) 
        for name in ALL_FEATURE_NAMES
    ]

def prepare_features(features, scaler):

    # Create DataFrame with proper column names
    features_df = pd.DataFrame([features], columns=ALL_FEATURE_NAMES)

    print(f"DataFrame shape: {features_df.shape}")

    # Convert to numpy array for prediction
    if scaler is not None:
        # Scale only numerical columns
        features_df[NUM_COLS] = scaler.transform(features_df[NUM_COLS])
        print(f"Scaled numerical columns: {NUM_COLS}")

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
