# Star Citizen DM: Discord bot

Your personal Game Master for Star Citizen. It creates characters with origin stories, runs
multi-act campaigns that turn into **real in-game objectives** and **roleplay scenes**, remembers
everything, links players' stories together, and sends in-character **comms** to your community.

Built on the lore codex in [`../lore`](../lore) (year 2956, Alpha 4.10).

## What it does

| Command | What happens |
|---|---|
| `/character create` | Pick an origin (8 lore backgrounds), a career, pronouns, then a **name from suggestions** (or type your own). The DM writes your origin story with 2 personal **hooks** that later stories pull on. |
| `/character sheet` / `story` / `list` / `switch` | Your dossier, full story, and multiple characters. |
| `/character location` | Tell the DM where you are in the 'Verse (Stanton / Pyro / Nyx). |
| `/log` | Record what you did in game. It goes into your journal and future chapters. |
| `/journal` | Your character's history. |
| `/campaign start` | Start a story with an **end goal**: Uncover, Build, Rise, Hunt or Protect. Solo or **org-wide**. It's built from your character's hooks. |
| `/story next` | Get the current act: a transmission from your patron, an in-game objective for **each** crew member (fitting their career), and an RP prompt. |
| Choice buttons | After playing it out, click how you handled it: 🕊️ clean, 🤝 deal or 🔥 ruthless. Your choices decide the **finale** and your renown (Trust / Connections / Fear). |
| `/mission` | A **one-shot mission** in the DM's voice: a hook, an NPC with a motive, an in-game objective for each crew member, and a hidden twist. Play it in game and in **voice chat**, then click ✅ complete or 💀 failed (add a note about what happened). The DM reveals the twist, writes an epilogue, and updates everyone's journal. |
| `/voice join` / `test` / `replay` / `leave` | The DM **speaks aloud** in your voice channel. When you're in voice, missions, chapter transmissions, twists and finales are read out automatically. It speaks only; it doesn't listen. |
| `/dm-admin voice` / `voice-name` | Admin: turn the spoken voice on or off, and pick one of 11 free voices. |
| `/ask` | Ask the DM anything, like *"what contract do we take for this?"*, *"where can I repair?"* or *"who is Ysolde Pike again?"*. He answers in character using your current mission, your crew's conditions, server canon and a guide to which in-game contracts fit each objective. In the scribe channel, start a message with `?` to ask. Without an AI key it still answers contract questions. |
| `/status view` / `add` / `clear` | Injuries 🩸, ship damage 🚀, warrants ⚖️ and other conditions. Each says how it clears in game ("land and repair", "med bed"), and they carry into missions and stories until cleared. |
| `/lore add` / `list` | **Server canon**: lore your group created. The DM respects it in every story. |
| `/archive list` / `read` / `export` | Finished missions and campaigns, saved as readable stories. Export downloads everything as a file. |
| **Scribe channel** | One player types quick, messy updates while you play, like *"beat 2 vanduul, rj hull shredded, landing nyx 2"*. The DM records injuries, ship damage, locations, journal entries and lore, and replies with a short ✅ summary. No commands needed. Mission report notes are read the same way. |
| `/dm-admin scribe-channel` | Admin: pick the scribe channel. |
| `/dm-admin persona` | Admin: give the DM a name and personality (default: "Relay", a gravelly information broker). |
| `/story crossover @player` | Links two characters' stories through shared history, rivalries or hooks, with a joint job and a meet-up scene. |
| `/org create/join/leave/info/list/relation` | Multiple orgs per server, with alliances and rivalries. |
| `/comms send @player` / `broadcast` | In-character transmissions, DMed like incoming comms. |
| `/comms news` | Galactic news, including what players on your server have done (the "world log"). |
| `/dm-admin comms-channel` / `dms` | Admin: where story posts go, and whether players get DMs. |

## Setup (about 10 minutes, free)

