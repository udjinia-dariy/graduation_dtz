from prelude import *
from datetime import datetime
import uuid

def generate_unique_id():
    """Generate a unique ID for patients"""
    return str(uuid.uuid4())[:8]


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

