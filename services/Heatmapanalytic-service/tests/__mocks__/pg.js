const pool = {
  query: jest.fn(),
};

const Pool = jest.fn(() => pool);

module.exports = { Pool, pool };