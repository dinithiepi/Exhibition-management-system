/**
 * Heatmap Controller Unit Tests
 * Tests the controller layer for heatmap-related endpoints
 */

// Mock the database module to prevent actual DB connections during tests
jest.mock('../../../src/utils/db', () => ({
  query: jest.fn(),
}));

// Mock the service layer to isolate controller testing
jest.mock('../../../src/services/heatmapService');

// Import modules after mocking
const heatmapController = require('../../../src/controller/heatmapController');
const heatmapService = require('../../../src/services/heatmapService');

describe('Heatmap Controller', () => {
  let mockReq, mockRes;

  // Setup mock request and response objects before each test
  beforeEach(() => {
    mockReq = {
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(), // Chainable status method
      json: jest.fn() // Mock json response method
    };
  });

  // Clear all mocks after each test to ensure test isolation
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeakOccupancy', () => {
    it('should return 400 if required parameters are missing', async () => {
      // Arrange: Set up request with missing building parameter
      mockReq.query = { hours: '24', zone: 'A' }; // Missing building

      // Act: Call the controller method
      await heatmapController.getPeakOccupancy(mockReq, mockRes);

      // Assert: Verify correct error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: hours, zone, building'
      });
    });

    it('should call service and return peak occupancy', async () => {
      // Arrange: Set up valid request and mock service response
      mockReq.query = { hours: '24', zone: 'A', building: 'Main' };
      heatmapService.getPeakOccupancy.mockResolvedValue(50);

      // Act: Call the controller method
      await heatmapController.getPeakOccupancy(mockReq, mockRes);

      // Assert: Verify service was called with correct parameters and response is correct
      expect(heatmapService.getPeakOccupancy).toHaveBeenCalledWith('24', 'A', 'Main');
      expect(mockRes.json).toHaveBeenCalledWith({ peak_occupancy: 50 });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange: Set up valid request and mock service error
      mockReq.query = { hours: '24', zone: 'A', building: 'Main' };
      heatmapService.getPeakOccupancy.mockRejectedValue(new Error('DB error'));

      // Act: Call the controller method
      await heatmapController.getPeakOccupancy(mockReq, mockRes);

      // Assert: Verify error handling and appropriate response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch peak occupancy' });
    });
  });

  describe('getAvgDwellTime', () => {
    it('should return 400 if required parameters are missing', async () => {
      // Arrange: Set up request with missing zone parameter
      mockReq.query = { hours: '24', building: 'Main' }; // Missing zone

      // Act: Call the controller method
      await heatmapController.getAvgDwellTime(mockReq, mockRes);

      // Assert: Verify correct error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required query parameters: hours, zone, building'
      });
    });

    it('should call service and return average dwell time', async () => {
      // Arrange: Set up valid request and mock service response
      mockReq.query = { hours: '24', zone: 'A', building: 'Main' };
      heatmapService.getAvgDwellTime.mockResolvedValue(30.5);

      // Act: Call the controller method
      await heatmapController.getAvgDwellTime(mockReq, mockRes);

      // Assert: Verify service was called with correct parameters and response is correct
      expect(heatmapService.getAvgDwellTime).toHaveBeenCalledWith('24', 'A', 'Main');
      expect(mockRes.json).toHaveBeenCalledWith({ avg_dwell_time_minutes: 30.5 });
    });

    it('should handle service errors gracefully', async () => {
      // Arrange: Set up valid request and mock service error
      mockReq.query = { hours: '24', zone: 'A', building: 'Main' };
      heatmapService.getAvgDwellTime.mockRejectedValue(new Error('DB error'));

      // Act: Call the controller method
      await heatmapController.getAvgDwellTime(mockReq, mockRes);

      // Assert: Verify error handling and appropriate response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch average dwell time' });
    });
  });

  describe('getActivityLevel', () => {
    it('should return 400 if hours parameter is missing', async () => {
      // Arrange: Set up request with missing hours parameter
      mockReq.query = { zone: 'A', building: 'Main' }; // Missing hours

      // Act: Call the controller method
      await heatmapController.getActivityLevel(mockReq, mockRes);

      // Assert: Verify correct error response
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required query parameter: hours'
      });
    });

    it('should call service and return activity level', async () => {
      // Arrange: Set up valid request and mock service response
      mockReq.query = { hours: '24' };
      const mockActivity = {
        unique_visitors: 75,
        entries: 100,
        exits: 80,
        activity_level: 'High'
      };
      heatmapService.getActivityLevel.mockResolvedValue(mockActivity);

      // Act: Call the controller method
      await heatmapController.getActivityLevel(mockReq, mockRes);

      // Assert: Verify service was called with correct parameters and response is correct
      expect(heatmapService.getActivityLevel).toHaveBeenCalledWith('24');
      expect(mockRes.json).toHaveBeenCalledWith(mockActivity);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange: Set up valid request and mock service error
      mockReq.query = { hours: '24' };
      heatmapService.getActivityLevel.mockRejectedValue(new Error('DB error'));

      // Act: Call the controller method
      await heatmapController.getActivityLevel(mockReq, mockRes);

      // Assert: Verify error handling and appropriate response
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to fetch activity level' });
    });
  });
});