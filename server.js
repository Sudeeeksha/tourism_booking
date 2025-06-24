const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const axios = require('axios');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3009;

app.use(bodyParser.urlencoded({ extended: true }));
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));

// Define the booking schema
const bookingSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    package: String,
    date: Date,
    guests: Number,
    bookingDate: {
        type: Date,
        default: Date.now,
    },
});

const Booking = mongoose.model('Booking', bookingSchema);

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.static('frontend'));
app.use(express.static('places'));


// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/template', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'template.html'));
});

app.get('/bookings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book.html'));
});

app.get('/chatbot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chatbot.html'));
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// API route to get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookingDate: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// API route to create a new booking
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.status(201).json({ message: 'Booking created successfully' });
    } catch (error) {
        console.error('Error saving booking:', error);
        res.status(500).json({ message: 'Error creating booking', error: error.message });
    }
});


//CHATBOT 
// Available tour packages
// Travel packages data
const packages = [
    { name: "Blue Lagoon", price: 50000, info: "A serene geothermal spa in Iceland known for its vibrant blue waters." },
    { name: "Taj Mahal", price: 20000, info: "A majestic symbol of love in India, one of the New Seven Wonders of the World." },
    { name: "Machu Picchu", price: 40000, info: "A historic Inca city in Peru, offering breathtaking views of the Andes mountains." },
    { name: "Arenal Volcano", price: 60000, info: "An active volcano in Costa Rica, surrounded by lush rainforest and hot springs." },
    { name: "Paris", price: 70000, info: "The romantic city of lights, known for the Eiffel Tower, museums, and fine cuisine." },
    { name: "Beijing", price: 40000, info: "The capital of China, home to the Great Wall and rich in cultural heritage." }
];

app.use(express.json());

function generatePackageDetails() {
    return packages.map(pkg => `
        Package Name: ${pkg.name}
        Price: ${pkg.price}
        Info: ${pkg.info}
    `).join('\n');
}

app.post('/api/chatbot', async (req, res) => {
    const { question } = req.body;

    if (!question || question.trim() === '') {
        return res.status(400).json({ answer: 'Please provide a valid question.' });
    }

    const packageDetails = generatePackageDetails();
    const prompt = `
        You are a helpful tourism booking assistant. Here is the list of available tourism packages:\n${packageDetails}\n
        User Question: ${question}\n
        Respond only using the provided packages. If the question is unrelated to tourism or cannot be answered using the packages, provide a general tourism-related response.
    `;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const response = await model.generateContent([prompt]);

        console.log("Full Response from Gemini:", response); // Debugging the response

        const textResponse = response?.response?.text?.() || 'No valid response received from Gemini.';

        res.json({ answer: textResponse });
    } catch (error) {
        console.error('Error communicating with Gemini:', error);
        res.status(500).json({ answer: 'An error occurred while processing your request.' });
    }
});

//PREDICTION
// app.get('/crowd-predictor', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'crowd-predictor.html'));
// });

// const fs = require('fs');
// const { LabelEncoder } = require('sklearn-preprocessing');
// const { RandomForestClassifier } = require('sklearn-ensemble');
// const pickle = require('picklejs');

// app.post('/api/predict', (req, res) => {
//     const { location, event, weather, weekend } = req.body;

//     try {
//         // Load the model and label encoders
//         const model = pickle.load(fs.readFileSync('model.pkl'));
//         const labelEncoders = pickle.load(fs.readFileSync('label_encoders.pkl'));

//         // Encode input
//         const encodedInput = [
//             labelEncoders['Location'].transform([location])[0],
//             labelEncoders['Event'].transform([event])[0],
//             labelEncoders['Weather'].transform([weather])[0],
//             weekend.toLowerCase() === 'yes' ? 1 : 0,
//         ];

//         // Predict
//         const prediction = model.predict([encodedInput])[0];
//         const result = prediction === 1 ? 'Peak Time' : 'Non-Peak Time';

//         res.json({ prediction: result });
//     } catch (error) {
//         console.error('Error during prediction:', error);
//         res.status(500).json({ error: 'Prediction failed. Please check input and try again.' });
//     }
// });

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});


