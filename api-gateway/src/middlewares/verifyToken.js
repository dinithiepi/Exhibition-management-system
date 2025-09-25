const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Log the value for debugging
console.log('JWT_SECRET from env:', process.env.JWT_SECRET);

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    // Log which secret we're using
    console.log('Using JWT_SECRET from:', process.env.JWT_SECRET ? 'environment' : 'fallback');
    
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            console.error("JWT verification error:", err.message);
            return res.status(403).json({ message: "Invalid token." });
        }

        req.user = decoded; // Attach decoded payload to request
        next();
    });
};

module.exports = verifyToken;