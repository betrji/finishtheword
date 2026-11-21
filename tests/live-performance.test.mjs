import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mock} from 'node:test';
const require = createRequire(import.meta.url);
Module._extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2023}}).outputText, file);
const game = require('../lib/game.ts'), {wordTurnId} = require('../lib/word-submission.ts');
const {createTypingChannel, PREVIEW_INTERVAL} = require('../lib/live-typing.ts');
const {ArenaRequests} = require('../lib/arena-requests.ts');
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync('drizzle/0000_majestic_leader.sql', 'utf8'));
const binding = {prepare(sql) {const query = args => ({async run() {return {meta: {changes: Number(db.prepare(sql).run(...args).changes)}}}, async first() {return db.prepare(sql).get(...args)}}); return {...query([]), bind(...args) {return query(args)}}}};
const originalLoad = Module._load;
Module._load = function(id, ...args) {if (id === 'cloudflare:workers') return {env: {DB: binding}}; return originalLoad.call(this, id, ...args)};
const {POST: typing} = require('../app/api/arena/typing/route.ts'), {POST: arena} = require('../app/api/arena/route.ts'), {POST: social} = require('../app/api/social/route.ts'); Module._load = originalLoad;
const players = Array.from({length: 5}, (_, i) => ({id: crypto.randomUUID(), name: 'Player ' + i, seen: Date.now()}));
const a = players[0].id, b = players[1].id, stranger = crypto.randomUUID(), writer = crypto.randomUUID();
const save = state => db.prepare("INSERT INTO arena(id,revision,data) VALUES('lobby',0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=arena.revision+1").run(JSON.stringify(state));
const lobby = () => db.prepare("SELECT revision,data FROM arena WHERE id='lobby'").get();
const request = (handler, id, body, headers = {}) => handler(new Request('https://test/api/arena', {method: 'POST', headers: {'Content-Type': 'application/json', ...(id ? {'X-Arena-Session': id} : {}), ...headers}, body: JSON.stringify(body)}));
let match, state;
function setup(count = 2) {
  match = game.createGroupMatch(players.slice(0, count)); match.turn = match.players.findIndex(p => p.id === a);
  delete match.letterChoice; match.turnStartsAt = Date.now() - 10; match.deadline = Date.now() + 15000; match.prefix = match.letter = 'a';
  match.connection = {seen: match.players.map(() => Date.now()), used: match.players.map(() => false)};
  state = {leaderboardReset: 1, matches: [match], queue: [], profiles: {}};
  for (const player of players.slice(0, count)) {game.ensureProfile(state, player).lastSeen = Date.now();}
  save(state);
}
const packet = (draft, sequence = 1) => ({matchId: match.id, turnId: wordTurnId(match), ...(draft !== undefined ? {draft, sequence, writer} : {})});
const read = async (id = b, extra = {}) => {const r = await request(typing, id, {...packet(), ...extra}); assert.equal(r.status, 200); return r.json()};
for (const count of [2, 3, 4, 5]) {
  setup(count); const before = lobby();
  assert.equal((await request(typing, a, packet('ap'))).status, 200);
  for (const player of players.slice(1, count)) assert.equal((await read(player.id)).draft, 'ap');
  assert.deepEqual(lobby(), before, 'Typing never rewrites game state, heartbeat, score, or timer');
  await request(typing, a, packet('apple', 3)); await request(typing, a, packet('app', 2)); assert.equal((await read()).draft, 'apple', 'Out-of-order previews cannot replace the newest edit');
  await request(typing, a, packet('', 4)); assert.equal((await read()).draft, '', 'Backspace-to-empty clears the other screen');
  await request(typing, a, packet('SHIT', 5)); assert.equal((await read()).draft, '****');
  assert(!db.prepare('SELECT data FROM arena WHERE id=?').get('typing:' + match.id).data.includes('SHIT'));
  assert.equal((await request(typing, b, packet('fake', 6))).status, 409);
  assert.equal((await request(typing, stranger, packet())).status, 403);
  assert.equal((await request(typing, '', packet())).status, 403);
  assert.equal((await request(typing, a, packet('fake', 6), {cookie: 'arena_player=' + b})).status, 409, 'Cookie identity wins over conflicting header');
  assert.equal((await request(typing, a, packet(), {origin: 'https://evil.test'})).status, 403);
  assert.equal((await read('', {watch: true})).draft, '****', 'Public spectators receive the same censored preview');
  let snapshot = await (await request(arena, b, {action: 'status'})).json(); assert.equal(snapshot.match.drafts[match.turn], '****', 'Already-open older clients still see previews');
  snapshot = await (await request(social, '', {action: 'watch', matchId: match.id})).json(); assert.equal(snapshot.match.drafts[match.turn], '****');
  const previous = packet('late', 99);
  const accepted = await (await request(arena, a, {action: 'word', matchId: match.id, turnId: wordTurnId(match), actionId: crypto.randomUUID(), word: 'apple'})).json();
  assert.equal(accepted.match.words.at(-1).word, 'apple');
  assert.equal((await (await request(typing, a, previous)).json()).draft, null);
  const next = accepted.match; const current = `${next.id}:${next.turn}:${next.turnStartsAt}:`;
  assert.equal((await (await request(typing, b, {matchId: next.id, turnId: current})).json()).draft, null, 'Old letters do not leak into the next turn');
}
setup(); state.matches[0].custom = true; save(state); assert.equal((await request(typing, stranger, {...packet(), watch: true})).status, 403);
state.matches[0].custom = false; state.matches[0].practice = true; save(state); assert.equal((await request(typing, stranger, {...packet(), watch: true})).status, 403);
state.matches[0].practice = false; state.profiles[a].ban = {reason: 'test'}; save(state); assert.equal((await request(typing, a, packet('ap'))).status, 403);
setup(); match.deadline = Date.now() - 1; save(state); assert.equal((await request(typing, a, packet('ap'))).status, 409);
setup(); match.reconnect = {player: 1, startedAt: Date.now(), until: Date.now() + 8000, remaining: 5000, choice: false}; save(state); assert.equal((await request(typing, a, packet('ap'))).status, 409);

