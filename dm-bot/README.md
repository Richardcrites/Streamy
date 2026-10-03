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
     *Send Messages*, *Embed Links* and *Read Message History*.
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
