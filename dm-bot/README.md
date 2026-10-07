# Star Citizen DM: Discord bot

Your personal Game Master for Star Citizen. It creates characters with origin stories, runs
multi-act campaigns that turn into **real in-game objectives** and **roleplay scenes**, remembers
everything, links players' stories together, and sends in-character **comms** to your community.

Built on the lore codex in [`../lore`](../lore) (year 2956, Alpha 4.10).

## What it does

| Command | What happens |
|---|---|
| `/character create` | Pick an origin (8 lore backgrounds), pronouns, then a **name from suggestions** (or type your own). The DM writes your origin story with 2 personal **hooks** that later stories pull on. |
| ✍️ Your story, kept | `/character create` starts with **✍️ Write my own background**: who you are in your own words (*"failed comedian from Lorville"*), plus your whole story if you like. No pick list needed; the 8 preset origins are just suggestions. Write as much or as little as you like, from one line to a page. **Every word you write is kept.** The DM only adds what you left out (where you're from, who raised you, a first ship, what you want now), and only things that fit what you wrote: a comedian gets a comic for a mother, not a sniper rifle. Or let the DM write one from scratch: it's built from dozens of pieces and five ways of telling it, and pieces already used on your server are avoided, so no two characters read alike. 🎲 **New story** tells it again, ✍️ **Edit my story** (or `/character backstory`) changes anything. |
| `/character retell` | The DM rewrites your origin story (optionally with a new description). Use it if the AI was down when you made your character. Your description from `seed` is always in the story and on your dossier as **Concept**, even without AI. |
| `/saga start` | **The long story.** A server-wide saga across Stanton, Pyro and Nyx, with a villain known only by an alias, five acts and ten **leads**. Every lead is something real you do in game: Hockrow's Jorrit Dossier at the Onyx Facilities, the Farro data centres and Lazarus labs (Storm Breaker), InterSec's Vanduul-Tech Smugglers, Tactical Strike, QV Breaker Stations, Hunt Frontier Fighters, the Siege of Orison, Hathor's Align & Mine, Wikelo's Emporium, the contested zones and the Executive Hangar. Four sagas: *The Hyperion Inheritance*, *Embers of the Frontier*, *The Quiet at Virgil* and *Terra's Long Knife*. |
| 🧭 Missions follow the saga | While a saga runs, every `/mission` is built around the next lead: its place, its real contract, and what to look for. Succeed and you find the clue (two clues finish an act); fail and the villain's **threat** rises. At 10/10 they counterstrike, and losing that costs you a lead. After act V comes the **finale**, also played through real content. |
| 🧩 Personal secrets and the big reveal | Every character gets secrets tied to their own story (their home, the NPCs from their hooks), each hidden at a real place in game. They come out as you find leads and do side jobs. They all point at one **big reveal** at the finale that ties the whole crew together. `/saga secrets` shows yours and where to look next. |
| `/saga job` + DM Link | Every contract you take has a purpose. Tell the DM (`/saga job`), or let **DM Link** spot it in your Game.log: if it's the lead's contract, completing it finds the clue. Anything else is a **side job** with a reason in the story, and every 2 side jobs dig up one of your secrets. |
| `/saga status` / `recap` / `end` | Where the story stands (acts, clues, threat, the next lead's place and contract); "previously on…" read aloud; an admin can abandon a saga. Finished sagas go into `/archive`. |
| `/character role` | Your preferred **crew role** on missions: Pilot, Engineer, XO, Gunner, Medic, Loadmaster, Scout, Boarding Lead, Salvage Specialist, Quartermaster, **or make your own**: type a new name (e.g. *Information Broker*), describe the job, pick an emoji. Custom roles are shared with the server. Or **Auto**: roles that fit your story, rotating so you try new things. Nobody on a mission ever gets the same role as someone else. |
| `/crew-roles list` / `remove` | See every role (built-in and custom). Remove a custom role (its creator or an admin). |
| `/character sheet` / `story` / `list` / `switch` | Your dossier, full story, and multiple characters. |
| `/character location` | Tell the DM where you are in the 'Verse (Stanton / Pyro / Nyx). |
| `/log` | Record what you did in game. It goes into your journal and future chapters. |
| `/journal` | Your character's history. |
| `/campaign start` | Start a story with an **end goal**: Uncover, Build, Rise, Hunt or Protect. Solo or **org-wide**. It's built from your character's hooks. |
| `/story next` | Get the current act: a transmission from your patron, an in-game objective for **each** crew member (fitting their career), and an RP prompt. |
| Choice buttons | After playing it out, click how you handled it: 🕊️ clean, 🤝 deal or 🔥 ruthless. Your choices decide the **finale** and your renown (Trust / Connections / Fear). |
| `/mission contract: location:` | **Contract first (recommended).** Pull a real contract in game, then give the DM its name and where it sends you (e.g. `contract: Defend Occupants` `location: Shepherd's Rest, Bloom`). That contract and place are the job. The DM writes the story around what the contract really is (a bounty stays a bounty, a defend stays a defend), ties in your crew, and may add **one optional extra** (find someone on site, bring something back, an RP meet, stack a second contract). With a saga running, the contract is either the **lead** (if it matches) or a **side job** with a purpose in the story. With **DM Link**, it's even easier: when someone accepts a contract, the bot offers **🎬 Build our mission around this**, and everyone it's shared with joins the crew. The **▶️ Next job** button asks for your next contract too (leave it blank and the DM picks). |
| `/mission` | **Up to 8 players** (`with1`–`with7`), or `voice: True` to bring everyone in your voice channel who has a character (up to 10). Everyone gets a different crew role and a personal tie to someone else on the crew. A **one-shot mission** in the DM's voice: a hook, an NPC with a motive, an in-game objective for each crew member, and a hidden twist. Play it in game and in **voice chat**, then click ✅ complete or 💀 failed (add a note about what happened). The DM reveals the twist, writes an epilogue, and updates everyone's journal. |
| ⏭️ After every mission | The report says **what happened** (the epilogue, the twist revealed, any clue or personal secret found, injuries and damage recorded) and **what's next**: the next saga lead (its real place, contract and what to look for), or the counterstrike or finale coming; loose threads (who'll remember you, a crew member's open hook); and anything to fix first (an injury or hull damage forces a stop on the next job). The DM reads it aloud, and the epilogue ends with a teaser. Press **▶️ Next job** to start the next mission with the same crew. |
| `/voice join` / `test` / `replay` / `leave` | The DM **speaks aloud** in your voice channel. When you're in voice, missions, chapter transmissions, twists and finales are read out automatically. It speaks only; it doesn't listen. |
| `/dm-admin voice` / `voice-name` | Admin: turn the spoken voice on or off, and pick one of 11 free voices. |
| `/ask` | Ask the DM anything, like *"what contract do we take for this?"*, *"where can I repair?"* or *"who is Ysolde Pike again?"*. He answers in character using your current mission, your crew's conditions, server canon and a guide to which in-game contracts fit each objective. In the scribe channel, start a message with `?` to ask. Without an AI key it still answers contract questions. |
| `/status view` / `add` / `clear` | Injuries 🩸, ship damage 🚀, warrants ⚖️ and other conditions. Each says how it clears in game ("land and repair", "med bed"), and they carry into missions and stories until cleared. |
| `/lore add` / `list` | **Server canon**: lore your group created. The DM respects it in every story. |
| `/archive list` / `read` / `export` | Finished missions and campaigns, saved as readable stories. Export downloads everything as a file. |
| **Scribe channel** | One player types quick, messy updates while you play, like *"beat 2 vanduul, rj hull shredded, landing nyx 2"*. The DM records injuries, ship damage, locations, journal entries and lore, and replies with a short ✅ summary. No commands needed. Mission report notes are read the same way. |
| `/dm-admin scribe-channel` | Admin: pick the scribe channel. |
| 🛑 Stops on the way | Every mission rolls a **d20 for the road**: 1–4 means two stops (trouble at the first), 5–19 means one stop, 20 means a clean run. A ship carrying damage or a hurt crew member **forces** a stop. Each stop is a real kind of place in that system (a derelict outpost on Bloom, a Citizens for Prosperity holdout on Monox, an abandoned Keeger Belt station…). It has a reason (the AI makes it vivid and story-tied) and something to do there: clear it, make camp, eat and drink, sleep in shifts, patch the hull. |
| `/roll` | Roll dice for the story (`d20`, `2d6+1`…). A d20 also gets a verdict: natural 20, success, success at a cost, failure, natural 1. |
| 🎲 Reroll / 🗑️ Scrap / `/mission-cancel` | Don't like a mission? **Reroll** replaces it with a new one (same crew and type). **Scrap** or `/mission-cancel` throws it away. Either way it's fully rolled back: its new NPCs, names, NPC links, title and "took the job" journal lines are removed, as if it never happened. |
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

## DM Link: connect your game (optional)

DM Link is a small companion app each player runs on their own PC while playing. It reads Star Citizen's
`Game.log` (read-only, the same way Stelliverse and other companion tools do; it never touches the game) and posts
story events to a **game feed** channel. The bot records them on that player's character automatically:

| In game | What the DM records |
|---|---|
| Contract accepted / shared / completed / withdrawn | Journal and mission field log. Taking the mission's **shared contract** is ticked off automatically. |
| Objective complete | Mission field log |
| Injury detected (body part, tier) | 🩸 an injury condition on `/status` |
| Med bed surgery | Clears the injuries it treated |
| CrimeStat increased / fined | ⚖️ a CrimeStat condition (raised count) / journal |
| Downed (emergency services called) | Journal, with a nudge to roleplay the imprint echo |
| Location, quantum arrival, ship boarded | Your character's location and ship, in readable names (e.g. "Rest stop at Bloom (Pyro III) low orbit") |
| aUEC awarded | Added up into one line, not 100 pings |

**Setup**
1. Admin: `/dm-admin game-feed #game-feed` (the bot needs **Manage Webhooks** there; the invite link in the bot's
   window includes it). **Message Content Intent** must be on in the developer portal.
2. Each player: `/link` gives a personal code.
3. Each player double-clicks **`link.bat`** (needs Node.js), pastes the code, and leaves the window open while
   playing. It finds `Game.log` automatically or asks where Star Citizen is installed.

Only the events above are sent, never the raw log. The code is personal: anyone holding it could post fake events as
you. Re-run `/dm-admin game-feed` to reset everyone's codes.

## Picking an AI model (OpenRouter)

`OPENROUTER_MODEL=openrouter/auto` lets OpenRouter choose, but it sometimes picks a "thinking" model that returns
nothing, and the writing style changes from call to call. For reliable stories, pick one model:

1. Go to https://openrouter.ai/models and search for a model (Claude Sonnet is a strong, affordable storyteller).
2. Copy its **ID** exactly as shown on its page (it looks like `provider/model-name`).
3. In `.env`, set `OPENROUTER_MODEL=` to that ID and restart the bot.

If the bot window shows `[ai] OpenRouter gave an empty answer (model …)`, the bot retries automatically; if it says
`Still empty`, switch to a different model. You can also list backups with `OPENROUTER_FALLBACK_MODELS=` (comma-separated
model IDs); OpenRouter tries them when the main model fails. When the AI doesn't answer, the bot uses its built-in text,
which is shorter and more generic, but still includes your character's description.

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

## Running smoothly

- **If the AI keeps failing**, the bot stops asking it for 10 minutes after 3 failures in a row (an hour if the key is
  rejected) and uses the built-in storyteller straight away, so nobody waits minutes for an empty answer. The bot window
  says when this happens, and `/dm-help` shows it. Fix the model (see *Picking an AI model*) and it picks up again.
- **Lighter AI prompts**: each task only sends the lore it needs (scribe notes send none), so calls are cheaper and
  faster, and smaller models follow the instructions better.
- **Scribe bursts** are read together: messages typed within 5 seconds of each other become one AI call. ✍️ means
  "got it", then ✅ (recorded), 👍 (nothing to record), ❓ (unknown name) or 📝 (saved as notes; the AI couldn't read it).
- **Daily backups** of your data go to `data/backups` (the last 7 days are kept). To restore one, stop the bot and copy
  it over `data/db.json`.
- **Faster start**: `start.bat` only reinstalls after an update and only re-registers commands when they change. If
  commands ever go missing in Discord, run `npm run deploy -- --force`.
- **Double clicks are safe**: if two people press *Mission complete* (or *Reroll*, *Next job*) at once, it only happens once.

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
