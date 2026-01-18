from prelude import *
from models import GlobalInfo, Model

app = Flask(__name__, static_folder='static')

# Home page - serves index.html
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/predict_ml', methods=['POST'])
def predict_ml():
    # Get and process data
    data = request.json

    # Should validate data here first (or maybe in model)
    # GlobalInfoObj.get_model('random_forest_model').predict(data)
    prediction, probability = GlobalInfoObj.get_model('xgboost_model').predict(data)

    print("Prediction result:", prediction, probability)

    return jsonify({
        'prediction': prediction,
        'probability': probability,
        'status': 'success'
    })

GlobalInfoObj = GlobalInfo()

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')

    GlobalInfoObj.add_model('xgboost_model', 'scaler')
    GlobalInfoObj.add_model('random_forest_model', 'scaler')
    # GlobalInfoObj.add_model('initial_data_random_forest_model', 'initial_data_scaler')

    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)

