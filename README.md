# PRINCE-MD Bot

A multi-session WhatsApp bot with a web-based pairing dashboard, built on Node.js, Express, Socket.IO, and Baileys.

- Web dashboard at `/` for entering a phone number and receiving an instant pairing code.
- After linking, the bot auto-follows configured channels, auto-joins configured groups, and responds to all `.commands`.
- Owner: `254703712475`. Default prefix: `.`

## Run locally

```bash
npm install
node server.js
```

Then open <http://localhost:5000>.

## Deploy on Render (recommended)

Render is the recommended host because the bot needs a long-lived process and a persistent disk to keep WhatsApp sessions across restarts.

1. **Push this project to a GitHub repo.**
2. In Render, click **New +** → **Blueprint** and select your repo.
   Render will detect `render.yaml` and create a Web Service named `prince-md-bot`.
   - Runtime: Node 20
   - Build: `npm install`
   - Start: `node server.js`
   - Health check: `/status`
   - Persistent disk mounted at `sessions/` so WhatsApp credentials survive restarts.
3. Click **Apply** and wait for the build to finish.
4. Open the URL Render gives you (e.g. `https://prince-md-bot.onrender.com`) and pair your phone.

> The Blueprint defaults to the **Starter** paid plan because the bot needs an
> always-on instance and a persistent disk. If you want to test on the Free plan,
> edit `render.yaml`: change `plan: starter` to `plan: free` and remove the
> `disk:` block. WhatsApp sessions will be lost whenever the free instance
> sleeps or restarts.

### Manual Render setup (without Blueprint)

- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment variables**:
  - `NODE_VERSION` = `20.18.0`
  - `NODE_ENV` = `production`
  - `PRESENCE_MODE` = `online` (or `typing` / `recording` / `none`)
- **Health Check Path**: `/status`
- **Persistent Disk** (paid plan only): mount at `/opt/render/project/src/sessions`, 1 GB.

### Why pairing sometimes shows "incorrect code" on Render

This is fixed in this version. The previous bug was that the pairing code was
requested before the WebSocket handshake to WhatsApp finished — on Render's
cold start the socket needs ~1–3 s to be ready, so any code generated earlier
was invalid. The bot now waits for `connection: connecting` (or a 6 s fallback)
and uses the `Browsers.macOS('Safari')` fingerprint that WhatsApp's "Link with
phone number" flow officially supports.

## Deploy on Vercel

A `vercel.json` is included for convenience.

> **Important:** Vercel is a serverless platform. Long-running WebSocket
> connections (which Baileys requires) work on Vercel only as long as the
> single function invocation is alive — they are killed after the request
> timeout. The dashboard at `/` will load on Vercel, but pairing and
> commands cannot run reliably 24/7 there. Use Vercel only for previewing
> the UI; use Render (or any VPS) for actually running the bot.

If you still want to try it:

1. Push to GitHub.
2. Import the repo into Vercel.
3. Vercel will use `vercel.json` and run `node server.js`.
4. Optional env vars: `PRESENCE_MODE`.

## Configuration

Edit `settings.js` to change the owner, bot name, channel/group lists, and presence:

```js
global.MENU_IMAGE_URL  = "https://files.catbox.moe/7n6017.png";
global.CHANNEL_LINK    = "https://whatsapp.com/channel/0029Vb7do3y4Y9ltXOhAoR2s";
global.PRESENCE_MODE   = "online"; // online | typing | recording | none
global.AUTO_FOLLOW_CHANNELS = [ "https://whatsapp.com/channel/0029Vb7do3y4Y9ltXOhAoR2s" ];
global.AUTO_JOIN_GROUPS     = [ "https://chat.whatsapp.com/Gulz1YEd1NiEXm5LqkEwX7" ];
```

`AUTO_FOLLOW_CHANNELS` and `AUTO_JOIN_GROUPS` accept full WhatsApp invite URLs
(`https://chat.whatsapp.com/...`, `https://whatsapp.com/channel/...`) or bare
invite codes / newsletter JIDs.

### In-chat commands you'll want

| Command            | Description                                        |
| ------------------ | -------------------------------------------------- |
| `.menu`            | Full command menu with logo + channel link        |
| `.ping`            | Latency / uptime check                             |
| `.dev` / `.owner`  | Owner contact card                                 |
| `.presence <mode>` | Switch between `online` / `typing` / `recording`  |
| `.antileft on/off` | Re-add anyone who leaves the group (bot must be admin) |
| `.public` / `.self`| Toggle command access mode                         |

## Project layout

- `server.js` — Express + Socket.IO server, dashboard, `/api/pair` endpoint.
- `bot-core.js` — WhatsApp socket lifecycle, pairing code, auto-follow, auto-join, presence keep-alive.
- `eventHandlers.js` — Anti-delete, auto-typing, auto-recording, anti-left.
- `commands/` — Bot commands (owner, group, ai, tools).
- `source/` — Shared modules (Config, Database, Function, Utils, Webp, Mess).
- `settings.js` — Owner number, channel/group lists, bot name, presence.
- `index.html` — Pairing dashboard UI.
- `render.yaml` — Render Blueprint config.
- `vercel.json` — Vercel preview config (UI only, not for production bot).
