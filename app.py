from flask import Flask, request, render_template, jsonify
import os
import pickle
import numpy as np

app = Flask(__name__)

# Load the model and encoders
models_path = os.path.join(os.path.dirname(__file__), 'models')
model = pickle.load(open(os.path.join(models_path, 'model.pkl'), 'rb'))
label_encoders = pickle.load(open(os.path.join(models_path, 'label_encoders.pkl'), 'rb'))

@app.route('/peakpredict', methods=['GET', 'POST'])
def peak_predict():
    if request.method == 'POST':
        try:
            # Extract input data from the form
            location = request.form.get('Location')
            event = request.form.get('Event')
            weather = request.form.get('Weather')
            weekend = request.form.get('Weekend')

            # Label encode categorical inputs
            encoded_location = label_encoders['Location'].transform([location])[0]
            encoded_event = label_encoders['Event'].transform([event])[0]
            encoded_weather = label_encoders['Weather'].transform([weather])[0]

            # Map 'Weekend' input to numeric
            encoded_weekend = 1 if weekend.lower() == 'yes' else 0

            # Prepare input for prediction
            input_data = np.array([[encoded_location, encoded_event, encoded_weather, encoded_weekend]])

            # Make prediction
            prediction = model.predict(input_data)[0]
            result = 'Yes' if prediction == 1 else 'No'

            # Render result page with the prediction
            return render_template('result.html', result_message=f'Peak Time Prediction: {result}')
        except Exception as e:
            print(f"Error: {e}")
            # Render error page with error message
            return render_template('error.html', error_message="Invalid input or prediction error.")
    else:
        # Render the prediction form
        return render_template('peakpredict.html')

# Error handling route (optional, for other uncaught errors)
@app.errorhandler(404)
def not_found_error(e):
    return render_template('error.html', error_message="Page not found.")

@app.errorhandler(500)
def internal_error(e):
    return render_template('error.html', error_message="Internal server error.")

if __name__ == '__main__':
    app.run(debug=True, port=5001)
