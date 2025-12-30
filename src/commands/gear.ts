import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { DatabaseService } from '../database/service';
import { scrapeGarmothProfile } from '../scrapers/garmoth-gear';
import { logger } from '../utils/logger';
import { generateGearImage } from '../utils/gear-image';

let dbService: DatabaseService | null = null;

function getDbService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

function isValidGarmothUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?garmoth\.com\/character\//.test(url);
}

export const gearCommand: Command = {
  name: 'gear',
  description: 'Manage and display user gear from Garmoth profiles',
  usage: '!gear @user | !gear add [url] | !gear update [url] | !gear delete',
  execute: async (message: Message, args: string[]): Promise<void> => {
    const subcommand = args[0]?.toLowerCase();

    // Handle subcommands
    if (subcommand === 'add') {
      await handleGearAdd(message, args);
    } else if (subcommand === 'update') {
      await handleGearUpdate(message, args);
    } else if (subcommand === 'delete') {
      await handleGearDelete(message, args);
    } else if (message.mentions.users.size > 0) {
      // Show gear for mentioned user
      await handleGearShow(message);
    } else {
      await message.reply(
        '**Gear Command Usage:**\n' +
          '• `!gear @user` - Show gear for a Discord user\n' +
          '• `!gear add [garmoth_url]` - Add your gear profile\n' +
          '• `!gear update [garmoth_url]` - Update your gear profile URL\n' +
          '• `!gear delete` - Delete your gear profile'
      );
    }
  },
};

async function handleGearShow(message: Message): Promise<void> {
  const mentionedUser = message.mentions.users.first();

  if (!mentionedUser) {
    await message.reply('Please mention a user to show their gear.');
    return;
  }

  const user = getDbService().getUserByDiscordId(mentionedUser.id);

  if (!user || !user.id) {
    await message.reply(`No gear data found for ${mentionedUser.username}.`);
    return;
  }

  const gearList = getDbService().getUserGearByUserId(user.id);

  if (gearList.length === 0) {
    await message.reply(`${mentionedUser.username} has no gear data stored.`);
    return;
  }

  // No plain text summary: embed with composed image only
  try {
    const tiles = gearList
      .filter((g) => isDisplayableType(g.gear_type))
      .map((g) => {
        const s = g.stats ? safeParseStats(g.stats) : {};
        return {
          gear_type: g.gear_type,
          item_name: g.item_name,
          enhancement_label:
            typeof s.enhancement_label === 'string'
              ? s.enhancement_label
              : g.enhancement_level > 0
                ? `+${g.enhancement_level}`
                : 'base',
          rarity: typeof s.rarity === 'number' ? s.rarity : 0,
          image_url: typeof s.image_url === 'string' ? s.image_url : undefined,
        };
      });

    const summary = collectSummaryStats(gearList);
    const buffer = await generateGearImage(tiles, summary);
    const footerText = `AP ${summary.AP ?? 0} • AAP ${summary.AAP ?? 0} • DP ${summary.DP ?? 0} • SCORE ${summary.SCORE ?? 0}`;

    const embed = new EmbedBuilder()
      .setTitle(`🧰 ${mentionedUser.username}'s Gear`)
      .setDescription('Scraped from Garmoth — equipment overview')
      .setColor(0x5865f2)
      .setImage('attachment://gear.png')
      .setFooter({ text: footerText });

    if ('send' in message.channel) {
      await message.channel.send({
        embeds: [embed],
        files: [{ attachment: buffer, name: 'gear.png' }],
      });
    }
  } catch (err) {
    logger.warn('Failed to generate gear image, sending text only', err as Error);
    // Fallback: no embed image
  }
}

