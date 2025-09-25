const express = require("express");
const cors = require("cors");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Enable CORS for all domains (This can be customized as needed)
app.use(cors());

// Enable CORS for specific domain (optional, more secure):
// app.use(cors({
//   origin: "http://localhost:5173" // Your frontend URL (React app)
// }));

// Middleware for JSON parsing
app.use(express.json());

// Routes
app.use("/analytics", analyticsRoutes);

// Start server
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Overview Analytics Service running on port ${PORT}`);
});