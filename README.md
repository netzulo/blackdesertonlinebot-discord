# Black Desert Online Discord Bot

A Discord bot boilerplate for Black Desert Online community, written in TypeScript using the official Discord.js library.

## 🚀 Features

- **TypeScript**: Full TypeScript support with strict type checking
- **Discord.js**: Official Discord library (v14+)
- **Web Scraping**: WebdriverIO integration for headless scraping of Garmoth.com
- **Database**: SQLite database with Zod schema validation for persistent data storage
- **Gear Management**: Track and display user gear from Garmoth profiles
- **Boss Timer**: Real-time boss schedule information from Garmoth
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
  # Required
  DISCORD_TOKEN=paste_your_actual_token_here
  DISCORD_CLIENT_ID=your_application_client_id
  BOT_PREFIX=!

  # Optional
  ENV_NAME=env               # env | prod
  LOG_LEVEL=info             # error | warn | info | verbose | debug | silly

  # Scraper browser config (optional)
  BROWSER_NAME=chrome        # chrome | chromium | firefox
  BROWSER_HEADLESS=true      # true | false
  BROWSER_WIDTH=1920
  BROWSER_HEIGHT=1080
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
| `!gear` | Manage and display user gear from Garmoth profiles | `!gear @user` or `!gear add [url]` |
| `!gearscore` | Display AP/AAP/DP stats from user gear profile | `!gearscore` or `!gearscore @user` |
| `!boss` | Show Black Desert Online boss timer information | `!boss` or `!boss table` |

### Gearscore Command Details

The `!gearscore` command displays gear score statistics (AP/AAP/DP) for users who have added their Garmoth profile:

- **`!gearscore`** - Display your own gear score stats (AP, AAP, DP)
- **`!gearscore @username`** - Display gear score stats for a mentioned Discord user

**Note:** You must first add your gear profile using `!gear add [garmoth_url]` before you can use the gearscore command. The stats are automatically extracted from your Garmoth profile when you add or update your gear.

### Gear Command Details

The `!gear` command allows you to manage and display user gear profiles scraped from Garmoth:

- **`!gear @username`** - Display the gear for a mentioned Discord user
- **`!gear add [garmoth_url]`** - Add your gear profile by providing a Garmoth character URL (e.g., https://garmoth.com/character/YourCharID)
- **`!gear update [garmoth_url]`** - Update your gear profile with a new URL or refresh data
- **`!gear delete`** - Remove your gear profile from the database

### Boss Command Details

The `!boss` command provides Black Desert Online boss timer information from Garmoth:

- **`!boss`** - Show current boss status (previous, next, and upcoming bosses)
- **`!boss table`** - Display the full weekly boss schedule table

Tip: For debugging scraping issues, set `BROWSER_HEADLESS=false` and use `BROWSER_WIDTH/BROWSER_HEIGHT` to standardize the viewport (e.g., 1920x1080). You can also adjust `BROWSER_NAME` to `firefox` when needed.

Logging: Control verbosity with `LOG_LEVEL` (default: `info`).

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
│   ├── database.test.ts
│   ├── helpers.test.ts
│   └── new-commands.test.ts
├── scripts/                    # Helper scripts
│   ├── docker-dev.sh           # Dev Docker setup
│   └── docker-prod.sh          # Prod Docker setup
├── src/
│   ├── commands/               # Bot commands
│   │   ├── ping.ts
│   │   ├── bdobase.ts
│   │   ├── gear.ts
│   │   └── boss.ts
│   ├── database/               # Database layer
│   │   ├── schema.ts           # Zod schemas and types
│   │   └── service.ts          # Database operations
│   ├── scrapers/               # Web scraping modules
│   │   ├── garmoth.ts          # Garmoth profile scraper
│   │   └── boss-timer.ts       # Boss timer scraper
│   ├── utils/                  # Utility functions
│   │   └── helpers.ts
│   ├── types.ts                # TypeScript types
│   └── index.ts                # Main bot file
├── data/                       # SQLite database (gitignored)
│   └── bot.db
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
Black Desert Online does not provide an official public API. This bot respects the game's Terms of Service and uses:
- **Web scraping** with headless browser from Garmoth.com (a community resource) for:
  - Public character profiles and gear information
  - Boss timer schedules
- Community features
- Information sharing
- Linking to official resources
- **No unauthorized access** to game servers or private data
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
