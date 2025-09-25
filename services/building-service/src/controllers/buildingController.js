// controllers/buildingController.js

const pool = require('../../../../db/db.js');

// ==============================
// GET ALL BUILDINGS
// ==============================
const getBuildings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT building_ID, zone_ID, building_name, description, exhibits
      FROM Building
      ORDER BY building_ID
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching buildings:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// GET BUILDING BY ID
// ==============================
const getBuildingById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT building_ID, zone_ID, building_name, description, exhibits
       FROM Building
       WHERE building_ID = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// CREATE A NEW BUILDING
// ==============================
const createBuilding = async (req, res) => {
  const { building_id, zone_id, building_name, description, exhibits } = req.body;

  if (building_id === undefined || building_id === null || !zone_id || !building_name) {
    return res.status(400).json({ message: 'building_id, zone_id and building_name are required' });
  }

  // Validate that building_id is a valid positive integer
  if (typeof building_id !== 'number' || !Number.isInteger(building_id) || building_id <= 0) {
    return res.status(400).json({ message: 'building_id must be a valid positive integer' });
  }

  // Validate that zone_id is a valid positive integer
  if (typeof zone_id !== 'number' || !Number.isInteger(zone_id) || zone_id <= 0) {
    return res.status(400).json({ message: 'zone_id must be a valid positive integer' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Building (building_ID, zone_ID, building_name, description, exhibits)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING building_ID, zone_ID, building_name, description, exhibits`,
      [building_id, zone_id, building_name, description || null, exhibits || null]
    );

    res.status(201).json({ message: 'Building created successfully', building: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {  // unique violation
      if (err.constraint === 'building_pkey') {
        return res.status(409).json({ message: 'Building ID already exists' });
      } else if (err.constraint && err.constraint.includes('building_name')) {
        return res.status(409).json({ message: 'Building name must be unique' });
      }
    }
    console.error('Error creating building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// UPDATE A BUILDING
// ==============================
const updateBuilding = async (req, res) => {
  const { id } = req.params;
  const { zone_id, building_name, description, exhibits } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Building
       SET zone_ID = COALESCE($1, zone_ID),
           building_name = COALESCE($2, building_name),
           description = COALESCE($3, description),
           exhibits = COALESCE($4, exhibits)
       WHERE building_ID = $5
       RETURNING building_ID, zone_ID, building_name, description, exhibits`,
      [zone_id || null, building_name || null, description || null, exhibits || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json({ message: 'Building updated successfully', building: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {  // unique violation
      return res.status(409).json({ message: 'Building name must be unique' });
    }
    console.error('Error updating building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

// ==============================
// DELETE A BUILDING
// ==============================
const deleteBuilding = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM Building
       WHERE building_ID = $1
       RETURNING building_ID, zone_ID, building_name, description, exhibits`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Building not found' });
    }

    res.json({ message: 'Building deleted successfully', building: result.rows[0] });
  } catch (err) {
    console.error('Error deleting building:', err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

module.exports = {
  getBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deleteBuilding
};