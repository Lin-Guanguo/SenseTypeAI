Last Updated: 2025-12-02

# SenseType AI

An AI-powered input engine for Raycast that senses your intent and transforms your typing.

## Features

- Real-time text transformation with debounced API calls (400ms)
- Grammar, spelling, and clarity improvements
- Automatic copy-to-clipboard on exit
- Stale request cancellation for responsive UX
- Error handling with user-friendly toasts

## Installation

```bash
npm install
```

## Development

```bash
# Start Raycast development mode
npm run dev

# Build the extension
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Configuration

### API Key

Set your OpenRouter API key in Raycast preferences (stored securely in Keychain).

For local development, you can also use a `.env` file:
```
OPENROUTER_API_KEY=sk-xxx
```

### Model

Default model: `google/gemini-2.5-flash`

Configure in Raycast preferences or `.env`:
```
OPENROUTER_MODEL=google/gemini-2.5-flash
```

## Usage

1. Open Raycast and search for "SenseType AI"
2. Type or paste text in the input field
3. Wait for AI transformation (auto-triggered after 400ms pause)
4. Use keyboard shortcuts:
   - `Cmd+Return` - Copy and exit
   - `Cmd+C` - Copy output
   - `Cmd+R` - Regenerate

## Project Structure

```
src/
├── index.tsx          # Main UI component
├── openrouter.ts      # OpenRouter API client
├── debounce.ts        # Debounce utility
└── __tests__/         # Unit tests
assets/
└── extension-icon.png # Extension icon
```

## Publishing

Before publishing to Raycast Store:
1. Create a Raycast account
2. Update `author` in `package.json` to your Raycast username
3. Run `npm run publish`

## Documentation

- `docs/start.md`: Product vision and architecture
- `docs/execution-plan.md`: Implementation plan and milestones
- `docs/references/`: API and framework references
