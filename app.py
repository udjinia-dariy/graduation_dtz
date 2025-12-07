from flask import Flask, render_template, request, jsonify
import pickle
import os
import json

app = Flask(__name__, static_folder='static')

# Home page - serves index.html
@app.route('/')
def home():
    return render_template('index.html')

# Optional: Sample API endpoint structure for future ML model
@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Example endpoint for ML predictions.
    This will be expanded when you add your model.
    """
    try:
        # Get data from request
        data = request.json
        
        # Example structure - customize based on your model's needs
        # features = data.get('features', [])
        
        # For now, return a placeholder response
        response = {
            'status': 'success',
            'message': 'ML prediction endpoint ready',
            'prediction': None,  # Will be replaced with actual prediction
            'input_data': data
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

# Helper function to load ML model (for future use)
def load_ml_model(model_path='models/model.pkl', scaler_path='models/scaler.pkl'):
    """
    Load ML model and scaler from pickle files.
    Call this in your predict function when ready.
    """
    try:
        with open(model_path, 'rb') as model_file:
            model = pickle.load(model_file)
        
        scaler = None
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as scaler_file:
                scaler = pickle.load(scaler_file)
        
        return model, scaler
    except FileNotFoundError:
        print(f"Model files not found at {model_path}")
        return None, None
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None, None

# Example of how to use the model (commented out for now)
"""
@app.route('/api/predict_ml', methods=['POST'])
def predict_ml():
    # Load model (do this once, could be at startup)
    model, scaler = load_ml_model()
    
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500
    
    # Get and process data
    data = request.json
    features = data.get('features')
    
    # Scale features if scaler exists
    if scaler:
        features = scaler.transform([features])
    
    # Make prediction
    prediction = model.predict(features)
    
    return jsonify({
        'prediction': prediction.tolist(),
        'status': 'success'
    })
"""

if __name__ == '__main__':
    # Create models directory if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')
    
    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)
