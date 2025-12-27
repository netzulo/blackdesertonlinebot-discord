import Database from 'better-sqlite3';
import { User, UserGear, UserSchema, UserGearSchema, initializeDatabase } from './schema';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'bot.db');
    const finalPath = dbPath || defaultPath;

    // Ensure data directory exists
    const dbDir = path.dirname(finalPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(finalPath);
    this.db.pragma('foreign_keys = ON');
    initializeDatabase(this.db);
    logger.info('Database initialized', { path: finalPath });
  }

  // User operations
  createUser(discord_id: string, discord_username: string, garmoth_url: string): User {
    // Validate input with Zod
    const userData = UserSchema.parse({
      discord_id,
      discord_username,
      garmoth_url,
    });

    const stmt = this.db.prepare(`
      INSERT INTO users (discord_id, discord_username, garmoth_url)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(userData.discord_id, userData.discord_username, userData.garmoth_url);
    const user = this.getUserById(result.lastInsertRowid as number);
    if (!user) {
      throw new Error('Failed to create user');
    }
    logger.info('User created', { id: user.id, discord_id: user.discord_id });
    return user;
  }

  getUserById(id: number): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  getUserByDiscordId(discord_id: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE discord_id = ?');
    return stmt.get(discord_id) as User | undefined;
  }

  updateUserUrl(discord_id: string, garmoth_url: string): void {
    // Validate URL with Zod
    UserSchema.pick({ garmoth_url: true }).parse({ garmoth_url });

    const stmt = this.db.prepare(`
      UPDATE users 
      SET garmoth_url = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE discord_id = ?
    `);
    stmt.run(garmoth_url, discord_id);
    logger.info('User URL updated', { discord_id });
  }

  deleteUser(discord_id: string): void {
    const stmt = this.db.prepare('DELETE FROM users WHERE discord_id = ?');
    stmt.run(discord_id);
    logger.info('User deleted', { discord_id });
  }

  // User gear operations
  createUserGear(gear: Omit<UserGear, 'id' | 'created_at' | 'updated_at'>): UserGear {
    // Validate input with Zod
    const gearData = UserGearSchema.omit({ id: true, created_at: true, updated_at: true }).parse(
      gear
    );

    const stmt = this.db.prepare(`
      INSERT INTO users_gear (user_id, gear_type, item_name, enhancement_level, stats)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      gearData.user_id,
      gearData.gear_type,
      gearData.item_name,
      gearData.enhancement_level,
      gearData.stats || null
    );
    const userGear = this.getUserGearById(result.lastInsertRowid as number);
    if (!userGear) {
      throw new Error('Failed to create user gear');
    }
    logger.info('User gear created', { id: userGear.id, user_id: userGear.user_id });
    return userGear;
  }

  getUserGearById(id: number): UserGear | undefined {
    const stmt = this.db.prepare('SELECT * FROM users_gear WHERE id = ?');
    return stmt.get(id) as UserGear | undefined;
  }

  getUserGearByUserId(user_id: number): UserGear[] {
    const stmt = this.db.prepare('SELECT * FROM users_gear WHERE user_id = ? ORDER BY gear_type');
    return stmt.all(user_id) as UserGear[];
  }

  deleteUserGear(user_id: number): void {
    const stmt = this.db.prepare('DELETE FROM users_gear WHERE user_id = ?');
    stmt.run(user_id);
  }

  // Bulk operations for updating gear
  replaceUserGear(
    user_id: number,
    gearList: Omit<UserGear, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  ): void {
    // Validate each gear item with Zod
    const validatedGearList = gearList.map((gear) =>
      UserGearSchema.omit({ id: true, user_id: true, created_at: true, updated_at: true }).parse(
        gear
      )
    );

    // Use transaction for atomic operation
    const deleteStmt = this.db.prepare('DELETE FROM users_gear WHERE user_id = ?');
    const insertStmt = this.db.prepare(`
      INSERT INTO users_gear (user_id, gear_type, item_name, enhancement_level, stats)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      deleteStmt.run(user_id);
      for (const gear of validatedGearList) {
        insertStmt.run(
          user_id,
          gear.gear_type,
          gear.item_name,
          gear.enhancement_level,
          gear.stats || null
        );
      }
    });

    transaction();
    logger.info('User gear replaced', { user_id, count: validatedGearList.length });
  }

  close(): void {
    this.db.close();
    logger.info('Database closed');
  }
}
