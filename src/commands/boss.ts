import { Message } from 'discord.js';
import { Command } from '../types';
import { scrapeBossTimer } from '../scrapers/boss-timer';

export const bossCommand: Command = {
  name: 'boss',
  description: 'Show Black Desert Online boss timer information',
  usage: '!boss | !boss table',
  execute: async (message: Message, args: string[]): Promise<void> => {
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'table') {
      await handleBossTable(message);
    } else {
      await handleBossCurrent(message);
    }
  },
};

async function handleBossCurrent(message: Message): Promise<void> {
  const statusMsg = await message.reply('⏳ Fetching current boss information...');

  try {
    const bossData = await scrapeBossTimer();

    let display = '**🎯 Black Desert Online Boss Timer**\n\n';

    if (bossData.previousBoss) {
      display += `**Previous Boss:**\n`;
      display += `• ${bossData.previousBoss.name}`;
      if (bossData.previousBoss.time) {
        display += ` - ${bossData.previousBoss.time}`;
      }
      display += '\n\n';
    }

    if (bossData.nextBoss) {
      display += `**Next Boss:**\n`;
      display += `• ${bossData.nextBoss.name}`;
      if (bossData.nextBoss.time) {
        display += ` - ${bossData.nextBoss.time}`;
      }
      display += '\n\n';
    }

    if (bossData.followedBy.length > 0) {
      display += `**Followed By:**\n`;
      for (const boss of bossData.followedBy.slice(0, 5)) {
        display += `• ${boss.name}`;
        if (boss.time) {
          display += ` - ${boss.time}`;
        }
        display += '\n';
      }
      display += '\n';
    }

    display += '_Use `!boss table` to see the full weekly schedule._';

    await statusMsg.edit(display);
  } catch (error) {
    console.error('Error fetching boss data:', error);
    await statusMsg.edit(
      '❌ Failed to fetch boss timer data. Please try again later or check https://garmoth.com/boss-timer directly.'
    );
  }
}

async function handleBossTable(message: Message): Promise<void> {
  const statusMsg = await message.reply('⏳ Fetching boss schedule...');

  try {
    const bossData = await scrapeBossTimer();

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
    console.error('Error fetching boss schedule:', error);
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
