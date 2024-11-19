const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');



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

//PREDICTION

// Route to render the form where users input data
app.get('/peakpredict', (req, res) => {
    res.render('peakpredict');
});

// Handle prediction request
app.post('/predict', (req, res) => {
    const { Year, Month, Location, Event, Weather, Weekend } = req.body;

    // Prepare input data to send to Python script
    const input = JSON.stringify({
        Year: parseInt(Year),
        Month: parseInt(Month),
        Location,
        Event,
        Weather,
        Weekend
    });

    // Spawn the Python script to get the prediction
    // Define the path to the Python script
    const pythonScriptPath = path.join(__dirname, 'predict.py');
    const python = spawn('python3', ['predict.py', input]);

    python.stdout.on('data', (data) => {
        try {
            // Parse the output from the Python script
            const result = JSON.parse(data.toString());

            // Check if the result contains an error
            if (result.error) {
                console.error(result.error);
                return res.status(500).render('error', { message: result.message });
            }

            // Render the result.ejs template with the prediction message
            res.render('result', { result_message: result.message });
        } catch (err) {
            console.error('Failed to parse Python script output:', err);
            res.status(500).render('error', { message: "Unexpected error in prediction processing." });
        }
    });

    // Handle errors in the Python script
    python.stderr.on('data', (data) => {
        console.error(`Error from Python script: ${data}`);
        res.status(500).render('error', { message: "An error occurred while predicting. Please try again." });
    });
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const response = await model.generateContent([prompt]);

        console.log("Full Response from Gemini:", response); // Debugging the response

        const textResponse = response?.response?.text?.() || 'No valid response received from Gemini.';

        res.json({ answer: textResponse });
    } catch (error) {
        console.error('Error communicating with Gemini:', error);
        res.status(500).json({ answer: 'An error occurred while processing your request.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

