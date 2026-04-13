/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coverageReporters: ['text', 'lcov'],
  passWithNoTests: true,
}
