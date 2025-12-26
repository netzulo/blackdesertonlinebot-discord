import { pingCommand } from '../commands/ping';
import { bdobaseCommand } from '../commands/bdobase';

describe('Commands', () => {
  describe('pingCommand', () => {
    it('should have correct name and description', () => {
      expect(pingCommand.name).toBe('ping');
      expect(pingCommand.description).toBe('Check if the bot is responsive');
      expect(pingCommand.usage).toBe('!ping');
    });

    it('should have an execute function', () => {
      expect(typeof pingCommand.execute).toBe('function');
    });
  });

  describe('bdobaseCommand', () => {
    it('should have correct name and description', () => {
      expect(bdobaseCommand.name).toBe('bdobase');
      expect(bdobaseCommand.description).toBe('Get basic information about Black Desert Online');
      expect(bdobaseCommand.usage).toBe('!bdobase');
    });

    it('should have an execute function', () => {
      expect(typeof bdobaseCommand.execute).toBe('function');
    });
  });
});
