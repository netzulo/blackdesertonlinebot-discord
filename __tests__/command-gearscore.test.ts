import './mocks/setup';
import { gearscoreCommand } from '../src/commands/gearscore';
import { Message } from 'discord.js';
import {
  createMockMessage,
  createMockMessageWithMentions,
  createMockUser,
  mockDatabaseService,
  resetMockDatabase,
} from './mocks/discord.mock';
import { userFixtures } from './fixtures/data.fixtures';

describe('Gearscore Command', () => {
  beforeEach(() => {
    resetMockDatabase();
    jest.clearAllMocks();
  });

  describe('Command Metadata', () => {
    it('should have correct name and description', () => {
      expect(gearscoreCommand.name).toBe('gearscore');
      expect(gearscoreCommand.description).toBe('Display AP/AAP/DP stats from user gear profile');
      expect(gearscoreCommand.usage).toContain('!gearscore');
    });

    it('should have an execute function', () => {
      expect(typeof gearscoreCommand.execute).toBe('function');
    });
  });

  describe('Show Own Gearscore', () => {
    it('should show gearscore for command author when no user mentioned', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockDatabaseService.getUserByDiscordId).toHaveBeenCalledWith('123456789');
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Gear Score for'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Attack Power'));
    });

    it('should show error when author has no gear data', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('No gear score data'));
    });

    it('should show error when author has no profile_stats', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue({
        ...userFixtures.validUser,
        profile_stats: undefined,
      });

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('No gear score data'));
    });
  });

  describe('Show Mentioned User Gearscore', () => {
    it('should show gearscore for mentioned user', async () => {
      const mentionedUser = createMockUser({ id: '987654321', username: 'anotheruser' });
      const mockMessage = createMockMessageWithMentions([mentionedUser]) as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.anotherUser);

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockDatabaseService.getUserByDiscordId).toHaveBeenCalledWith('987654321');
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('anotheruser'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('AP'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('DP'));
    });

    it('should show error when mentioned user has no gear data', async () => {
      const mentionedUser = createMockUser({ id: '999999999', username: 'nouser' });
      const mockMessage = createMockMessageWithMentions([mentionedUser]) as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('No gear score data found')
      );
    });
  });

  describe('Stats Display', () => {
    it('should display AP/AAP/DP stats correctly', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.anotherUser);

      await gearscoreCommand.execute(mockMessage, []);

      const replyCall = (mockMessage.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('280'); // AP value
      expect(replyCall).toContain('290'); // AAP value
      expect(replyCall).toContain('380'); // DP value
    });

    it('should handle stats with different key names', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);

      await gearscoreCommand.execute(mockMessage, []);

      const replyCall = (mockMessage.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('250'); // attack value
      expect(replyCall).toContain('350'); // defense value
    });

    it('should handle invalid JSON in profile_stats', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue({
        ...userFixtures.validUser,
        profile_stats: 'invalid json',
      });

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing gear score data')
      );
    });

    it('should show profile URL in response', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);

      await gearscoreCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('https://garmoth.com/character/test123')
      );
    });
  });
});
