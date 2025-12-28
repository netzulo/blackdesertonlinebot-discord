import './mocks/setup';
import { gearCommand } from '../src/commands/gear';
import { Message } from 'discord.js';
import {
  createMockMessage,
  mockDatabaseService,
  resetMockDatabase,
} from './mocks/discord.mock';

describe('Gear Command - List Subcommand', () => {
  beforeEach(() => {
    resetMockDatabase();
    jest.clearAllMocks();
  });

  describe('List Functionality', () => {
    it('should show message when no users exist', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getAllUsers.mockReturnValue([]);

      await gearCommand.execute(mockMessage, ['list']);

      expect(mockMessage.reply).toHaveBeenCalledWith('No users with gear profiles found.');
    });

    it('should list Discord users only', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getAllUsers.mockReturnValue([
        {
          id: 1,
          discord_id: '123456789',
          discord_username: 'TestUser1',
          garmoth_url: 'https://garmoth.com/character/test1',
          is_streamer: 0,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          discord_id: '987654321',
          discord_username: 'TestUser2',
          garmoth_url: 'https://garmoth.com/character/test2',
          is_streamer: 0,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]);

      await gearCommand.execute(mockMessage, ['list']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Users with Gear Profiles')
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Discord Users'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('TestUser1'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('TestUser2'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Total: 2 user(s)'));
    });

    it('should list streamers only', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getAllUsers.mockReturnValue([
        {
          id: 1,
          discord_id: 'streamer_twitchuser1',
          discord_username: 'Twitch User 1',
          garmoth_url: 'https://garmoth.com/character/streamer1',
          is_streamer: 1,
          twitch_username: 'twitchuser1',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]);

      await gearCommand.execute(mockMessage, ['list']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Users with Gear Profiles')
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Streamers'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('twitchuser1'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Total: 1 user(s)'));
    });

    it('should list both streamers and Discord users', async () => {
      const mockMessage = createMockMessage() as Message;
      mockDatabaseService.getAllUsers.mockReturnValue([
        {
          id: 1,
          discord_id: 'streamer_twitchuser1',
          discord_username: 'Twitch User 1',
          garmoth_url: 'https://garmoth.com/character/streamer1',
          is_streamer: 1,
          twitch_username: 'twitchuser1',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          discord_id: '123456789',
          discord_username: 'RegularUser',
          garmoth_url: 'https://garmoth.com/character/regular',
          is_streamer: 0,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ]);

      await gearCommand.execute(mockMessage, ['list']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('Users with Gear Profiles')
      );
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Streamers'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('twitchuser1'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Discord Users'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('RegularUser'));
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.stringContaining('Total: 2 user(s)'));
    });
  });
});
