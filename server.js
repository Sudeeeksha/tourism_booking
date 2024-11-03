const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/tourism_bookings', {
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

const Booking = mongoose.model('bookings', bookingSchema);

// Middleware
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'places')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'price.html'));
});

app.get('/bookings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bookings.html'));
});

// Fetch bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ bookingDate: -1 });
        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
    console.log('Received booking data:', req.body);
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        console.log('Booking saved successfully:', newBooking);
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
