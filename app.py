from flask import Flask, render_template, request, jsonify
import pickle
import os
import json
import joblib
import pandas as pd

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
def load_ml_model(model_path='models/xgboost_model.pkl', scaler_path='models/scaler.pkl'):
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

# Example of how to use the model (commented out for now)

@app.route('/api/predict_ml', methods=['POST'])
def predict_ml():
    # Load model (do this once, could be at startup)
    model, scaler = load_ml_model()
    
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500
    
    # Get and process data
    data = request.json

    features = [
        data.get('age_onset', 0),
        data.get('heredity', 0),
        data.get('smoking_status', 0),
        data.get('sex', 0),
        data.get('us1_thyroid_volume', 0.0),
        data.get('us1_nodules', 0),
        data.get('us1_nodules_cm', 0.0),
        data.get('tsh_1', 0.0),
        data.get('ft4_1', 0.0),
        data.get('ft3_1', 0.0),
        data.get('ft3_to_ft4_ratio', 0.0),
        data.get('exophthalmos', 0),
        data.get('thyrotoxic_cardiomyopathy', 0),
        data.get('treatment_type', 0),
        data.get('tsh_3', 0.0),
        data.get('us3_thyroid_volume', 0.0),
        data.get('us3_nodules', 0),
        data.get('us3_nodules_cm', 0.0)
    ]

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
    features_array = features_df.values

    # Make prediction
    prediction = model.predict(features_array)

    return jsonify({
        'prediction': prediction.tolist(),
        'status': 'success'
    })


if __name__ == '__main__':
    # Create models directory if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')
    
    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)
