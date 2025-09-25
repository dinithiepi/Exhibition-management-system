// controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../../../db/db.js'); // PostgreSQL connection pool

// ======================
// REGISTER (Organizer)
// ======================
const register = async (req, res) => {
    try {
        const { fname, lname, email, contact_no, password } = req.body;

        if (!fname || !lname || !email || !password) {
            return res.status(400).json({ message: "fname, lname, Email (username) and Password are required" });
        }

        // Check if email (username) already exists
        const existingUser = await pool.query('SELECT * FROM Organizer WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email (username) already registered" });
        }

        // Generate organizer_name from fname and lname
        const organizer_name = `${fname} ${lname}`;

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert new organizer
        const result = await pool.query(
            `INSERT INTO Organizer (organizer_name, fname, lname, email, contact_no, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING organizer_ID, organizer_name, fname, lname, email AS username, contact_no`,
            [organizer_name, fname, lname, email, contact_no || null, password_hash]
        );

        res.status(201).json({ 
            message: "Organizer registered successfully",
            organizer: result.rows[0]
        });

    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

// ======================
// LOGIN (Organizer)
// ======================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email (username) and Password are required" });
        }

        // Find organizer
        const userResult = await pool.query('SELECT * FROM Organizer WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email (username) or password" });
        }

        const user = userResult.rows[0];

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email (username) or password" });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.organizer_ID, username: user.email }, // use email as username
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: "Login successful", token });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

module.exports = { register, login };
