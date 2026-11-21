# Finish the Word — Arena

A responsive 2D word duel built with React/Vinext and Cloudflare D1. Real players enter a shared queue and are paired randomly. Clients poll every 250 milliseconds; server state controls turns, deadlines and results. Practice is an explicitly labeled bot mode with Easy, Normal and Hard levels. Easy uses common words and longer thinking time; Normal is quicker; Hard uses broader vocabulary and prioritizes difficult endings. Drafts are synchronized for the active human player, guarded by match and turn deadline. Bots reveal their draft gradually; their full planned answer is never sent to the client.

## Rules
Turns start at 15 seconds and shorten by one second per two completed turns, with a five-second floor. Two hearts and five dictionary misses per turn. Every heart loss emits a unique explosion event; play pauses for 1.4 seconds before the next full timed turn. Every new turn has a 25% chance of a two-letter prompt from a curated prefix list with at least five unused dictionary entries. Both human validation and bots follow the full prefix. No repeated words in a match. Each accepted word sets the next starting letter. Dictionary exhaustion or timeout loses a heart. Forfeit awards the opponent the match. Disconnected players lose turns when the server next processes a request. Queue entries expire without a heartbeat after 12 seconds.

## Battle presentation
Layered CSS explosions originate at the affected player: fireballs, expanding rings, smoke, debris and camera shake. Reduced-motion users receive a static impact treatment. The original Web Audio battle score uses a minor-key bass pulse, arpeggio and percussion; its tempo and percussion density increase with shorter rounds. Music has a separate persisted mute toggle, stops after matches and pauses in hidden tabs.

## Audio and keyboard play
Sound defaults on and can be muted using the header control on desktop or mobile. A shared Web Audio context unlocks on a user gesture. Local typing and progressively displayed opponent drafts use a softened switch sound; accepted-word sounds follow shared word-history updates, so both clients hear confirmations once. The input remains focusable and read-only between turns, regains focus after submission or rejection, and duplicate Enter submissions are guarded.

## Avatars
Six colors, three animal shapes and four accessories. Preferences are saved in browser storage and attached to queued players and matches after server-side enum validation. Opponents receive avatar appearance but not private player credentials. Changes apply to the next match.

## Dictionary
462,196 normalized entries from dwyl/english-words and wooorm/dictionaries (Spanish and German stems). Accents are folded, German ß maps to ss, valid Roman numerals from I to MMMCMXCIX are supported. This is an open-list implementation, not the complete Merriam Webster corpus or exact Roblox dictionary. Hunspell affix expansions are not included. See data/LICENSE-* for source licenses. Original source files are included for reproducibility.

## Implementation
One D1 state row uses optimistic compare-and-swap revisions to make queue pairing and match mutations atomic. Anonymous players use a cryptographically random browser session credential sent explicitly with each request, with an HttpOnly cookie fallback. This keeps matches stable when embedded browsers block cookies. Names and words render as React text. Match IDs and client-side controls never authorize actions; the server checks session identity and turn. This single-row design is a small-lobby MVP and should be partitioned into queue/match records for large traffic. This version has no ranked mode, pet economy, accounts or paid purchases.

## Development
Use `npm run dev` through the Sites development workflow. Run `node tests/game.test.mjs` for engine and in-memory SQLite API tests. Run `npm run db:generate` after schema changes and the Sites build helper for deployment. Apply local D1 migrations before local play.

## Access
The initial deployment is owner-private. Other players need access before online matchmaking can pair separate people. Practice can be played immediately. Browser QA was unavailable in the build environment; build and automated logic/API tests were used.

## Daily-first home screen
The homepage embeds Daily Chain in a full-width green game screen. Each daily attempt has a fixed 15-second deadline for 12 words; accepted answers, heart losses, and reconnects never extend it. The shared bomb clock and procedural battle audio accelerate as time runs out. Multiplayer setup appears below in outlined player-count, ranked/casual, host, and join panels. Daily results show elapsed server time and the optional play streak, with social links and a PNG share/download option for Instagram.

### Connection and input responsiveness
Routine Daily Chain status requests are read-only until the deadline expires. User actions supersede background requests, and the countdown/audio run in an isolated component so ten clock updates per second do not rerender the input. Daily input clears immediately on submission while preserving the next draft; failures restore the submitted text only if the field is empty. Daily polling runs every five seconds, live match snapshots every 500 ms, and opponent preview reads every 250 ms, with latest-only draft sends. Connection warnings allow the normal idle polling interval and a slow request, remain quiet when healthy, and show actual offline/sustained delays.
