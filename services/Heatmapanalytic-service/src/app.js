const dotenvx = require('@dotenvx/dotenvx');
dotenvx.config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5007;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import routes
const heatmapRoutes = require('./routes/heatmapRoutes');
app.use('/api/heatmap', heatmapRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Heatmap Analytics Backend Running');
});

// Express error handler middleware
app.use((err, req, res, next) => {
  console.error('Express error handler:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider adding logging to external monitoring and/or graceful shutdown strategy
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Consider graceful shutdown or process restart via PM2 or similar
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
