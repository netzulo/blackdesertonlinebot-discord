import { mockDatabaseService } from './discord.mock';

// Mock the DatabaseService module
jest.mock('../../src/database/service', () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => mockDatabaseService),
  };
});

// Mock the scrapers
jest.mock('../../src/scrapers/garmoth-gear', () => ({
  scrapeGarmothProfile: jest.fn(),
}));

jest.mock('../../src/scrapers/garmoth-boss-timer', () => ({
  scrapeBossTimer: jest.fn(),
}));

// Export mock functions for easy access in tests
export { mockDatabaseService };
