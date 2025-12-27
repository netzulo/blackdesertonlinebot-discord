import { Message } from 'discord.js';
import { Command } from '../types';
import { logger } from '../utils/logger';

export const pingCommand: Command = {
  name: 'ping',
  description: 'Check if the bot is responsive',
  usage: '!ping',
  execute: async (message: Message, _args: string[]): Promise<void> => {
    logger.info('Ping command invoked', { channel: message.channelId, user: message.author.id });
    const sent = await message.reply('Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(message.client.ws.ping);

    await sent.edit(
      `🏓 Pong!\n` + `📡 Latency: ${latency}ms\n` + `💓 API Latency: ${apiLatency}ms`
    );
    logger.info('Ping command completed', { latency, apiLatency });
  },
};
