# Gemini Mind (Female-or-Male)

Монгол хэлтэй AI туслах: Gemini, Discord нэвтрэлт, owner консол.

## Ажиллуулах
```
bun install
cp .env.example .env   # утгуудыг бөглөнө
bun run dev
```

## Render (Web Service)
- Build Command: `bun install && bun run build`
- Start Command: `bun run start`
- Environment: `NODE_ENV=production`, `APP_URL`, `GEMINI_API_KEY`, `DISCORD_CLIENT_ID`,
  `DISCORD_CLIENT_SECRET`, `OWNER_DISCORD_ID`, `SESSION_SECRET`, `DISCORD_WEBHOOK_URL`
- Discord Developer Portal -> OAuth2 -> Redirects: `APP_URL/api/auth/discord/callback`

## Нууц мэдээлэл
`.env` болон `discord-config.json`-г хэзээ ч GitHub-д оруулахгүй.