**You need:** a computer that can stay on while the bot runs (or a free/cheap host), and
[Node.js 20+](https://nodejs.org).

1. **Create the bot on Discord**
   - Go to https://discord.com/developers/applications and click **New Application**. Name it, e.g. "SC Game Master".
   - On **General Information**, copy the **Application ID**. That's your `CLIENT_ID`.
   - Go to **Bot**, click **Reset Token**, and copy the token. That's your `DISCORD_TOKEN`. **Keep it secret.**
2. **Invite it to your server**
   - Go to **OAuth2 → URL Generator**. Tick scopes `bot` and `applications.commands`. For bot permissions, tick
     *Send Messages*, *Embed Links*, *Read Message History*, *Connect* and *Speak*.
   - Open the generated URL and pick your server.
   - To get your server ID (`GUILD_ID`): in Discord, turn on **Settings → Advanced → Developer Mode**, then right-click your server and choose **Copy Server ID**.
3. **Configure and run**
   ```bash
   cd dm-bot
   npm install
   cp .env.example .env      # then paste your token, client id and server id into .env
   npm run deploy            # registers the slash commands (re-run after updates)
   npm start                 # the bot is now online
   ```
4. In Discord: `/dm-admin comms-channel #story-comms`, then `/character create`.

## Is it free?

- **Discord bots are free.** No cost to create or run one on Discord's side.
- **The built-in story engine is free.** It writes everything from the lore data with no API needed.
- **Optional AI narration:** put an **OpenRouter** key (`OPENROUTER_API_KEY`, from https://openrouter.ai/keys) or an
  Anthropic key (`ANTHROPIC_API_KEY`) in `.env`, and the AI rewrites the prose (origin stories, transmissions,
  briefings, finales) using the full lore codex and each character's history. The cost depends on the model you pick.
  Choose a model with `OPENROUTER_MODEL` (see https://openrouter.ai/models); the default `openrouter/auto` picks one
  for you. The objectives stay the same either way, so quests are always things you can really do in game. If the AI
  fails or returns something unusable, the bot falls back to the built-in text.
- **Hosting:** running it on your own PC is free. For 24/7 uptime, a small host costs about $0–5/month.

## How stories link

- **Origin → campaign:** your origin's hooks (a debt, an enemy, a missing person) become campaign antagonists and stakes.
- **Chapter → chapter:** chapters pull in open hooks, your `/log` entries and earlier choices.
- **Player → player:** crossovers create connections. Org campaigns give everyone a role.
- **Story → world:** finales, new orgs and rivalries go into the **world log**, which feeds the news and the AI narrator, so one crew's ending becomes another crew's rumour.

## Scribe channel setup

1. `/dm-admin scribe-channel #scribe`
2. In the Discord developer portal → your app → **Bot**, turn on **Message Content Intent** (so the bot can read that channel), then restart the bot.
3. During play, one person types what happens. Messages starting with `((` or `//` are ignored (out of character).

Without an AI key, scribe messages are still saved to the journal and the mission's field log, but not parsed into conditions.

## The DM's voice

- **Free by default:** Microsoft Edge's online voices, no key needed. It's an unofficial service, so it could change or stop working someday.
- **ElevenLabs:** put `ELEVENLABS_API_KEY=` (and optionally `ELEVENLABS_VOICE_ID=`) in `.env` and restart. Nothing else changes.
- The bot needs the **Connect** and **Speak** permissions in your voice channel. If you invited it before voice existed,
  either re-invite it with those permissions ticked, or give its role Connect and Speak in Server Settings → Roles.

## Data

Everything is saved in `data/db.json`, separated per Discord server. Back it up to keep your history.

## Roadmap

- **Game.log companion:** a small desktop app that reads Star Citizen's local `Game.log` to auto-update location and log kills, deaths and contracts.
- **Patch updates:** when Castra and the Nyx planets go live, add them to `src/lore/data.js` and `/lore`.
- **Crew votes** on choices, and scheduled news broadcasts.

## Development

```bash
npm test     # runs the story engine through every origin, career, campaign and crossover
```
