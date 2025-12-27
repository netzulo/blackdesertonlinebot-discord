import './mocks/setup';
import { gearCommand } from '../src/commands/gear';
import { Message } from 'discord.js';
import {
  createMockMessage,
  createMockMessageWithMentions,
  createMockUser,
  mockDatabaseService,
  resetMockDatabase,
} from './mocks/discord.mock';
import {
  userFixtures,
  gearFixtures,
  garmothProfileFixtures,
  urlFixtures,
  commandArgsFixtures,
} from './fixtures/data.fixtures';
import { scrapeGarmothProfile } from '../src/scrapers/garmoth';

// Get mocked functions
const mockScrapeGarmoth = scrapeGarmothProfile as jest.MockedFunction<typeof scrapeGarmothProfile>;

describe('Gear Command', () => {
  beforeEach(() => {
    resetMockDatabase();
    jest.clearAllMocks();
  });

  describe('Command Metadata', () => {
    it('should have correct name and description', () => {
      expect(gearCommand.name).toBe('gear');
      expect(gearCommand.description).toBe('Manage and display user gear from Garmoth profiles');
      expect(gearCommand.usage).toContain('!gear');
    });

    it('should have an execute function', () => {
      expect(typeof gearCommand.execute).toBe('function');
    });
  });

  describe('Usage Instructions', () => {
    it('should show usage when no arguments provided', async () => {
      const mockMessage = createMockMessage() as Message;

      await gearCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Gear Command Usage'));
    });

    it('should show usage when unknown subcommand provided', async () => {
      const mockMessage = createMockMessage() as Message;

      await gearCommand.execute(mockMessage, ['unknown']);

      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Gear Command Usage'));
    });
  });

  describe('Show Gear Subcommand', () => {
    it('should show gear for mentioned user', async () => {
      const mentionedUser = createMockUser({ id: '123456789', username: 'mentioneduser' });
      const mockMessage = createMockMessageWithMentions([mentionedUser]) as Message;

      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);
      mockDatabaseService.getUserGearByUserId.mockReturnValue(gearFixtures.basicGear);

      await gearCommand.execute(mockMessage, []);

      expect(mockDatabaseService.getUserByDiscordId).toHaveBeenCalledWith('123456789');
      expect(mockDatabaseService.getUserGearByUserId).toHaveBeenCalledWith(1);
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Gear for'));
    });

    it('should show message when user has no gear data', async () => {
      const mentionedUser = createMockUser({ id: '123456789', username: 'nouser' });
      const mockMessage = createMockMessageWithMentions([mentionedUser]) as Message;

      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);

      await gearCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('No gear data found')
      );
    });

    it('should show message when user exists but has no gear items', async () => {
      const mentionedUser = createMockUser({ id: '123456789', username: 'emptyuser' });
      const mockMessage = createMockMessageWithMentions([mentionedUser]) as Message;

      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);
      mockDatabaseService.getUserGearByUserId.mockReturnValue([]);

      await gearCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('has no gear data stored')
      );
    });
  });

  describe('Add Subcommand', () => {
    it.each(commandArgsFixtures.gearCommand.addInvalid)(
      'should show error for invalid add arguments: %p',
      async (...args) => {
        const mockMessage = createMockMessage() as Message;

        await gearCommand.execute(mockMessage, args);

        expect(mockMessage.reply).toHaveBeenCalled();
        const replyCall = (mockMessage.reply as jest.Mock).mock.calls[0][0];
        expect(replyCall).toMatch(/provide|valid/i);
      }
    );

    it.each(urlFixtures.invalidUrls)(
      'should reject invalid URL: %s',
      async (invalidUrl: string) => {
        const mockMessage = createMockMessage() as Message;

        await gearCommand.execute(mockMessage, ['add', invalidUrl]);

        expect(mockMessage.reply).toHaveBeenCalledWith(
          expect.stringMatching(/provide|valid.*Garmoth/i)
        );
      }
    );

    it('should prevent adding duplicate user', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);

      await gearCommand.execute(mockMessage, ['add', 'https://garmoth.com/character/test']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('already have a gear profile')
      );
    });

    it('should successfully add new user with gear data', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);
      mockDatabaseService.createUser.mockReturnValue(userFixtures.validUser);
      mockScrapeGarmoth.mockResolvedValue(garmothProfileFixtures.validProfile);

      await gearCommand.execute(mockMessage, ['add', 'https://garmoth.com/character/test']);

      expect(mockScrapeGarmoth).toHaveBeenCalledWith('https://garmoth.com/character/test');
      expect(mockDatabaseService.createUser).toHaveBeenCalled();
      expect(mockDatabaseService.replaceUserGear).toHaveBeenCalled();
      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Successfully added')
      );
    });

    it('should handle scraping errors gracefully', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);
      mockScrapeGarmoth.mockRejectedValue(new Error('Scraping failed'));

      await gearCommand.execute(mockMessage, ['add', 'https://garmoth.com/character/test']);

      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to scrape')
      );
    });
  });

  describe('Update Subcommand', () => {
    it.each(commandArgsFixtures.gearCommand.updateInvalid)(
      'should show error for invalid update arguments: %p',
      async (...args) => {
        const mockMessage = createMockMessage() as Message;

        await gearCommand.execute(mockMessage, args);

        expect(mockMessage.reply).toHaveBeenCalled();
        const replyCall = (mockMessage.reply as jest.Mock).mock.calls[0][0];
        expect(replyCall).toMatch(/provide|valid/i);
      }
    );

    it('should show error when user does not exist', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);

      await gearCommand.execute(mockMessage, ['update', 'https://garmoth.com/character/test']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('do not have a gear profile')
      );
    });

    it('should successfully update existing user gear', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);
      mockScrapeGarmoth.mockResolvedValue(garmothProfileFixtures.validProfile);

      await gearCommand.execute(mockMessage, ['update', 'https://garmoth.com/character/updated']);

      expect(mockDatabaseService.updateUserUrl).toHaveBeenCalled();
      expect(mockScrapeGarmoth).toHaveBeenCalledWith('https://garmoth.com/character/updated');
      expect(mockDatabaseService.replaceUserGear).toHaveBeenCalled();
      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Successfully updated')
      );
    });

    it('should handle update scraping errors', async () => {
      const mockMessage = createMockMessage() as Message;
      const mockReply = { edit: jest.fn().mockResolvedValue(undefined) };
      (mockMessage.reply as jest.Mock).mockResolvedValue(mockReply);

      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);
      mockScrapeGarmoth.mockRejectedValue(new Error('Update failed'));

      await gearCommand.execute(mockMessage, ['update', 'https://garmoth.com/character/test']);

      expect(mockReply.edit).toHaveBeenCalledWith(
        expect.stringContaining('Failed to scrape')
      );
    });
  });

  describe('Delete Subcommand', () => {
    it('should show error when user does not exist', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(null);

      await gearCommand.execute(mockMessage, ['delete']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('do not have a gear profile to delete')
      );
    });

    it('should successfully delete user gear', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getUserByDiscordId.mockReturnValue(userFixtures.validUser);

      await gearCommand.execute(mockMessage, ['delete']);

      expect(mockDatabaseService.deleteUser).toHaveBeenCalledWith('123456789');
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('gear profile has been deleted')
      );
    });
  });
});
