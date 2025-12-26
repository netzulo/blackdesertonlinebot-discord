# GitHub Copilot Instructions for Black Desert Online Discord Bot

## Project Context
This is a Discord bot project for Black Desert Online, written in TypeScript using the official Discord.js library.

## Code Style Guidelines

### TypeScript Standards
- Always use strict TypeScript with explicit types
- Prefer interfaces over type aliases for object shapes
- Use async/await for asynchronous operations
- Enable all strict compiler options
- Document complex functions with JSDoc comments

### Discord.js Patterns
- Use the official Discord.js library (v14+)
- Implement proper error handling in all command executions
- Use GatewayIntentBits explicitly for required intents
- Handle bot lifecycle (startup, shutdown) gracefully
- Log important events to console

### Command Structure
- Each command should be in its own file in `src/commands/`
- Commands must implement the `Command` interface
- Include name, description, usage, and execute function
- Handle errors within the execute function
- Reply to messages with helpful feedback

### Testing Requirements
- Write tests for all utility functions
- Use Jest for testing framework
- Aim for >80% code coverage
- Test both success and error cases
- Mock Discord.js objects when necessary

### File Organization
- Keep commands in `src/commands/`
- Keep utilities in `src/utils/`
- Keep tests in `__tests__/` (root directory)
- Keep types in `src/types.ts`
- Main bot logic in `src/index.ts`

## Black Desert Online Specifics
- Black Desert Online does not have an official public API
- Focus on community features and information sharing
- Link to official resources only
- Do not use unofficial or third-party game APIs
- Respect game's terms of service

## Best Practices
- Always validate environment variables
- Use dotenv for configuration
- Implement graceful shutdown handlers
- Log errors with context
- Keep commands simple and focused
- Follow the single responsibility principle

## Examples

### Creating a New Command
```typescript
import { Message } from 'discord.js';
import { Command } from '../types';

export const myCommand: Command = {
  name: 'mycommand',
  description: 'Description of the command',
  usage: '!mycommand [args]',
  execute: async (message: Message, args: string[]): Promise<void> => {
    try {
      // Command logic here
      await message.reply('Response');
    } catch (error) {
      console.error('Error in myCommand:', error);
      throw error;
    }
  },
};
```

### Writing Tests
```typescript
import { myFunction } from '../src/utils/myUtil';

describe('MyUtil', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => {
      expect(myFunction('input')).toBe('expected');
    });

    it('should handle invalid input', () => {
      expect(() => myFunction('')).toThrow();
    });
  });
});
```

## Common Tasks

### Adding a New Command
1. Create file in `src/commands/[commandname].ts`
2. Implement the Command interface
3. Import and add to commands list in `src/index.ts`
4. Add tests in `src/__tests__/commands.test.ts`
5. Update documentation

### Adding a Utility Function
1. Create or update file in `src/utils/`
2. Export the function with proper typing
3. Add JSDoc documentation
4. Write tests in `__tests__/`
5. Ensure >80% coverage

## Important Notes
- Never commit the `.env` file (use `.env.example` instead)
- Always use the latest stable version of Discord.js
- Keep dependencies up to date
- Run tests before committing
- Run linter before committing
- Follow semantic versioning for releases
