from prelude import *
import json
from datetime import datetime
import uuid

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


def generate_unique_id():
    """Generate a unique ID for patients"""
    return str(uuid.uuid4())[:8]


class Model:
    def __init__(self, model_name, scaler_name, is_initial):
        self.model_name = model_name
        self.scaler_name = scaler_name
        # If models only for inital_cases - it works withanother set of params
        self.all_features_names = INITIAL_FEASTURES_NAMES if is_initial else ALL_FEATURE_NAMES
        self.is_initial = is_initial
        self._load()

    def _gen_paths(self, base='models'):
        # Think about extensions
        return (os.path.join(base, self.model_name + '.pkl'), os.path.join(base, self.scaler_name + '.pkl'))

    def _load(self):
        (model_path, scaler_path) = self._gen_paths() 
        self.model, self.scaler = load_ml_model(model_path, scaler_path)

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
        return (prediction.tolist()[0], probability.tolist()[0][1])


class Patient:
    def __init__(self, data):
        self.id = data.get('id') or generate_unique_id()
        self.patient_data = data.get('patient_data', {})
        self.created_at = data.get('created_at', datetime.now().isoformat())
        self.updated_at = data.get('updated_at', datetime.now().isoformat())
        
    def to_dict(self):
        """Convert patient to dictionary for serialization"""
        return {
            'id': self.id,
            'patient_data': self.patient_data,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    def update(self, data):
        """Update patient data"""
        self.patient_data.update(data.get('patient_data', {}))
        self.updated_at = datetime.now().isoformat()


class PatientStorage:
    def __init__(self, storage_dir='patient_storage'):
        self.storage_dir = storage_dir
        self._ensure_storage_dir()
    
    def _ensure_storage_dir(self):
        """Create storage directory if it doesn't exist"""
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)
    
    def _get_patient_path(self, patient_id):
        """Get file path for a patient"""
        return os.path.join(self.storage_dir, f"{patient_id}.json")
    
    def save_patient(self, patient):
        """Save patient to JSON file"""
        file_path = self._get_patient_path(patient.id)
        try:
            with open(file_path, 'w') as f:
                json.dump(patient.to_dict(), f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving patient {patient.id}: {str(e)}")
            return False
    
    def load_patient(self, patient_id):
        """Load patient from JSON file"""
        file_path = self._get_patient_path(patient_id)
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                return Patient(data)
        except Exception as e:
            print(f"Error loading patient {patient_id}: {str(e)}")
        return None
    
    def delete_patient(self, patient_id):
        """Delete patient file"""
        file_path = self._get_patient_path(patient_id)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as e:
            print(f"Error deleting patient {patient_id}: {str(e)}")
        return False
    
    # TODO: should return only "brief" data for start it can be name and id - data should be saved in a little bit complex way
    def get_all_patients(self):
        """Get all patients from storage"""
        patients = []
        try:
            for filename in os.listdir(self.storage_dir):
                if filename.endswith('.json'):
                    patient_id = filename[:-5]  # Remove .json extension
                    patient = self.load_patient(patient_id)
                    if patient:
                        patients.append(patient.to_dict())
        except Exception as e:
            print(f"Error loading all patients: {str(e)}")
        
        # Sort by creation date (newest first)
        patients.sort(key=lambda x: x['created_at'], reverse=True)
        return patients


class GlobalInfo:
    models = dict()
    patient_storage = None
    
    def __init__(self):
        self.patient_storage = PatientStorage()
    
    def add_model(self, model_name, scaler_name, is_initial=False):
        # TODO: add exception on model's addition fail
        self.models[model_name] = Model(model_name, scaler_name, is_initial)
    
    def get_model(self, model_name):
        return self.models.get(model_name)

    def get_all_models_info(self):
        return [{'name': model_name, 'type': model.get_type()} 
                for model_name, model in self.models.items()]
    
    def get_all_patients(self):
        return self.patient_storage.get_all_patients()
    
    def add_patient(self, patient_data):
        patient = Patient({
            'patient_data': patient_data
        })
        if self.patient_storage.save_patient(patient):
            return patient
        return None
    
    def edit_patient(self, patient_id, patient_data):
        patient = self.patient_storage.load_patient(patient_id)
        if patient:
            patient.update({
                'patient_data': patient_data
            })
            if self.patient_storage.save_patient(patient):
                return patient
        return None
    
    def get_patient(self, patient_id):
        return self.patient_storage.load_patient(patient_id)
    
    def delete_patient(self, patient_id):
        return self.patient_storage.delete_patient(patient_id)
