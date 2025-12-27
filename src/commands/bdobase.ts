import { Message } from 'discord.js';
import { Command } from '../types';

/**
 * Black Desert Online base information command
 * This command provides basic information about Black Desert Online
 *
 * Note: Black Desert Online does not have an official public API.
 * This is a placeholder for game-related information commands.
 */
export const bdobaseCommand: Command = {
  name: 'bdobase',
  description: 'Get basic information about Black Desert Online',
  usage: '!bdobase',
  execute: async (message: Message, _args: string[]): Promise<void> => {
    const info = `
**🎮 Black Desert Online - Basic Information**

**About:**
Black Desert Online is a sandbox-oriented MMORPG with fast-paced action combat, deep life skills, and an immersive open world.

**Official Resources:**
• Website: https://www.naeu.playblackdesert.com/
• Support: https://support.pearlabyss.com/

**Key Features:**
• Action Combat System
• Open World Exploration
• Life Skills & Crafting
• Node War & Siege
• Pet & Mount System

_Note: For real-time game data, please check official Black Desert Online sources._
    `.trim();

    await message.reply(info);
  },
};
