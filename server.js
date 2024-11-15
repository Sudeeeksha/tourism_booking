const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3009;

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

// Travel packages data
const packages = [
    { name: "Blue Lagoon", price: 50000, info: "A serene geothermal spa in Iceland known for its vibrant blue waters." },
    { name: "Taj Mahal", price: 20000, info: "A majestic symbol of love in India, one of the New Seven Wonders of the World." },
    { name: "Machu Picchu", price: 40000, info: "A historic Inca city in Peru, offering breathtaking views of the Andes mountains." },
    { name: "Arenal Volcano", price: 60000, info: "An active volcano in Costa Rica, surrounded by lush rainforest and hot springs." },
    { name: "Paris", price: 70000, info: "The romantic city of lights, known for the Eiffel Tower, museums, and fine cuisine." },
    { name: "Beijing", price: 40000, info: "The capital of China, home to the Great Wall and rich in cultural heritage." }
];

// Function to find the best package based on budget
const getBestPackage = (budget) => {
    const availablePackages = packages.filter(pkg => pkg.price <= budget);
    if (availablePackages.length > 0) {
        return availablePackages.reduce((prev, curr) => (curr.price > prev.price ? curr : prev));
    }
    return null;
};

// Define the /api/suggest-packages endpoint using local chatbot API
app.post('/api/suggest-packages', async (req, res) => {
    const budget = parseInt(req.body.budget);

    if (isNaN(budget) || budget <= 0) {
        return res.status(400).json({ message: "Invalid budget. Please enter a positive number." });
    }

    const bestPackage = getBestPackage(budget);

    if (!bestPackage) {
        return res.json({ suggestion: "Sorry, no packages are available within your budget. Please try a higher budget." });
    }

    const prompt = `The user has a budget of Rs.${budget}. Recommend the best package: ${bestPackage.name} for Rs.${bestPackage.price}.`;

    try {
        // Call the local chatbot API
        const response = await fetch('http://localhost:3009/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Chatbot API error: ${response.statusText}`);
        }

        const data = await response.json();
        const enhancedSuggestion = data.choices[0].text.trim();
        res.json({ suggestion: enhancedSuggestion });
    } catch (error) {
        console.error('Error with Chatbot API:', error);
        res.status(500).json({ message: 'Error fetching suggestions. Please try again later.' });
    }
});

// Chatbot API endpoint
app.post('/api/chatbot', (req, res) => {
    const prompt = req.body.prompt;

    // Mock response from chatbot (Replace this with actual chatbot logic if needed)
    const responseText = `Based on the prompt: ${prompt}, I suggest you go for the best package available.`;
    
    res.json({
        choices: [
            { text: responseText }
        ]
    });
});

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

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
