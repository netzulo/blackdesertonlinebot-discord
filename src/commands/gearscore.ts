import { Message } from 'discord.js';
import { Command } from '../types';
import { DatabaseService } from '../database/service';

let dbService: DatabaseService | null = null;

function getDbService(): DatabaseService {
  if (!dbService) {
    dbService = new DatabaseService();
  }
  return dbService;
}

// Stat key variations for extracting BDO stats
const STAT_KEYS = {
  ap: ['ap', 'AP', 'attack', 'Attack'],
  aap: ['aap', 'AAP', 'awakening_ap', 'Awakening AP'],
  dp: ['dp', 'DP', 'defense', 'Defense'],
};

/**
 * Extract a stat value from stats object using multiple possible key names
 */
function extractStat(
  stats: Record<string, string | number>,
  possibleKeys: string[]
): string | number {
  for (const key of possibleKeys) {
    if (key in stats) {
      return stats[key];
    }
  }
  return 'N/A';
}

export const gearscoreCommand: Command = {
  name: 'gearscore',
  description: 'Display AP/AAP/DP stats from user gear profile',
  usage: '!gearscore | !gearscore @user',
  execute: async (message: Message, _args: string[]): Promise<void> => {
    // Determine which user to show stats for
    let targetUser;
    let targetUsername;

    if (message.mentions.users.size > 0) {
      // Show stats for mentioned user
      const mentionedUser = message.mentions.users.first();
      if (!mentionedUser) {
        await message.reply('Could not find the mentioned user.');
        return;
      }
      targetUser = getDbService().getUserByDiscordId(mentionedUser.id);
      targetUsername = mentionedUser.username;
    } else {
      // Show stats for command author
      targetUser = getDbService().getUserByDiscordId(message.author.id);
      targetUsername = message.author.username;
    }

    if (!targetUser || !targetUser.profile_stats) {
      await message.reply(
        `No gear score data found for ${targetUsername}.\n` +
          `Use \`!gear add [garmoth_url]\` to add your gear profile first.`
      );
      return;
    }

    // Parse the stats
    let stats: Record<string, string | number>;
    try {
      stats = JSON.parse(targetUser.profile_stats);
    } catch (error) {
      await message.reply('Error parsing gear score data. Please update your profile.');
      return;
    }

    // Format and display the stats
    let response = `**⚔️ Gear Score for ${targetUsername}**\n\n`;

    // Extract common BDO stats using the helper function
    const ap = extractStat(stats, STAT_KEYS.ap);
    const aap = extractStat(stats, STAT_KEYS.aap);
    const dp = extractStat(stats, STAT_KEYS.dp);

    response += `🗡️ **AP (Attack Power):** ${ap}\n`;
    response += `⚡ **AAP (Awakening AP):** ${aap}\n`;
    response += `🛡️ **DP (Defense Power):** ${dp}\n`;

    // Add any other available stats
    const displayedKeys = [...STAT_KEYS.ap, ...STAT_KEYS.aap, ...STAT_KEYS.dp];
    const otherStats = Object.entries(stats).filter(([key]) => !displayedKeys.includes(key));

    if (otherStats.length > 0) {
      response += '\n**📊 Other Stats:**\n';
      for (const [key, value] of otherStats) {
        response += `• ${key}: ${value}\n`;
      }
    }

    response += `\n📋 Profile: ${targetUser.garmoth_url}`;

    await message.reply(response);
  },
};
