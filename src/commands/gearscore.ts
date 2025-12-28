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

    // Extract common BDO stats
    const ap = stats.ap || stats.AP || stats.attack || stats.Attack || 'N/A';
    const aap = stats.aap || stats.AAP || stats.awakening_ap || stats['Awakening AP'] || 'N/A';
    const dp = stats.dp || stats.DP || stats.defense || stats.Defense || 'N/A';

    response += `🗡️ **AP (Attack Power):** ${ap}\n`;
    response += `⚡ **AAP (Awakening AP):** ${aap}\n`;
    response += `🛡️ **DP (Defense Power):** ${dp}\n`;

    // Add any other available stats
    const displayedKeys = ['ap', 'AP', 'attack', 'Attack', 'aap', 'AAP', 'awakening_ap', 'Awakening AP', 'dp', 'DP', 'defense', 'Defense'];
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
