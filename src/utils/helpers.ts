/**
 * Format a timestamp to a human-readable string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/**
 * Validate Discord bot token format.
 *
 * This performs a lightweight, heuristic check:
 * - Token must have three dot-separated parts
 * - Each part must contain only base64url characters
 * - Each part must be within a reasonable length range
 *
 * Note: This does not verify that the token is active or belongs to a
 * particular application; it only checks that the string looks like a
 * well-formed Discord bot token.
 */
export function isValidDiscordToken(token: string): boolean {
  if (typeof token !== 'string' || token.length === 0) {
    return false;
  }

  // Discord tokens are typically in the format: MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ.ZnCjm1XVW7vRze4b7Cq4se7lk
  // They contain three base64url-encoded parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const base64UrlRegex = /^[A-Za-z0-9\-_]+$/;
  const [part1, part2, part3] = parts;

  // All parts must be non-empty and contain only base64url characters
  if (!part1 || !part2 || !part3) {
    return false;
  }
  if (![part1, part2, part3].every((p) => base64UrlRegex.test(p))) {
    return false;
  }

  // Apply conservative length bounds
  const isWithin = (value: number, min: number, max: number): boolean =>
    value >= min && value <= max;

  if (
    !isWithin(part1.length, 6, 64) ||
    !isWithin(part2.length, 6, 64) ||
    !isWithin(part3.length, 20, 128)
  ) {
    return false;
  }

  return true;
}

/**
 * Calculate uptime in a human-readable format
 */
export function formatUptime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
