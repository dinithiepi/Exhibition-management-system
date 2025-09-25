/**
 * Mock database module for testing
 * Replaces the actual database connection with a mock query function
 * This prevents actual database connections during unit tests
 */

// Create a mock query function
const query = jest.fn().mockResolvedValue({ rows: [] });

// Create the mock db object
const db = {
  query,
};

// Export the mock
module.exports = db;