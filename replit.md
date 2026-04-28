# Prince-XMD Bot

A multi-session WhatsApp bot with a web-based pairing dashboard, built on Node.js, Express, Socket.IO, and Baileys.

## Project Structure

- `server.js` — Express + Socket.IO server. Serves the dashboard (`index.html`) and exposes `/api/pair` for starting a WhatsApp pairing session. Listens on `0.0.0.0:5000` (configurable via `PORT`).
- `bot-core.js` — WhatsApp bot lifecycle (start/stop/restore sessions) using `@whiskeysockets/baileys`.
- `eventHandlers.js`, `message-processor.js`, `event-control.js` — Message + event pipeline.
- `commands/` — Bot commands (`ai`, `group`, `owner`, `tools`, `index.js`).
- `source/` — Shared modules: `Config.js`, `Database.js`, `LoadDatabase.js`, `Function.js`, `Mess.js`, `Webp.js`, `Utils.js`.
- `storage/` — Local JSON storage (contacts, database).
- `settings.js` — Global bot settings (owner, prefix, channels, etc.).
- `index.html` — Dashboard UI for pairing devices to the bot.
- Supporting files: `backup-manager.js`, `cleanup-manager.js`, `session-tracker.js`, `session-recovery.js`, `session-encoder.js`, `pair.js`, `syzopedia.js`, `telegram-*.js`.

## Runtime

- **Language:** Node.js 20
- **Entry point:** `node server.js`
- **Port:** 5000 (Replit web preview)
- **Host:** 0.0.0.0

## Replit Setup

- Workflow `Start application` runs `node server.js` and waits for port 5000 (webview output).
- Deployment is configured as `vm` (always-on) so WhatsApp sessions and websocket connections remain alive.

## Render Deployment

- `render.yaml` is a Render Blueprint: web service running Node 20, build `npm install`, start `node server.js`, health check `/status`, and a 1 GB persistent disk mounted at `sessions/`.
- `Procfile` lets non-Blueprint platforms (and Render's manual setup) discover the start command.
- `.gitignore` excludes `node_modules/`, `sessions/`, `session-tracker.json`, local logs, and Replit-internal config so they aren't pushed to GitHub.
- Pairing-code reliability fix: bot waits for the WebSocket to be ready before calling `requestPairingCode`, and uses the `Browsers.macOS('Safari')` fingerprint that WhatsApp's "Link with phone number" flow officially accepts. This eliminates the "incorrect code" issue on Render cold starts.

## Vercel Deployment

- `vercel.json` is included for previewing the dashboard UI on Vercel.
- Vercel is **serverless**: long-lived WebSocket connections (Baileys) cannot stay alive for 24/7 operation there. Use Vercel only for UI previews; use Render (or any VPS) for production.

## Recent Changes

- Replaced "Archie" branding everywhere (menu caption, channel name, logo URL).
- New menu logo: `https://files.catbox.moe/7n6017.png`.
- Welcome DM now sends the new logo + a clickable channel link.
- Added `.presence` command (online | typing | recording | none) and `PRESENCE_MODE` env var.
- Implemented anti-left handler in `eventHandlers.js` (was previously calling undefined methods); bot must be group admin to re-add. Falls back to DMing the invite link if re-add fails.
- Pairing reliability fix for Render (see above).
- Presence keep-alive every 4 minutes so WhatsApp shows the bot as active.

## Notes

- WhatsApp pairing sessions are stored under `sessions/` (created on demand).
- Optional Telegram integration is available via `telegram-setup.js`.
