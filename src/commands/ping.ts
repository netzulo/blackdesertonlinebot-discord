import { Message } from 'discord.js';
import { Command } from '../types';

export const pingCommand: Command = {
  name: 'ping',
  description: 'Check if the bot is responsive',
  usage: '!ping',
  execute: async (message: Message, _args: string[]): Promise<void> => {
    const sent = await message.reply('Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    await sent.edit(
      `🏓 Pong!\n` + `📡 Latency: ${latency}ms\n` + `💓 API Latency: ${apiLatency}ms`
    );
  },
};
