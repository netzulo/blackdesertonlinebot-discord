# Black Desert Online Discord Bot

A Discord bot boilerplate for Black Desert Online community, written in TypeScript using the official Discord.js library.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Discord.js**: Official Discord library (v14+)
- **Testing**: Jest testing framework with coverage reports
- **CI/CD**: GitHub Actions workflow for automated testing
- **Linting**: ESLint with TypeScript support
- **Copilot Ready**: GitHub Copilot instructions for VS Code

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/netzulo/blackdesertonlinebot-discord.git
cd blackdesertonlinebot-discord
```

2. Install dependencies:
```bash
npm install
```

3. **Configure environment variables** (IMPORTANT):
   
   a. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   b. Get your Discord Bot Token:
      - Go to [Discord Developer Portal](https://discord.com/developers/applications)
      - Click "New Application" and give it a name
      - Go to the "Bot" section in the left sidebar
      - Click "Add Bot"
      - Under "Token", click "Reset Token" and copy it
      - **Keep this token secret!**
   
   c. Edit `.env` file and replace the values:
   ```env
   DISCORD_TOKEN=paste_your_actual_token_here
   DISCORD_CLIENT_ID=your_application_client_id
   BOT_PREFIX=!
   ```
   
   ⚠️ **NEVER commit your `.env` file to Git!** It contains sensitive credentials.
   The `.env` file is already included in `.gitignore` to prevent accidental commits.

4. Invite your bot to your Discord server:
   - In Discord Developer Portal, go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`
   - Select bot permissions: `Send Messages`, `Read Messages/View Channels`
   - Copy the generated URL and open it in your browser
   - Select your server and authorize the bot

## 🏃 Running the Bot

### Local Development (without Docker)

Development mode with hot reload:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

### 🐳 Docker Deployment

#### Unified Docker Script

The project includes a consolidated script that handles both development and production environments using the `ENV_NAME` environment variable:

```bash
# Development mode (default - copies .env.example to .env if needed)
ENV_NAME=env ./scripts/docker-run.sh

# Production mode (requires existing .env file)
ENV_NAME=prod ./scripts/docker-run.sh
```

#### Development with Docker

The development setup automatically copies `.env.example` to `.env` if it doesn't exist:

```bash
# Using unified script
ENV_NAME=env ./scripts/docker-run.sh

# Or using legacy script
./scripts/docker-dev.sh

# Or manually
docker compose up --build
```

#### Production with Docker

**Important**: Production requires an existing `.env` file with real credentials. The build will fail if `.env` doesn't exist.

```bash
# Create .env from example and edit with real values
cp .env.example .env
# Edit .env with your actual Discord bot token

# Using unified script
ENV_NAME=prod ./scripts/docker-run.sh

# Or using legacy script
./scripts/docker-prod.sh

# Or manually
docker compose -f docker-compose.prod.yml up --build -d
```

#### Docker Commands

```bash
# Build Docker image manually
docker build -t bdo-discord-bot .

# Stop containers
docker compose down

# View logs
docker compose logs -f

# Restart containers
docker compose restart
```

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## 🔍 Linting & Formatting

Run linter:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

Check code formatting:
```bash
npm run format:check
```

Format code:
```bash
npm run format
```

**Note**: The CI pipeline runs linting first, then formatting checks to ensure code quality.

## 📝 Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `!ping` | Check bot responsiveness and latency | `!ping` |
| `!bdobase` | Get basic Black Desert Online information | `!bdobase` |

## 🏗️ Project Structure

```
blackdesertonlinebot-discord/
├── .github/
│   ├── copilot/
│   │   └── instructions.md    # Copilot prompts for VS Code
│   └── workflows/
│       └── ci.yml              # CI/CD workflow with Docker tests
├── __tests__/                  # Test files (root directory)
│   ├── commands.test.ts
│   └── helpers.test.ts
├── scripts/                    # Helper scripts
│   ├── docker-dev.sh           # Dev Docker setup
│   └── docker-prod.sh          # Prod Docker setup
├── src/
│   ├── commands/               # Bot commands
│   │   ├── ping.ts
│   │   └── bdobase.ts
│   ├── utils/                  # Utility functions
│   │   └── helpers.ts
│   ├── types.ts                # TypeScript types
│   └── index.ts                # Main bot file
├── .dockerignore               # Docker ignore rules
├── .env.example                # Environment variables template
├── .eslintrc.js                # ESLint configuration
├── .gitignore                  # Git ignore rules
├── docker-compose.yml          # Docker dev configuration
├── docker-compose.prod.yml     # Docker prod configuration
├── Dockerfile                  # Multi-stage Docker build
├── jest.config.js              # Jest configuration
├── package.json                # Project dependencies
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## 🛠️ Development

### Adding a New Command

1. Create a new file in `src/commands/`:
```typescript
import { Message } from 'discord.js';
import { Command } from '../types';

export const myCommand: Command = {
  name: 'mycommand',
  description: 'Command description',
  usage: '!mycommand',
  execute: async (message: Message, args: string[]): Promise<void> => {
    await message.reply('Hello!');
  },
};
```

2. Import and register in `src/index.ts`:
```typescript
import { myCommand } from './commands/mycommand';

// Add to commandList array
const commandList: Command[] = [
  pingCommand,
  bdobaseCommand,
  myCommand, // Add here
];
```

3. Write tests in `__tests__/commands.test.ts`

### Adding Utility Functions

1. Create or update a file in `src/utils/`
2. Export your function with proper TypeScript types
3. Write tests in `__tests__/`

## 🤖 GitHub Copilot

This project includes Copilot instructions in `.github/copilot/instructions.md` that provide:
- Project context and structure
- Code style guidelines
- TypeScript best practices
- Discord.js patterns
- Testing requirements
- Examples for common tasks

VS Code will automatically use these instructions to provide better code suggestions.

## 🔒 Security

**Environment Variables:**
- ✅ `.env.example` is committed to show the required variables
- ❌ `.env` is in `.gitignore` and should **NEVER** be committed
- 🔐 Your `.env` file contains sensitive credentials (Discord bot token)

**Best Practices:**
- Never share your Discord bot token with anyone
- If you accidentally expose your token, regenerate it immediately in the Discord Developer Portal
- Keep your dependencies up to date: `npm audit` and `npm update`
- Review security advisories regularly
- Use environment-specific `.env` files for different deployments (development, staging, production)

## 📦 CI/CD

The project includes a GitHub Actions workflow with two jobs:

**Test Job:**
- Runs on Node.js 18.x and 20.x
- Executes linting
- Builds the project
- Runs all tests
- Generates coverage reports
- Uploads to Codecov (optional)

**Docker Job:**
- Runs after tests pass
- Validates `docker-compose.yml` syntax
- Validates `docker-compose.prod.yml` syntax
- Tests Docker image build
- Tests dev docker-compose build
- Tests production docker-compose build

## ⚠️ Important Notes

### Black Desert Online API
Black Desert Online does not provide an official public API. This bot focuses on:
- Community features
- Information sharing
- Linking to official resources
- **No unofficial or third-party game APIs**

### Official Resources Only
- Website: https://www.naeu.playblackdesert.com/
- Support: https://support.pearlabyss.com/

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions, please use the GitHub Issues page.
