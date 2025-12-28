import { User, UserGear } from '../../src/database/schema';
import { GarmothProfile } from '../../src/scrapers/garmoth-gear';
import { BossTimerData } from '../../src/scrapers/garmoth-boss-timer';

export const userFixtures: Record<string, User> = {
  validUser: {
    id: 1,
    discord_id: '123456789',
    discord_username: 'testuser',
    garmoth_url: 'https://garmoth.com/character/test123',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  anotherUser: {
    id: 2,
    discord_id: '987654321',
    discord_username: 'anotheruser',
    garmoth_url: 'https://garmoth.com/character/another456',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
};

export const gearFixtures: Record<string, UserGear[]> = {
  basicGear: [
    {
      id: 1,
      user_id: 1,
      gear_type: 'main_weapon',
      item_name: 'Blackstar Longsword',
      enhancement_level: 5,
      stats: JSON.stringify({ attack: 100 }),
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      user_id: 1,
      gear_type: 'armor',
      item_name: 'Blackstar Armor',
      enhancement_level: 3,
      stats: JSON.stringify({ defense: 50 }),
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
  ],
  emptyGear: [],
};

export const garmothProfileFixtures: Record<string, GarmothProfile> = {
  validProfile: {
    gear: [
      {
        gear_type: 'main_weapon',
        item_name: 'Blackstar Longsword',
        enhancement_level: 5,
        stats: { attack: 100, accuracy: 50 },
      },
      {
        gear_type: 'awakening_weapon',
        item_name: 'Dandelion Greatsword',
        enhancement_level: 4,
        stats: { attack: 95, accuracy: 45 },
      },
    ],
    stats: {
      attack: 250,
      defense: 350,
      hp: 5000,
    },
  },
  emptyProfile: {
    gear: [],
    stats: {},
  },
};

export const bossTimerFixtures: Record<string, BossTimerData> = {
  validBossData: {
    previousBoss: {
      name: 'Kzarka',
      time: '12:00',
    },
    nextBoss: {
      name: 'Nouver',
      time: '14:00',
    },
    followedBy: [
      { name: 'Kutum', time: '16:00' },
      { name: 'Karanda', time: '18:00' },
    ],
    weeklySchedule: {
      Monday: [
        { name: 'Kzarka', time: '00:00' },
        { name: 'Nouver', time: '02:00' },
      ],
      Tuesday: [
        { name: 'Kutum', time: '00:00' },
        { name: 'Karanda', time: '02:00' },
      ],
    },
  },
  emptyBossData: {
    previousBoss: null,
    nextBoss: null,
    followedBy: [],
    weeklySchedule: {},
  },
};

export const urlFixtures = {
  validGarmothUrls: [
    'https://garmoth.com/character/abc123',
    'https://garmoth.com/character/xyz789',
    'https://www.garmoth.com/character/test456',
  ],
  invalidUrls: [
    'https://example.com/character/test',
    'http://notgarmoth.com/character/test',
    'invalid-url',
    '',
  ],
};

export const commandArgsFixtures = {
  gearCommand: {
    add: [
      ['add', 'https://garmoth.com/character/test123'],
      ['add', 'https://garmoth.com/character/abc456'],
    ],
    addInvalid: [['add'], ['add', 'https://example.com/test'], ['add', 'not-a-url']],
    update: [
      ['update', 'https://garmoth.com/character/updated123'],
      ['update', 'https://garmoth.com/character/new456'],
    ],
    updateInvalid: [['update'], ['update', 'https://example.com/test'], ['update', 'invalid']],
    delete: [['delete']],
  },
  bossCommand: {
    current: [[], ['current']],
    table: [['table']],
  },
};
