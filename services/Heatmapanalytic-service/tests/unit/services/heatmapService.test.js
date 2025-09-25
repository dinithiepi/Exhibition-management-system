/**
 * Heatmap Service Unit Tests
 * Tests the service layer for heatmap-related business logic
 */

// Mock the database module to prevent actual DB connections during tests
// This is crucial to isolate service testing from database dependencies
jest.mock('../../../src/utils/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }), // Default mock response
}));

// Import modules after mocking
const heatmapService = require('../../../src/services/heatmapService');
const db = require('../../../src/utils/db'); // This will be the mocked version

describe('Heatmap Service', () => {
  // Clear all mocks after each test to ensure test isolation
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeakOccupancy', () => {
    it('should return peak occupancy from database', async () => {
      // Arrange: Mock database response
      const mockRows = [{ peak: 50 }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getPeakOccupancy('24', 'A', 'Main');

      // Assert: Verify database query was called with correct SQL and parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT MAX(occupancy) AS peak'),
        ['A', 'Main']
      );
      // Verify the service returns the correct result
      expect(result).toBe(50);
    });

    it('should return 0 when no data is available', async () => {
      // Arrange: Mock database response with null peak
      const mockRows = [{ peak: null }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getPeakOccupancy('24', 'A', 'Main');

      // Assert: Verify service returns 0 for no data
      expect(result).toBe(0);
    });

    it('should handle database errors by propagating them', async () => {
      // Arrange: Mock database error
      db.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert: Verify service propagates database errors
      await expect(heatmapService.getPeakOccupancy('24', 'A', 'Main'))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('getAvgDwellTime', () => {
    it('should return average dwell time from database', async () => {
      // Arrange: Mock database response
      const mockRows = [{ avg_dwell_minutes: 30.5 }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getAvgDwellTime('24', 'A', 'Main');

      // Assert: Verify database query was called with correct SQL and parameters
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH visits AS'),
        ['A', 'Main']
      );
      // Verify the service returns the correct result
      expect(result).toBe(30.5);
    });

    it('should return 0 when no data is available', async () => {
      // Arrange: Mock database response with null average
      const mockRows = [{ avg_dwell_minutes: null }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getAvgDwellTime('24', 'A', 'Main');

      // Assert: Verify service returns 0 for no data
      expect(result).toBe(0);
    });

    it('should handle database errors by propagating them', async () => {
      // Arrange: Mock database error
      db.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert: Verify service propagates database errors
      await expect(heatmapService.getAvgDwellTime('24', 'A', 'Main'))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('getActivityLevel', () => {
    it('should return activity level with High classification', async () => {
      // Arrange: Mock database response with high visitor count
      const mockRows = [{
        unique_visitors: '75', // Note: PostgreSQL returns string values
        entries: '100',
        exits: '80'
      }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getActivityLevel('24');

      // Assert: Verify database query was called with correct SQL
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(DISTINCT visitor_id) AS unique_visitors')
      );
      // Verify the service returns the correct result with proper data types
      expect(result).toEqual({
        unique_visitors: 75,    // Converted to number
        entries: 100,           // Converted to number
        exits: 80,              // Converted to number
        activity_level: 'High'  // Correct classification
      });
    });

    it('should return activity level with Medium classification', async () => {
      // Arrange: Mock database response with medium visitor count
      const mockRows = [{
        unique_visitors: '35',
        entries: '45',
        exits: '40'
      }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getActivityLevel('24');

      // Assert: Verify correct classification
      expect(result.activity_level).toBe('Medium');
    });

    it('should return activity level with Low classification', async () => {
      // Arrange: Mock database response with low visitor count
      const mockRows = [{
        unique_visitors: '15',
        entries: '20',
        exits: '18'
      }];
      db.query.mockResolvedValue({ rows: mockRows });

      // Act: Call the service method
      const result = await heatmapService.getActivityLevel('24');

      // Assert: Verify correct classification
      expect(result.activity_level).toBe('Low');
    });

    it('should handle database errors by propagating them', async () => {
      // Arrange: Mock database error
      db.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert: Verify service propagates database errors
      await expect(heatmapService.getActivityLevel('24'))
        .rejects
        .toThrow('Database error');
    });
  });
});