async function handleGearAdd(message: Message, args: string[]): Promise<void> {
  const url = args[1];

  if (!url) {
    await message.reply('Please provide a Garmoth profile URL. Usage: `!gear add [url]`');
    return;
  }

  if (!isValidGarmothUrl(url)) {
    await message.reply(
      'Please provide a valid Garmoth profile URL (e.g., https://garmoth.com/character/...)'
    );
    return;
  }

  // Check if user already exists
  const existingUser = getDbService().getUserByDiscordId(message.author.id);
  if (existingUser) {
    await message.reply('You already have a gear profile. Use `!gear update [url]` to update it.');
    return;
  }

  const statusMsg = await message.reply('⏳ Scraping your gear data from Garmoth...');

  try {
    // Scrape the profile
    const profile = await scrapeGarmothProfile(url);
    logger.info('Gear add: scraped profile', {
      items: profile.gear.length,
      user: message.author.id,
    });

    // Create user
    const user = getDbService().createUser(message.author.id, message.author.username, url);

    if (!user.id) {
      await statusMsg.edit('❌ Failed to create user profile.');
      return;
    }

    // Save gear data
    const gearData = profile.gear.map((item) => ({
      gear_type: item.gear_type,
      item_name: item.item_name,
      enhancement_level: item.enhancement_level,
      // Persist item stats merged with profile summary for later display
      stats: JSON.stringify({ ...(item.stats || {}), ...(profile.stats || {}) }),
    }));

    getDbService().replaceUserGear(user.id, gearData);

    await statusMsg.edit(
      `✅ Successfully added your gear profile!\n` +
        `Found ${profile.gear.length} items.\n` +
        `Use \`!gear @${message.author.username}\` to view your gear.`
    );
  } catch (error) {
    logger.error('Error scraping gear:', error as Error);
    await statusMsg.edit(
      '❌ Failed to scrape gear data from the provided URL. ' +
        'Please make sure the profile is public and the URL is correct.'
    );
  }
}

async function handleGearUpdate(message: Message, args: string[]): Promise<void> {
  const url = args[1];

  if (!url) {
    await message.reply('Please provide a Garmoth profile URL. Usage: `!gear update [url]`');
    return;
  }

  if (!isValidGarmothUrl(url)) {
    await message.reply(
      'Please provide a valid Garmoth profile URL (e.g., https://garmoth.com/character/...)'
    );
    return;
  }

  const user = getDbService().getUserByDiscordId(message.author.id);

  if (!user || !user.id) {
    await message.reply('You do not have a gear profile yet. Use `!gear add [url]` to create one.');
    return;
  }

  const statusMsg = await message.reply('⏳ Updating your gear data from Garmoth...');

  try {
    // Update URL if it changed
    getDbService().updateUserUrl(message.author.id, url);

    // Scrape the profile
    const profile = await scrapeGarmothProfile(url);
    logger.info('Gear update: scraped profile', {
      items: profile.gear.length,
      user: message.author.id,
    });

    // Update gear data
    const gearData = profile.gear.map((item) => ({
      gear_type: item.gear_type,
      item_name: item.item_name,
      enhancement_level: item.enhancement_level,
      stats: JSON.stringify({ ...(item.stats || {}), ...(profile.stats || {}) }),
    }));

    getDbService().replaceUserGear(user.id, gearData);

    await statusMsg.edit(
      `✅ Successfully updated your gear profile!\n` +
        `Found ${profile.gear.length} items.\n` +
        `Use \`!gear @${message.author.username}\` to view your gear.`
    );
  } catch (error) {
    logger.error('Error scraping gear:', error as Error);
    await statusMsg.edit(
      '❌ Failed to scrape gear data from the provided URL. ' +
        'Please make sure the profile is public and the URL is correct.'
    );
  }
}

async function handleGearDelete(message: Message, _args: string[]): Promise<void> {
  const user = getDbService().getUserByDiscordId(message.author.id);

  if (!user) {
    await message.reply('You do not have a gear profile to delete.');
    return;
  }

  // Delete user (cascade will delete gear)
  getDbService().deleteUser(message.author.id);

  await message.reply('✅ Your gear profile has been deleted.');
}

function isDisplayableType(type: string): boolean {
  const t = type.toLowerCase();
  if (t.startsWith('outfit')) return false;
  if (t === 'tool') return false;
  return true;
}

function safeParseStats(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

type SummaryKey = 'AP' | 'AAP' | 'DP' | 'SCORE';

function collectSummaryStats(
  _gear: ReturnType<DatabaseService['getUserGearByUserId']>
): Partial<Record<SummaryKey, number>> {
  const keys: SummaryKey[] = ['AP', 'AAP', 'DP', 'SCORE'];
  const out: Partial<Record<SummaryKey, number>> = {};
  for (const item of _gear) {
    if (!isDisplayableType(item.gear_type)) continue;
    const s = item.stats ? safeParseStats(item.stats) : {};
    const stats = s as Partial<Record<SummaryKey, number | string>>;
    for (const k of keys) {
      const v = stats[k];
      if (typeof v === 'number') {
        out[k] = v;
      } else if (typeof v === 'string') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n)) out[k] = n;
      }
    }
  }
  return out;
}
