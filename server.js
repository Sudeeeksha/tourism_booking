const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
require('dotenv').config();
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
// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.json());

// Routes
// Root route - serve price.html
app.use(express.static('public'));
app.use(express.static('frontend'));
app.use(express.static('places'));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/template', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'template.html'));
});
// Booking form route
app.get('/bookings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book.html'));
});

app.get('/arenal', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'arenal.html'));
});
app.get('/beijing', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'beijing.html'));
});
app.get('/blue', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'blue.html'));
});
app.get('/machu', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'machu.html'));
});
app.get('/paris', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'paris.html'));
});
app.get('/taj', (req, res) => {
    res.sendFile(path.join(__dirname, 'places', 'taj.html'));
});


// API routes
// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookingDate: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Create new booking
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