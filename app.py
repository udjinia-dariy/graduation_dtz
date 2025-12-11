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

def test_predictions():
    """
    Test prediction function with provided test data
    """

    # Load model (do this once, could be at startup)
    model, scaler = load_ml_model()

    # Test data with columns in the same order as features
    test_cases = [
        # Format: [feature1, feature2, ..., expected_prediction, expected_probability]
        [24, 0, 1, 1, 43, 1, 1, 0.002, 54.3, 23.1, 0.43, 1, 1, 0, 1.1, 54, 1, 1, 1, 0.868606],
        [18, 0, 2, 0, 56, 0, 0, 0.002, 81, 43, 0.53, 1, 1, 1, 0.001, 141.2, 0, 2, 0, 0.043283],
        [53, -1, -1, 0, 31.1, 0, 0, -1, -1, -1, -1, 0, 0, 0, 0.01, 33.1, 0, -1, 1, 0.805339],
        [48, -1, -1, 0, 34.2, 0, 0, -1, -1, -1, -1, -1, -1, -1, 1.1, -1, 0, -1, 1, 0.906588],
        [30, 1, 0, 0, 17, 0, 0, 0.01, -1, -1, -1, 0, 0, -1, 0.1, 54, 0, -1, 0, 0.027123]
    ]
    
    # Feature names (excluding prediction and probability)
    all_feature_names = [
        'age_onset', 'heredity', 'smoking_status', 'sex',
        'us1_thyroid_volume', 'us1_nodules', 'us1_nodules_cm',
        'tsh_1', 'ft4_1', 'ft3_1', 'ft3_to_ft4_ratio',
        'exophthalmos', 'thyrotoxic_cardiomyopathy', 'treatment_type',
        'tsh_3', 'us3_thyroid_volume', 'us3_nodules', 'us3_nodules_cm'
    ]
    
    # Categorical columns (same as in your prepare_features function)
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
    
    # Numerical columns
    num_cols = [col for col in all_feature_names if col not in categorical_cols]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*60}")
        print(f"Test Case {i}")
        print(f"{'='*60}")
        
        # Separate features from expected results
        features = test_case[:18]  # First 18 are features
        expected_pred = test_case[18]  # 19th is expected prediction
        expected_prob = test_case[19]  # 20th is expected probability
        
        # Create dictionary matching your prepare_features function format
        data_dict = {}
        for idx, feature_name in enumerate(all_feature_names):
            data_dict[feature_name] = features[idx]
        
        print(f"Input data: {data_dict}")
        
        # Simulate prepare_features function
        features_df = pd.DataFrame([features], columns=all_feature_names)
        

        # Convert to numpy array for prediction
        if scaler is not None:
            # Scale only numerical columns
            features_df[num_cols] = scaler.transform(features_df[num_cols])
            print(f"Scaled numerical columns: {num_cols}")
            
        # Convert to numpy array (simulating the end of prepare_features)
        features_array = features_df.values
        
        # Make prediction
        prediction = model.predict(features_array)
        probability = model.predict_proba(features_array)
        
        print(f"Expected prediction: {expected_pred}")
        print(f"Expected probability[1]: {expected_prob}")
        print(f"Simulated prediction: {prediction}")
        print(f"Simulated probability: {probability}")
        
        # Calculate error (if comparing with actual model)
        pred_error = abs(prediction[0] - expected_pred)
        prob_error = abs(probability[0][1] - expected_prob)
        
        results.append({
            'test_case': i,
            'prediction': prediction[0],
            'probability_class_1': probability[0][1],
            'expected_prediction': expected_pred,
            'expected_probability': expected_prob,
            'prediction_error': pred_error,
            'probability_error': prob_error,
            'match': pred_error < 0.5 and prob_error < 0.01  # Thresholds for matching
        })
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    matches = sum(1 for r in results if r['match'])
    print(f"Test cases passed: {matches}/{len(results)}")
    
    for result in results:
        status = "✓ PASS" if result['match'] else "✗ FAIL"
        print(f"Test {result['test_case']}: {status}")
        if not result['match']:
            print(f"  Prediction diff: {result['prediction_error']:.4f}")
            print(f"  Probability diff: {result['probability_error']:.4f}")
    
    return results

def prepare_features(data):
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


@app.route('/api/predict_ml', methods=['POST'])
def predict_ml():
    # Load model (do this once, could be at startup)
    model, scaler = load_ml_model()
    
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500
    
    # Get and process data
    data = request.json

    features_array = prepare_features(data);

    # Make prediction
    prediction = model.predict(features_array)
    probability = model.predict_proba(features_array)
    print("Prediction result:", prediction, probability)

    return jsonify({
        'prediction': prediction.tolist()[0],
        'probability': probability.tolist()[0][1],
        'status': 'success'
    })


if __name__ == '__main__':
    test_predictions();

    # Create models directory if it doesn't exist
    if not os.path.exists('models'):
        os.makedirs('models')
    
    # Run the server
    app.run(host='0.0.0.0', port=5000, debug=True)


