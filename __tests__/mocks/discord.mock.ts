import { User, TextChannel, Collection } from 'discord.js';

export function createMockUser(overrides?: Record<string, any>): any {
  const baseUser = {
    id: '123456789',
    username: 'testuser',
    discriminator: '0001',
    bot: false,
    tag: 'testuser#0001',
    toString: () => '<@123456789>' as `<@${string}>`,
  };

  return {
    ...baseUser,
    ...overrides,
  };
}

export function createMockMessage(overrides?: any): any {
  const mockUser = createMockUser();

  return {
    author: mockUser as User,
    content: '!test',
    id: 'msg-123',
    channelId: 'channel-123',
    guildId: 'guild-123',
    mentions: {
      users: new Collection<string, User>(),
    } as any,
    channel: {
      id: 'channel-123',
      send: jest.fn().mockResolvedValue(undefined),
      type: 0,
    } as unknown as TextChannel,
    reply: jest.fn().mockResolvedValue({
      edit: jest.fn().mockResolvedValue(undefined),
    }),
    ...overrides,
  };
}

export function createMockMessageWithMentions(mentionedUsers: any[]): any {
  const mentions = new Collection<string, User>();
  mentionedUsers.forEach((user) => {
    const fullUser = { ...createMockUser(), ...user };
    mentions.set(user.id || 'user-id', fullUser as User);
  });

  return createMockMessage({
    mentions: {
      users: mentions,
    } as any,
  });
}

export class MockDatabaseService {
  getUserByDiscordId = jest.fn();
  createUser = jest.fn();
  updateUserUrl = jest.fn();
  deleteUser = jest.fn();
  getUserGearByUserId = jest.fn();
  replaceUserGear = jest.fn();
  createUserGear = jest.fn();
  getUserById = jest.fn();
  deleteUserGear = jest.fn();
  close = jest.fn();
}

export const mockDatabaseService = new MockDatabaseService();

export function resetMockDatabase(): void {
  mockDatabaseService.getUserByDiscordId.mockReset();
  mockDatabaseService.createUser.mockReset();
  mockDatabaseService.updateUserUrl.mockReset();
  mockDatabaseService.deleteUser.mockReset();
  mockDatabaseService.getUserGearByUserId.mockReset();
  mockDatabaseService.replaceUserGear.mockReset();
  mockDatabaseService.createUserGear.mockReset();
  mockDatabaseService.getUserById.mockReset();
  mockDatabaseService.deleteUserGear.mockReset();
  mockDatabaseService.close.mockReset();
}
