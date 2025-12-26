import { formatTimestamp, isValidDiscordToken, formatUptime } from '../src/utils/helpers';

describe('Helper Functions', () => {
  describe('formatTimestamp', () => {
    it('should format a timestamp correctly', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/Jan.*2024.*12:00/);
    });
  });

  describe('isValidDiscordToken', () => {
    it('should return true for valid token format', () => {
      const validToken = 'MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ.ZnCjm1XVW7vRze4b7Cq4se7lk';
      expect(isValidDiscordToken(validToken)).toBe(true);
    });

    it('should return false for invalid token format', () => {
      expect(isValidDiscordToken('invalid')).toBe(false);
      expect(isValidDiscordToken('invalid.token')).toBe(false);
      expect(isValidDiscordToken('')).toBe(false);
    });

    it('should return false for token with empty parts', () => {
      expect(isValidDiscordToken('...')).toBe(false);
      expect(isValidDiscordToken('valid.')).toBe(false);
    });
  });

  describe('formatUptime', () => {
    it('should format seconds correctly', () => {
      expect(formatUptime(5000)).toBe('5s');
      expect(formatUptime(30000)).toBe('30s');
    });

    it('should format minutes correctly', () => {
      expect(formatUptime(60000)).toBe('1m 0s');
      expect(formatUptime(150000)).toBe('2m 30s');
    });

    it('should format hours correctly', () => {
      expect(formatUptime(3600000)).toBe('1h 0m');
      expect(formatUptime(7200000)).toBe('2h 0m');
    });

    it('should format days correctly', () => {
      expect(formatUptime(86400000)).toBe('1d 0h 0m');
      expect(formatUptime(90000000)).toBe('1d 1h 0m');
    });
  });
});
