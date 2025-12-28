import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { config } from 'dotenv';
import { Command } from './types';
import { pingCommand } from './commands/ping';
import { bdobaseCommand } from './commands/bdobase';
import { gearCommand } from './commands/gear';
import { bossCommand } from './commands/boss';
import { logger } from './utils/logger';
import { DatabaseService } from './database/service';
import { getStreamersWithGear } from './streamers-data';

config();

export class DiscordBot {
  private client: Client;
  private commands: Collection<string, Command>;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.commands = new Collection();
    this.setupCommands();
    this.setupEventHandlers();
  }

  private setupCommands(): void {
    const commandList: Command[] = [pingCommand, bdobaseCommand, gearCommand, bossCommand];

    for (const command of commandList) {
      this.commands.set(command.name, command);
    }
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, (readyClient) => {
      const envName = process.env.ENV_NAME || 'env';
      logger.info(`✅ Bot is ready! Logged in as ${readyClient.user.tag}`);
      logger.info(`🌍 Environment: ${envName}`);
      
      // Seed streamers on startup
      this.seedStreamersData();
    });

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      const prefix = process.env.BOT_PREFIX || '!';
      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift()?.toLowerCase();

      if (!commandName) return;

      const command = this.commands.get(commandName);
      if (!command) return;

      try {
        await command.execute(message, args);
      } catch (error) {
        logger.error(`Error executing command ${commandName}:`, error as Error);
        const errorType = error instanceof Error ? error.name : 'Unknown';
        try {
          await message.reply(
            `There was an error executing that command. (Error: ${errorType}). ` +
              'If this keeps happening, please check my permissions.'
          );
        } catch (replyError) {
          logger.error(
            `Failed to send error reply for command ${commandName}:`,
            replyError as Error
          );
        }
      }
    });

    this.client.on(Events.Error, (error) => {
      logger.error('Discord client error:', error);
    });
  }

  public async start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
      throw new Error('DISCORD_TOKEN is not defined in environment variables');
    }

    await this.client.login(token);
  }

  public async stop(): Promise<void> {
    this.client.destroy();
  }

  public getClient(): Client {
    return this.client;
  }

  private seedStreamersData(): void {
    try {
      const streamersWithGear = getStreamersWithGear();
      if (streamersWithGear.length > 0) {
        // Create a temporary database service instance for seeding
        // This is safe because we close it immediately after seeding
        const dbService = new DatabaseService();
        const seededCount = dbService.seedStreamers(streamersWithGear);
        dbService.close();
        logger.info(`💎 Seeded ${seededCount} streamer(s) with gear data`);
      } else {
        logger.info('📝 No streamers with gear URLs to seed');
      }
    } catch (error) {
      logger.error('Failed to seed streamers:', error as Error);
    }
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new DiscordBot();

  bot.start().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });
}
