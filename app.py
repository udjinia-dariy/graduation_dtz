from prelude import *
from global_info import GlobalInfo

app = Flask(__name__, static_folder='static')

GlobalInfoObj = GlobalInfo()

# Home page - serves index.html
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/models', methods=['GET'])
def get_available_models():
    return jsonify(GlobalInfoObj.get_all_models_info())

@app.route('/api/patients', methods=['GET'])
def get_all_patients():
    return jsonify(GlobalInfoObj.get_all_patients())

# Get specific patient
@app.route('/api/patient/<string:patient_id>', methods=['GET'])
def get_patient(patient_id):
    patient = GlobalInfoObj.get_patient(patient_id)
    if patient:
        return jsonify(patient.to_dict())
    return jsonify({'error': 'Patient not found'}), 404

# Add new patient
@app.route('/api/patient/', methods=['POST'])
def add_patient():
    try:
        patient_data = request.json
        if not patient_data:
            return jsonify({'error': 'No data provided'}), 400
        patient = GlobalInfoObj.add_patient(patient_data)
        if patient:
            return jsonify({
                'status': 'success',
                'patient_id': patient.id,
                'message': 'Patient added successfully'
            })
        return jsonify({'error': 'Failed to add patient'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Edit existing patient
@app.route('/api/patient/<string:patient_id>', methods=['PUT'])
def edit_patient(patient_id):
    try:
        patient_data = request.json['patient_data']
        if not patient_data:
            return jsonify({'error': 'No data provided'}), 400
        
        patient = GlobalInfoObj.edit_patient(patient_id, patient_data)
        if patient:
            return jsonify({
                'status': 'success',
                'patient_id': patient.id,
                'message': 'Patient updated successfully'
            })
        return jsonify({'error': 'Patient not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete patient
@app.route('/api/patient/<string:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        if GlobalInfoObj.delete_patient(patient_id):
            return jsonify({
                'status': 'success',
                'message': 'Patient deleted successfully'
            })
        return jsonify({'error': 'Patient not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict_ml', methods=['POST'])
def predict_ml():
    # Get and process data
    data = request.json

    # Should validate data here first
    res = GlobalInfoObj.get_model(data['model_name']).predict(data)

    print("Prediction result:", res['prediction'], res['probability'])

    response = dict(res)
    response['status'] = 'success'
    return jsonify(response)

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')

    # TODO: separate this info in special file with model description
    GlobalInfoObj.add_model('xgboost_model', 'scaler', should_manualy_fill_none=True)
    GlobalInfoObj.add_model('random_forest_model', 'scaler', is_tree=True, should_manualy_fill_none=True)
    GlobalInfoObj.add_model('init_random_forest_model', 'init_scaler', is_initial=True, is_tree=True, should_manualy_fill_none=True)
    GlobalInfoObj.add_model('filled_random_forest_model', 'filled_preprocessor', is_tree=True)

    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)
