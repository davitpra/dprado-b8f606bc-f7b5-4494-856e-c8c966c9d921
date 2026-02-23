// Set environment variables before any modules are imported.
// This file is loaded via jest.config.ts → setupFilesAfterEnv.
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_TYPE'] = 'better-sqlite3';
process.env['DATABASE_URL'] = ':memory:';
process.env['JWT_SECRET'] = 'test-secret-key-minimum-16-chars';
process.env['JWT_EXPIRATION'] = '15m';
process.env['JWT_REFRESH_EXPIRATION'] = '7d';
process.env['PORT'] = '3001';
