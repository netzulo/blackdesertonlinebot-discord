import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../types';
import { scrapeBossTimer } from '../scrapers/garmoth-boss-timer';
import { logger } from '../utils/logger';

export const bossCommand: Command = {
  name: 'boss',
  description: 'Show Black Desert Online boss timer information',
  usage: '!boss [region] | !boss table [region]',
  execute: async (message: Message, args: string[]): Promise<void> => {
    const maybeSub = args[0]?.toLowerCase();
    const isTable = maybeSub === 'table';
    const region = isTable ? args[1] : args[0];
    if (isTable) {
      await handleBossTable(message, region);
    } else {
      await handleBossCurrent(message, region);
    }
  },
};

async function handleBossCurrent(message: Message, region?: string): Promise<void> {
  const statusMsg = await message.reply('⏳ Fetching current boss information...');

  try {
    logger.debug('Boss current requested', { region: region || 'EU' });
    const bossData = await scrapeBossTimer(region);
    logger.info('Boss data fetched', {
      hasPrev: !!bossData.previousBoss,
      hasNext: !!bossData.nextBoss,
      followedCount: bossData.followedBy.length,
      region: region || 'EU',
    });

    const embed = new EmbedBuilder()
      .setTitle('🎯 Black Desert Online Boss Timer')
      .setDescription('Use `!boss table` to see the full weekly schedule.')
      .setColor(0x0099ff);

    if (bossData.previousBoss) {
      embed.addFields({
        name: 'Previous Boss',
        value: `${bossData.previousBoss.name}${bossData.previousBoss.time ? ` — ${bossData.previousBoss.time}` : ''}`,
        inline: false,
      });
      if (bossData.previousBoss.imageUrl) {
        embed.setThumbnail(bossData.previousBoss.imageUrl);
      }
    }

    if (bossData.nextBoss) {
      embed.addFields({
        name: 'Next Boss',
        value: `${bossData.nextBoss.name}${bossData.nextBoss.time ? ` — ${bossData.nextBoss.time}` : ''}`,
        inline: false,
      });
      if (!embed.data.thumbnail && bossData.nextBoss.imageUrl) {
        embed.setThumbnail(bossData.nextBoss.imageUrl);
      }
    }

    if (bossData.followedBy.length > 0) {
      const fb = bossData.followedBy
        .slice(0, 5)
        .map((b) => `${b.name}${b.time ? ` — ${b.time}` : ''}`)
        .join('\n');
      embed.addFields({ name: 'Followed By', value: fb, inline: false });
    }

    // Keep a plain-text summary for backward compatibility with tests
    let display = '**🎯 Black Desert Online Boss Timer**\n\n';
    if (bossData.previousBoss) {
      display += `**Previous Boss:**\n`;
      display += `• ${bossData.previousBoss.name}`;
      if (bossData.previousBoss.time) {
        display += ` — ${bossData.previousBoss.time}`;
      }
      display += '\n\n';
    }
    if (bossData.nextBoss) {
      display += `**Next Boss:**\n`;
      display += `• ${bossData.nextBoss.name}`;
      if (bossData.nextBoss.time) {
        display += ` — ${bossData.nextBoss.time}`;
      }
      display += '\n\n';
    }
    if (bossData.followedBy.length > 0) {
      display += `**Followed By:**\n`;
      for (const boss of bossData.followedBy.slice(0, 5)) {
        display += `• ${boss.name}`;
        if (boss.time) {
          display += ` — ${boss.time}`;
        }
        display += '\n';
      }
      display += '\n';
    }
    display += 'Use `!boss table` to see the full weekly schedule.';

    await statusMsg.edit(display);

    // Send rich embed as a follow-up for improved UX
    if ('send' in message.channel) {
      await message.channel.send({ embeds: [embed] });
    }
  } catch (error) {
    logger.error('Error fetching boss data:', error as Error);
    await statusMsg.edit(
      '❌ Failed to fetch boss timer data. Please try again later or check https://garmoth.com/boss-timer directly.'
    );
  }
}

async function handleBossTable(message: Message, region?: string): Promise<void> {
  const statusMsg = await message.reply('⏳ Fetching boss schedule...');

  try {
    logger.debug('Boss table requested', { region: region || 'EU' });
    const bossData = await scrapeBossTimer(region);
    logger.info('Boss schedule fetched', {
      days: Object.keys(bossData.weeklySchedule).length,
      region: region || 'EU',
    });

    let display = '**📅 Weekly Boss Schedule**\n\n';

    const daysOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    if (Object.keys(bossData.weeklySchedule).length === 0) {
      display +=
        'No schedule data available. Please check https://garmoth.com/boss-timer for the latest information.';
    } else {
      for (const day of daysOrder) {
        if (bossData.weeklySchedule[day] && bossData.weeklySchedule[day].length > 0) {
          display += `**${day}:**\n`;
          for (const boss of bossData.weeklySchedule[day]) {
            display += `• ${boss.name}`;
            if (boss.time) {
              display += ` - ${boss.time}`;
            }
            display += '\n';
          }
          display += '\n';
        }
      }
    }

    // Discord has a 2000 character limit for messages
    if (display.length > 1900) {
      // Split into multiple messages
      const messages = splitMessage(display, 1900);
      await statusMsg.edit(messages[0]);
      for (let i = 1; i < messages.length; i++) {
        // Type guard to ensure channel supports send
        if ('send' in message.channel) {
          await message.channel.send(messages[i]);
        }
      }
    } else {
      await statusMsg.edit(display);
    }
  } catch (error) {
    logger.error('Error fetching boss schedule:', error as Error);
    await statusMsg.edit(
      '❌ Failed to fetch boss schedule data. Please try again later or check https://garmoth.com/boss-timer directly.'
    );
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  const messages: string[] = [];
  const lines = text.split('\n');
  let currentMessage = '';

  for (const line of lines) {
    if ((currentMessage + line + '\n').length > maxLength) {
      messages.push(currentMessage);
      currentMessage = line + '\n';
    } else {
      currentMessage += line + '\n';
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}
