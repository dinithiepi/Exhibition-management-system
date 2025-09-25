/**
 * Heatmap API Integration Tests
 * Tests the full API endpoint flow from request to response
 */

// Mock the database to prevent actual connections
jest.mock('../../src/utils/db', () => ({
  query: jest.fn(),
}));

// Mock the service layer
jest.mock('../../src/services/heatmapService');

const request = require('supertest');
const express = require('express');
const heatmapRoutes = require('../../src/routes/heatmapRoutes');
const heatmapService = require('../../src/services/heatmapService');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/heatmap', heatmapRoutes);

describe('Heatmap API Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/heatmap/peak-occupancy', () => {
    it('should return peak occupancy data', async () => {
      // Arrange: Mock service response
      heatmapService.getPeakOccupancy.mockResolvedValue(50);

      // Act: Make API request
      const response = await request(app)
        .get('/api/heatmap/peak-occupancy')
        .query({ hours: '24', zone: 'A', building: 'Main' });

      // Assert: Verify response and service call
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ peak_occupancy: 50 });
      expect(heatmapService.getPeakOccupancy).toHaveBeenCalledWith('24', 'A', 'Main');
    });

    it('should return 400 for missing parameters', async () => {
      // Act: Make API request with missing parameter
      const response = await request(app)
        .get('/api/heatmap/peak-occupancy')
        .query({ hours: '24', zone: 'A' }); // Missing building

      // Assert: Verify error response
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required query parameters');
    });
  });

  describe('GET /api/heatmap/avg-dwell-time', () => {
    it('should return average dwell time data', async () => {
      // Arrange: Mock service response
      heatmapService.getAvgDwellTime.mockResolvedValue(30.5);

      // Act: Make API request
      const response = await request(app)
        .get('/api/heatmap/avg-dwell-time')
        .query({ hours: '24', zone: 'A', building: 'Main' });

      // Assert: Verify response and service call
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ avg_dwell_time_minutes: 30.5 });
      expect(heatmapService.getAvgDwellTime).toHaveBeenCalledWith('24', 'A', 'Main');
    });
  });

  describe('GET /api/heatmap/activity-level', () => {
    it('should return activity level data', async () => {
      // Arrange: Mock service response
      const mockActivity = {
        unique_visitors: 75,
        entries: 100,
        exits: 80,
        activity_level: 'High'
      };
      heatmapService.getActivityLevel.mockResolvedValue(mockActivity);

      // Act: Make API request
      const response = await request(app)
        .get('/api/heatmap/activity-level')
        .query({ hours: '24' });

      // Assert: Verify response and service call
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockActivity);
      expect(heatmapService.getActivityLevel).toHaveBeenCalledWith('24');
    });
  });
});