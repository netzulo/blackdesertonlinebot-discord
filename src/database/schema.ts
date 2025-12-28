import Database from 'better-sqlite3';
import { z } from 'zod';

// Zod schemas for validation
export const UserSchema = z.object({
  id: z.number().int().positive().optional(),
  discord_id: z.string().min(1, 'Discord ID is required'),
  discord_username: z.string().min(1, 'Discord username is required'),
  garmoth_url: z.string().url('Must be a valid URL').includes('garmoth.com', {
    message: 'Must be a Garmoth URL',
  }),
  profile_stats: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const UserGearSchema = z.object({
  id: z.number().int().positive().optional(),
  user_id: z.number().int().positive(),
  gear_type: z.string().min(1, 'Gear type is required'),
  item_name: z.string().min(1, 'Item name is required'),
  enhancement_level: z.number().int().min(0).max(20),
  stats: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// TypeScript types inferred from Zod schemas
export type User = z.infer<typeof UserSchema>;
export type UserGear = z.infer<typeof UserGearSchema>;

export function initializeDatabase(db: Database.Database): void {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      discord_username TEXT NOT NULL,
      garmoth_url TEXT NOT NULL,
      profile_stats TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create users_gear table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_gear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      gear_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      enhancement_level INTEGER NOT NULL DEFAULT 0,
      stats TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
    CREATE INDEX IF NOT EXISTS idx_users_gear_user_id ON users_gear(user_id);
  `);
}
