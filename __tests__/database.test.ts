import { DatabaseService } from '../src/database/service';
import { UserSchema, UserGearSchema } from '../src/database/schema';
import path from 'path';
import fs from 'fs';

describe('Database Service', () => {
  let dbService: DatabaseService;
  const testDbPath = path.join(__dirname, 'test.db');

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

  describe('Initialization', () => {
    it('should create database with custom path', () => {
      const customPath = path.join(__dirname, 'custom-test.db');
      const customDb = new DatabaseService(customPath);
      expect(fs.existsSync(customPath)).toBe(true);
      customDb.close();
      fs.unlinkSync(customPath);
    });

    it('should create database with default path when no path provided', () => {
      const defaultDb = new DatabaseService();
      expect(defaultDb).toBeDefined();
      defaultDb.close();
      // Clean up default db
      const defaultPath = path.join(process.cwd(), 'data', 'bot.db');
      if (fs.existsSync(defaultPath)) {
        fs.unlinkSync(defaultPath);
      }
      const dataDir = path.join(process.cwd(), 'data');
      if (fs.existsSync(dataDir)) {
        fs.rmdirSync(dataDir);
      }
    });
  });

  describe('User Operations', () => {
    it('should create a user', () => {
      const user = dbService.createUser(
        '123456789',
        'testuser',
        'https://garmoth.com/character/test'
      );

      expect(user).toBeDefined();
      expect(user.discord_id).toBe('123456789');
      expect(user.discord_username).toBe('testuser');
      expect(user.garmoth_url).toBe('https://garmoth.com/character/test');
    });

    it('should validate user data with Zod', () => {
      expect(() => {
        dbService.createUser('', 'testuser', 'https://garmoth.com/character/test');
      }).toThrow();

      expect(() => {
        dbService.createUser('123', 'testuser', 'invalid-url');
      }).toThrow();

      expect(() => {
        dbService.createUser('123', 'testuser', 'https://example.com/test');
      }).toThrow(); // Should require garmoth.com
    });

    it('should get user by Discord ID', () => {
      dbService.createUser('123456789', 'testuser', 'https://garmoth.com/character/test');
      const user = dbService.getUserByDiscordId('123456789');

      expect(user).toBeDefined();
      expect(user?.discord_username).toBe('testuser');
    });

    it('should update user URL', () => {
      dbService.createUser('123456789', 'testuser', 'https://garmoth.com/character/test');
      dbService.updateUserUrl('123456789', 'https://garmoth.com/character/updated');

      const user = dbService.getUserByDiscordId('123456789');
      expect(user?.garmoth_url).toBe('https://garmoth.com/character/updated');
    });

    it('should delete user', () => {
      dbService.createUser('123456789', 'testuser', 'https://garmoth.com/character/test');
      dbService.deleteUser('123456789');

      const user = dbService.getUserByDiscordId('123456789');
      expect(user).toBeUndefined();
    });
  });

  describe('User Gear Operations', () => {
    let userId: number;

    beforeEach(() => {
      const user = dbService.createUser(
        '123456789',
        'testuser',
        'https://garmoth.com/character/test'
      );
      userId = user.id || 0;
    });

    it('should create user gear', () => {
      const gear = dbService.createUserGear({
        user_id: userId,
        gear_type: 'main_weapon',
        item_name: 'Blackstar Longsword',
        enhancement_level: 5,
      });

      expect(gear).toBeDefined();
      expect(gear.item_name).toBe('Blackstar Longsword');
      expect(gear.enhancement_level).toBe(5);
    });

    it('should validate gear data with Zod', () => {
      expect(() => {
        dbService.createUserGear({
          user_id: userId,
          gear_type: '',
          item_name: 'Test',
          enhancement_level: 5,
        });
      }).toThrow();

      expect(() => {
        dbService.createUserGear({
          user_id: userId,
          gear_type: 'weapon',
          item_name: 'Test',
          enhancement_level: -1,
        });
      }).toThrow();

      expect(() => {
        dbService.createUserGear({
          user_id: userId,
          gear_type: 'weapon',
          item_name: 'Test',
          enhancement_level: 25, // Max is 20
        });
      }).toThrow();
    });

    it('should get user gear by user ID', () => {
      dbService.createUserGear({
        user_id: userId,
        gear_type: 'main_weapon',
        item_name: 'Blackstar Longsword',
        enhancement_level: 5,
      });

      dbService.createUserGear({
        user_id: userId,
        gear_type: 'armor',
        item_name: 'Blackstar Armor',
        enhancement_level: 3,
      });

      const gearList = dbService.getUserGearByUserId(userId);
      expect(gearList).toHaveLength(2);
    });

    it('should replace user gear', () => {
      dbService.createUserGear({
        user_id: userId,
        gear_type: 'main_weapon',
        item_name: 'Old Weapon',
        enhancement_level: 1,
      });

      const newGearList = [
        {
          gear_type: 'main_weapon',
          item_name: 'New Weapon',
          enhancement_level: 5,
        },
        {
          gear_type: 'armor',
          item_name: 'New Armor',
          enhancement_level: 3,
        },
      ];

      dbService.replaceUserGear(userId, newGearList);

      const gearList = dbService.getUserGearByUserId(userId);
      expect(gearList).toHaveLength(2);
      expect(gearList.find((g) => g.item_name === 'Old Weapon')).toBeUndefined();
      expect(gearList.find((g) => g.item_name === 'New Weapon')).toBeDefined();
    });

    it('should delete user gear when user is deleted (cascade)', () => {
      dbService.createUserGear({
        user_id: userId,
        gear_type: 'main_weapon',
        item_name: 'Blackstar Longsword',
        enhancement_level: 5,
      });

      dbService.deleteUser('123456789');

      const gearList = dbService.getUserGearByUserId(userId);
      expect(gearList).toHaveLength(0);
    });

    it('should deleteUserGear directly', () => {
      dbService.createUserGear({
        user_id: userId,
        gear_type: 'main_weapon',
        item_name: 'Test Weapon',
        enhancement_level: 1,
      });

      dbService.deleteUserGear(userId);

      const gearList = dbService.getUserGearByUserId(userId);
      expect(gearList).toHaveLength(0);
    });
  });

  describe('Zod Schemas', () => {
    it('should validate User schema', () => {
      const validUser = {
        discord_id: '123456789',
        discord_username: 'testuser',
        garmoth_url: 'https://garmoth.com/character/test',
      };

      expect(() => UserSchema.parse(validUser)).not.toThrow();
    });

    it('should validate UserGear schema', () => {
      const validGear = {
        user_id: 1,
        gear_type: 'main_weapon',
        item_name: 'Blackstar Longsword',
        enhancement_level: 5,
      };

      expect(() => UserGearSchema.parse(validGear)).not.toThrow();
    });
  });
});
