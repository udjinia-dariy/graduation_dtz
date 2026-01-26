from models import ModelsStorage
from patients import PatientStorage, Patient

class GlobalInfo:
    models_storage = None
    patient_storage = None
    
    def __init__(self, config_path='models/models_config.json'):
        self.models_storage = ModelsStorage(config_path)
        self.patient_storage = PatientStorage()
    
    def get_model(self, model_name):
        return self.models_storage.get_model(model_name)
    
    def get_all_models_info(self):
        return self.models_storage.get_all_models_info()
    
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
