from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_pymongo import PyMongo
from datetime import datetime
import os
import pickle
import numpy as np

app = Flask(__name__)

# Load environment variables
app.config['MONGO_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/tourism')
mongo = PyMongo(app)

# Load ML model and encoders
model = pickle.load(open('model.pkl', 'rb'))
label_encoders = pickle.load(open('label_encoders.pkl', 'rb'))

# Available tour packages
packages = [
    {"name": "Blue Lagoon", "price": 50000, "info": "A serene geothermal spa in Iceland known for its vibrant blue waters."},
    {"name": "Taj Mahal", "price": 20000, "info": "A majestic symbol of love in India, one of the New Seven Wonders of the World."},
    {"name": "Machu Picchu", "price": 40000, "info": "A historic Inca city in Peru, offering breathtaking views of the Andes mountains."},
    {"name": "Arenal Volcano", "price": 60000, "info": "An active volcano in Costa Rica, surrounded by lush rainforest and hot springs."},
    {"name": "Paris", "price": 70000, "info": "The romantic city of lights, known for the Eiffel Tower, museums, and fine cuisine."},
    {"name": "Beijing", "price": 40000, "info": "The capital of China, home to the Great Wall and rich in cultural heritage."}
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/template')
def template():
    return render_template('template.html')

@app.route('/bookings')
def bookings():
    return render_template('book.html')

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html')

@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    try:
        bookings = mongo.db.bookings.find().sort('bookingDate', -1)
        result = [
            {
                "name": b["name"],
                "email": b["email"],
                "phone": b["phone"],
                "package": b["package"],
                "date": b["date"].strftime('%Y-%m-%d'),
                "guests": b["guests"],
                "bookingDate": b["bookingDate"].strftime('%Y-%m-%d %H:%M:%S')
            }
            for b in bookings
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({"message": "Error fetching bookings", "error": str(e)}), 500

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    try:
        data = request.json
        data['bookingDate'] = datetime.now()
        mongo.db.bookings.insert_one(data)
        return jsonify({"message": "Booking created successfully"}), 201
    except Exception as e:
        return jsonify({"message": "Error creating booking", "error": str(e)}), 500

@app.route('/api/chatbot', methods=['POST'])
def chatbot_response():
    data = request.json
    question = data.get('question', '').strip()
    if not question:
        return jsonify({"answer": "Please provide a valid question."}), 400

    package_details = "\n".join([
        f"Package Name: {pkg['name']}\nPrice: {pkg['price']}\nInfo: {pkg['info']}"
        for pkg in packages
    ])

    prompt = f"""
        You are a helpful tourism booking assistant. Here is the list of available tourism packages:\n{package_details}\n
        User Question: {question}\n
        Respond only using the provided packages. If the question is unrelated to tourism or cannot be answered using the packages, provide a general tourism-related response.
    """

    # Mock AI response (Replace with actual AI API call if required)
    try:
        response = {"answer": f"This is a response to: {question}."}
        return jsonify(response)
    except Exception as e:
        return jsonify({"answer": "An error occurred while processing your request.", "error": str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict_crowd():
    try:
        data = request.json
        location = data.get('location')
        event = data.get('event')
        weather = data.get('weather')
        weekend = data.get('weekend', '').lower() == 'yes'

        # Encode input
        encoded_input = [
            label_encoders['Location'].transform([location])[0],
            label_encoders['Event'].transform([event])[0],
            label_encoders['Weather'].transform([weather])[0],
            1 if weekend else 0
        ]

        # Predict
        prediction = model.predict([encoded_input])[0]
        result = 'Peak Time' if prediction == 1 else 'Non-Peak Time'

        return jsonify({"prediction": result})
    except Exception as e:
        return jsonify({"error": "Prediction failed. Please check input and try again.", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=int(os.getenv('PORT', 3009)))
