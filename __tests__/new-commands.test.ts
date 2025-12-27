import { gearCommand } from '../src/commands/gear';
import { bossCommand } from '../src/commands/boss';

describe('New Commands', () => {
  describe('gearCommand', () => {
    it('should have correct name and description', () => {
      expect(gearCommand.name).toBe('gear');
      expect(gearCommand.description).toBe('Manage and display user gear from Garmoth profiles');
      expect(gearCommand.usage).toContain('!gear');
    });

    it('should have an execute function', () => {
      expect(typeof gearCommand.execute).toBe('function');
    });
  });

  describe('bossCommand', () => {
    it('should have correct name and description', () => {
      expect(bossCommand.name).toBe('boss');
      expect(bossCommand.description).toBe('Show Black Desert Online boss timer information');
      expect(bossCommand.usage).toContain('!boss');
    });

    it('should have an execute function', () => {
      expect(typeof bossCommand.execute).toBe('function');
    });
  });
});