setup(); for (let i = 0; i < 500; i++) {const id = crypto.randomUUID(); const profile = game.ensureProfile(state, {id, name: 'Rank ' + i, seen: Date.now()}); profile.wins = 1;}
save(state); const full = await (await request(arena, a, {action: 'status'})).json(); const beforePolls = lobby();
let compact; for (let i = 0; i < 8; i++) compact = await (await request(arena, a, {action: 'status', compact: true})).json();
assert.deepEqual(lobby(), beforePolls, 'Routine compact polls are reads, not competing CAS writes');
assert.equal(compact.partial, true); assert.equal(compact.leaderboard, undefined); assert.equal(compact.history, undefined);
assert.deepEqual(compact.match, full.match); assert(JSON.stringify(compact).length < JSON.stringify(full).length / 4);
state = JSON.parse(lobby().data); state.profiles[a].lastSeen -= 2000; save(state); const beforeHeartbeat = lobby().revision;
await request(arena, a, {action: 'status', compact: true}); assert.equal(lobby().revision, beforeHeartbeat + 1, 'Heartbeat still commits within the existing reconnect allowance');
state = JSON.parse(lobby().data); match = state.matches[0]; match.deadline = Date.now() - 1; save(state);
const timed = await (await request(arena, a, {action: 'status', compact: true})).json(); assert.equal(timed.match.hearts[match.turn], 1, 'Due clocks still progress immediately on a compact poll');
await request(arena, a, {action: 'leave'}); const result = await (await request(arena, b, {action: 'status', compact: true})).json(); assert.equal(result.partial, false); assert(result.profile); assert(result.history.length); assert(result.match.ratingChanges, 'Results include final ratings and history');

// A slow/aborted poll must not delay an action, even if fetch ignores cancellation.
const lane = new ArenaRequests(); let releasePoll, pollSignal, releaseWord; const order = [];
const poll = lane.run('status', signal => {pollSignal = signal; return new Promise(resolve => {releasePoll = resolve})});
const action = lane.run('word', async () => {order.push('word'); await new Promise(resolve => {releaseWord = resolve}); return 'word'});
await Promise.resolve(); assert.deepEqual(order, ['word']); assert(pollSignal.aborted);
assert.equal(await lane.run('status', async () => 'bad'), null);
const leave = lane.run('leave', async () => {order.push('leave'); return 'leave'});
await Promise.resolve(); assert.deepEqual(order, ['word']); releaseWord(); assert.equal(await action, 'word'); assert.equal(await leave, 'leave');
releasePoll('stale'); assert.equal(await poll, null); assert.equal(await lane.run('status', async () => 'fresh'), 'fresh');

// Deterministic transport latency/backpressure tests, without any live test events.
mock.timers.enable({apis: ['Date', 'setTimeout'], now: 100000});
const drain = async () => {for (let i = 0; i < 12; i++) await Promise.resolve()};
const writes = []; let resolveWrite; const previews = [];
const channel = createTypingChannel({matchId: 'game', turnId: 'turn', writer: 'writer',
  send(packet) {writes.push(packet); return new Promise(resolve => {resolveWrite = resolve})}, receive: preview => previews.push(preview)});
channel.edit('a'); assert.equal(writes.length, 1, 'First letter leaves immediately, without waiting for a status poll');
channel.edit('ap'); channel.edit('app'); channel.edit('appl'); channel.edit('apple'); assert.equal(writes.length, 1);
mock.timers.tick(200); resolveWrite({turnId: 'turn', draft: null}); await drain(); mock.timers.tick(0); await drain();
assert.equal(writes.length, 2); assert.equal(writes[1].draft, 'apple', 'A slow connection sends the newest draft, not queued intermediate letters');
channel.stop(); resolveWrite({turnId: 'turn', draft: 'stale'}); await drain(); assert(!previews.some(p => p.draft === 'stale'));
let visible = true, reads = 0; const received = [];
const observer = createTypingChannel({matchId: 'game', turnId: 'current', visible: () => visible,
  async send() {reads++; return {turnId: reads === 1 ? 'previous' : 'current', draft: 'apple'}}, receive: p => received.push(p)});
observer.watch(); await drain(); assert.equal(received.length, 0, 'A response for an earlier turn is discarded');
mock.timers.tick(PREVIEW_INTERVAL); await drain(); assert.equal(received[0].draft, 'apple');
visible = false; const oldReads = reads; mock.timers.tick(PREVIEW_INTERVAL); await drain(); assert.equal(reads, oldReads);
observer.stop(); mock.timers.tick(2000); await drain(); assert.equal(reads, oldReads); mock.timers.reset();
console.log(`PASS: 2–5 player typing, ordering/backspace/censoring, privacy/bans, legacy snapshots, stale turns, unchanged timers/results, read-only polls, priority actions, latest-only transport and visibility cleanup. Active snapshot: ${JSON.stringify(full).length} → ${JSON.stringify(compact).length} bytes with 500 ranked profiles.`);
