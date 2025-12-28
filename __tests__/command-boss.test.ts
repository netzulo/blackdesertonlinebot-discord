import './mocks/setup';
import { bossCommand } from '../src/commands/boss';
import { Message } from 'discord.js';
import { createMockMessage } from './mocks/discord.mock';
import { bossTimerFixtures, commandArgsFixtures } from './fixtures/data.fixtures';
import { scrapeBossTimer } from '../src/scrapers/garmoth-boss-timer';

// Get mocked functions
const mockScrapeBossTimer = scrapeBossTimer as jest.MockedFunction<typeof scrapeBossTimer>;

describe('Boss Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Metadata', () => {
    it('should have correct name and description', () => {
      expect(bossCommand.name).toBe('boss');
      expect(bossCommand.description).toBe('Show Black Desert Online boss timer information');
      expect(bossCommand.usage).toContain('!boss');
    });

    it('should have an execute function', () => {
      expect(typeof bossCommand.execute).toBe('function');
    });
  });

  describe('Current Boss Info', () => {
    it.each(commandArgsFixtures.bossCommand.current)(
      'should show current boss info with args: %p',
      async (...args: string[]) => {
        const mockMessage = createMockMessage() as Message;
        const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
        (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

        mockScrapeBossTimer.mockResolvedValue(bossTimerFixtures.validBossData);

        await bossCommand.execute(mockMessage, args);

        expect(mockScrapeBossTimer).toHaveBeenCalled();
        expect(mockReply.edit).toHaveBeenCalledWith(expect.stringContaining('Boss Timer'));
      }
    );

    it('should handle empty boss data', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockScrapeBossTimer.mockResolvedValue(bossTimerFixtures.emptyBossData);

      await bossCommand.execute(mockMessage, []);

      expect(mockReply.edit).toHaveBeenCalled();
    });

    it('should handle scraping errors gracefully', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockScrapeBossTimer.mockRejectedValue(new Error('Scraping failed'));

      await bossCommand.execute(mockMessage, []);

      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch boss timer data')
      );
    });
  });

  describe('Boss Table Subcommand', () => {
    it('should show weekly boss schedule', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockScrapeBossTimer.mockResolvedValue(bossTimerFixtures.validBossData);

      await bossCommand.execute(mockMessage, ['table']);

      expect(mockScrapeBossTimer).toHaveBeenCalled();
      expect(mockReply.edit).toHaveBeenCalledWith(expect.stringContaining('Weekly Boss Schedule'));
    });

    it('should handle empty schedule', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockScrapeBossTimer.mockResolvedValue(bossTimerFixtures.emptyBossData);

      await bossCommand.execute(mockMessage, ['table']);

      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('No schedule data available')
      );
    });

    it('should handle table scraping errors', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockScrapeBossTimer.mockRejectedValue(new Error('Table scraping failed'));

      await bossCommand.execute(mockMessage, ['table']);

      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch boss schedule data')
      );
    });
  });
});
