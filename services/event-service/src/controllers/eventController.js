// controllers/eventController.js

// Correct import
const pool = require('../../../../db/db.js');

// ==============================
// GET ALL EVENTS
// ==============================
const getEvents = async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT event_id, event_name, start_time, end_time, location, description,
          media_urls, event_categories
      FROM Events
      ORDER BY start_time
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// GET EVENT BY ID
// ==============================
const getEventById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT event_id, event_name, start_time, end_time, location, description,
              media_urls, event_categories
       FROM Events WHERE event_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// CREATE A NEW EVENT
// ==============================
const createEvent = async (req, res) => {
  const { event_name, start_time, end_time, location, description, media_urls, event_categories } = req.body;

  if (!event_name || !start_time || !end_time) {
    return res.status(400).json({ message: 'event_name, start_time, and end_time are required' });
  }

  if (end_time <= start_time) {
    return res.status(400).json({ message: 'End time must be later than start time' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Events (event_name, start_time, end_time, location, description, media_urls, event_categories)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING event_id, event_name, start_time, end_time, location, description, media_urls, event_categories`,
      [event_name, start_time, end_time, location || null, description || null, media_urls || null, event_categories || null]
    );

    res.status(201).json({ message: 'Event created successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// UPDATE AN EVENT
// ==============================
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { event_name, start_time, end_time, location, description, media_urls, event_categories } = req.body;

  if (start_time && end_time && end_time <= start_time) {
    return res.status(400).json({ message: 'End time must be later than start time' });
  }

  try {
    const result = await pool.query(
      `UPDATE Events
       SET event_name   = COALESCE($1, event_name),
           start_time   = COALESCE($2, start_time),
           end_time     = COALESCE($3, end_time),
           location     = COALESCE($4, location),
           description  = COALESCE($5, description),
           media_urls   = COALESCE($6, media_urls),
           event_categories = COALESCE($7, event_categories)
       WHERE event_id = $8
       RETURNING event_id, event_name, start_time, end_time, location, description, media_urls, event_categories`,
      [event_name || null, start_time || null, end_time || null, location || null, description || null, media_urls || null, event_categories || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event updated successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// DELETE AN EVENT
// ==============================
const deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM Events WHERE event_id = $1
       RETURNING event_id, event_name, start_time, end_time, location`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully', event: result.rows[0] });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
