// tests/setup.js
// Global test setup
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Keep log and warn, but mock error to avoid noise
  error: jest.fn(),
};

// Global teardown
afterAll(() => {
  // Clean up any resources
});