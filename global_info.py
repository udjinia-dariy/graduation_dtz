from models import Model
from patients import PatientStorage, Patient

class GlobalInfo:
    models = dict()
    patient_storage = None
    
    def __init__(self):
        self.patient_storage = PatientStorage()
    
    def add_model(self, model_name, scaler_name, is_initial=False, is_tree=False):
        # TODO: add exception on model's addition fail
        self.models[model_name] = Model(model_name, scaler_name, is_initial, is_tree)
    
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
