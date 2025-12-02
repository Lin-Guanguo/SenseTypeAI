Last Updated: 2025-12-02

# OpenRouter Quickstart Summary

- Reference: [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart) (accessed: 2025-12-02)

## Essentials
- Base URL: `https://openrouter.ai/api/v1`
- Endpoints: `POST /chat/completions` (chat), `GET /models` (catalog).
- Auth: `Authorization: Bearer $OPENROUTER_API_KEY`; store the key in `.env` for dev (`OPENROUTER_API_KEY=...`), and in Raycast ship builds prefer a password-type preference (Keychain).
- Headers: `Content-Type: application/json`; `HTTP-Referer` (your domain or `http://localhost` for dev); `X-Title` optional but recommended for display.
- Body: OpenAI-compatible schema — `model` (e.g., `openrouter/auto` or a specific model name), `messages` array, optional `stream: true` for SSE.

## Example (non-streaming)
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: http://localhost" \
  -H "X-Title: SenseType AI Dev" \
  -d '{
    "model": "openrouter/auto",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

## Example (Node + OpenAI client)
```bash
npm install openai
```

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function run() {
  const completion = await openai.chat.completions.create({
    model: "openrouter/auto",
    messages: [{ role: "user", content: "Hello!" }],
    headers: {
      "HTTP-Referer": "http://localhost",
      "X-Title": "SenseType AI Dev",
    },
  });

  console.log(completion.choices[0].message);
}

run().catch((err) => console.error(err));
```

## Response & Handling
- Shape mirrors OpenAI chat completion: `choices[].message`, `usage` token counts. Streaming returns SSE `data:` events until `[DONE]`.
- Common failures: 401 for missing/invalid key, model not found, rate limits; surface the error message and keep UI stable (toast + last good output).
