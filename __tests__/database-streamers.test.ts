import { DatabaseService } from '../src/database/service';
import path from 'path';
import fs from 'fs';

describe('Database Service - Streamer Operations', () => {
  let dbService: DatabaseService;
  const testDbPath = path.join(__dirname, 'test-streamers.db');

  beforeEach(() => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbService = new DatabaseService(testDbPath);
  });

  afterEach(() => {
    dbService.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create a streamer user', () => {
    const streamer = dbService.createStreamer(
      'teststreamer',
      'https://garmoth.com/character/test123'
    );

    expect(streamer).toBeDefined();
    expect(streamer.id).toBeDefined();
    expect(streamer.discord_id).toBe('streamer_teststreamer');
    expect(streamer.twitch_username).toBe('teststreamer');
    expect(streamer.is_streamer).toBe(1);
    expect(streamer.garmoth_url).toBe('https://garmoth.com/character/test123');
  });

  it('should create a streamer with custom display name', () => {
    const streamer = dbService.createStreamer(
      'teststreamer',
      'https://garmoth.com/character/test123',
      'Custom Display Name'
    );

    expect(streamer.discord_username).toBe('Custom Display Name');
    expect(streamer.twitch_username).toBe('teststreamer');
  });

  it('should get all streamers', () => {
    // Create a streamer and a regular user
    dbService.createStreamer('teststreamer', 'https://garmoth.com/character/test123');
    dbService.createUser('discord123', 'DiscordUser', 'https://garmoth.com/character/test456');

    const streamers = dbService.getAllStreamers();

    expect(streamers).toHaveLength(1);
    expect(streamers[0].is_streamer).toBe(1);
    expect(streamers[0].twitch_username).toBe('teststreamer');
  });

  it('should seed multiple streamers', () => {
    const streamersToSeed = [
      {
        twitch_username: 'streamer1',
        garmoth_url: 'https://garmoth.com/character/s1',
      },
      {
        twitch_username: 'streamer2',
        display_name: 'Streamer Two',
        garmoth_url: 'https://garmoth.com/character/s2',
      },
    ];

    const seededCount = dbService.seedStreamers(streamersToSeed);

    expect(seededCount).toBe(2);

    const allStreamers = dbService.getAllStreamers();
    expect(allStreamers).toHaveLength(2);
  });

  it('should not seed duplicate streamers', () => {
    const streamersToSeed = [
      {
        twitch_username: 'streamer1',
        garmoth_url: 'https://garmoth.com/character/s1',
      },
    ];

    // Seed once
    const firstSeed = dbService.seedStreamers(streamersToSeed);
    expect(firstSeed).toBe(1);

    // Try to seed again
    const secondSeed = dbService.seedStreamers(streamersToSeed);
    expect(secondSeed).toBe(0);

    // Verify only one streamer exists
    const allStreamers = dbService.getAllStreamers();
    expect(allStreamers).toHaveLength(1);
  });

  it('should get all users including streamers', () => {
    dbService.createStreamer('teststreamer', 'https://garmoth.com/character/test123');
    dbService.createUser('discord123', 'DiscordUser', 'https://garmoth.com/character/test456');

    const allUsers = dbService.getAllUsers();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.some((u) => u.is_streamer === 1)).toBe(true);
    expect(allUsers.some((u) => u.is_streamer === 0 || !u.is_streamer)).toBe(true);
  });
});
