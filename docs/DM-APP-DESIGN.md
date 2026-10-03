# Star Citizen Companion DM — Design

A personal Game Master for Star Citizen. It knows the lore (`/lore`), tracks what each player has done,
writes linked stories you can actually play and roleplay in the game, and builds them up into a
campaign with a real ending.

## Goals (from the brief)

1. **Fun and rewarding things to do in game.** Every story beat turns into concrete in-game objectives.
2. **Stories link together.** Origin story → personal arcs → crew arcs → campaign finale. Each new story is written from
   what already happened (stored history), not from scratch.
3. **Character creation flow.** The player gives an origin seed. The DM suggests **name options** (lore-appropriate examples)
   and the player picks one or types their own. The DM writes the origin story. **Everything is saved.**
4. **Stories build to an end goal.** Each campaign has a defined finale and acts that lead to it.
5. **Roleplay first.** Scenes, NPC voices and dialogue prompts the group can act out in game.
6. **Link roleplayers together.** Characters' stories cross: shared contacts, rival factions, joint missions.
7. **Link into the game** as accurately as possible: know where the player is, what they did, and what's currently live.

## Core concepts (data model)

```
Player            – a real person (Discord/RSI handle)
Character         – name, origin, background, faction ties, reputation, traits, home system,
                    ship(s), goals, secrets, relationships[], journal[]
Campaign          – title, end goal, acts[], participating characters, status
Act / Chapter     – a narrative beat with objectives[] and possible outcomes (branches)
Objective         – an in-game, checkable task: type (haul, bounty, FPS clear, visit, mine,
                    salvage, deliver, RP scene), location, target/quantity, reward (story + in-game)
Event (journal)   – what actually happened: from player check-in or a game-log parse
NPC               – recurring characters the DM invents (contacts, rivals, patrons), persistent
LoreRef           – which canon threads (lore/05-dm-hooks.md) a story is tied to
```

Everything persists in a database, so the DM can always answer "what has happened so far" and "what threads are open".

## Main flows

### 1. Character creation
1. Player gives a short seed: "ex-Hurston miner who owes money", "Tevarin smuggler", or nothing (DM proposes options).
2. The DM asks about background: system of birth, citizen or civilian, a faction they lean toward, a past wound or secret.
3. **Name step.** The DM offers 5–8 names that fit the background (for example Tevarin-styled names for Tevarin heritage, Terran
   names for a Terra-born noble, gang nicknames for a Pyro outlaw). Picking a name or typing your own both work.
4. The DM writes the **origin story**. Its facts are taken from canon (`/lore`) and it leaves 2–3 **hooks** (a debt, an enemy, a lost
   person) that later stories pull on.
5. The character is saved.

### 2. Story generation (linked)
Inputs to the generator, every time:
- Character sheet(s) and journal (what happened before)
- Open hooks and NPCs already introduced
- Campaign end goal and current act
- **Current game state**: live patch content and what's playable, the player's location, recent activity
- Canon lore and open official threads

Output: the next **chapter**, with an in-character briefing (narration plus NPC dialogue), 1–4 in-game objectives, RP scene prompts,
branching outcomes, and rewards (story reveals, new contacts, plus suggested in-game rewards like gear to buy or loot targets).

### 3. Progress and outcome
The player reports completion (or the game link detects it). The DM records the event, picks the branch, updates relationships, and
writes the next chapter. At the final act it writes the **finale** and an epilogue that becomes part of the character's permanent history.

### 4. Linking roleplayers
- Crew campaigns: several characters, one end goal, roles split by career (pilot, hauler, marine, medic, engineer).
- **Crossovers**: the DM looks for overlaps between characters (same origin system, opposing factions, shared NPC) and proposes
  joint scenes: "Your contact in Levski knows *their* missing brother."
- Rivalries are allowed: one player's bounty can be another player's character, if both opt in.
- A shared **world log**, so a group or org's actions shape the story everyone sees.

## Linking into the game: what's actually possible

Star Citizen has **no official live game API**. Realistic data sources:

| Source | What it gives | Notes |
|---|---|---|
| **Game.log** (local client log file) | Location and zone changes, deaths and kills, some contract and notification events, the server being joined | The best "what actually happened" source. Needs a small desktop companion that watches the file. Read-only. Log formats change between patches. |
| **Star Citizen Wiki API** (api.star-citizen.wiki) | Ships, items, missions, Galactapedia, current-patch data | Keeps "what exists in game" accurate. |
| **RSI public profile / org pages** | Handle, org membership | Links a character to a real player and org. |
| **Player check-ins** | "Done: delivered 32 SCU of medical supplies to Levski" plus a screenshot | Always works. A fallback when there's no log watcher. |
| **Patch / lore research** | Current events and live arcs | Refreshed each patch into `/lore/04-live-story-arcs.md`. |

## Proposed architecture (first cut)

- **Front end:** web app (and/or a **Discord bot**: RP groups usually live in Discord, which makes linking roleplayers easy).
- **Back end:** a small Node/TypeScript server that holds the database (SQLite to start, Postgres later) and calls the
  **Claude API** for the DM's writing. The lore and character memory go in as context. Use structured outputs for chapters, objectives and name lists.
- **Optional desktop companion:** a Game.log watcher that posts events to the back end.
- **OBS overlay:** reuses this repo's existing widget pattern to show "Current mission / chapter" on stream.

## Open questions for the owner

1. Where should players use it: **web app, Discord bot, or both**?
2. Single player first, or **multiplayer/org from day one**?
3. Is the **Game.log watcher** wanted (it needs a small app on each player's PC)?
4. Which AI back end and key (Claude API) will run the DM?
