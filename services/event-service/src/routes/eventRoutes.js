const express = require("express");
const router = express.Router();

// Import controller functions
const {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
} = require('../controllers/eventController');

// ======================
// Event Routes
// ======================

// Get all events
router.get('/', getEvents);

// Get a single event by ID
router.get('/:id', getEventById);

// Create a new event
router.post('/', createEvent);

// Update an existing event
router.put('/:id', updateEvent);

// Delete an event
router.delete('/:id', deleteEvent);

module.exports = router;
