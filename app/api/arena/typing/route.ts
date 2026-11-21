import {env} from 'cloudflare:workers';
import type {Match} from '../../../../lib/game';
import {censorChat} from '../../../../lib/chat-filter';

const headers = {'Cache-Control': 'private, no-store'};
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export async function POST(req: Request) {
  const fail = (error: string, status: number) => Response.json({error}, {status, headers});
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return fail('Same-origin requests only.', 403);
    const input = await req.json() as {matchId?: string; turnId?: string; watch?: boolean; writer?: string; sequence?: number; draft?: string};
    if (!uuid(input.matchId) || typeof input.turnId !== 'string' || input.turnId.length > 180) return fail('Invalid match.', 400);
    const cookie = req.headers.get('cookie')?.match(/(?:^|; )arena_player=([a-f0-9-]+)/)?.[1], token = req.headers.get('X-Arena-Session');
    const me = uuid(cookie) ? cookie : uuid(token) ? token : '';
    const writing = input.draft !== undefined;
    if (writing && (typeof input.draft !== 'string' || input.draft.length > 60 || !uuid(input.writer) || !Number.isSafeInteger(input.sequence) || input.sequence! < 1)) return fail('Invalid preview.', 400);
    const db = env.DB!;
    // Select just this match and authorization flags, not the dictionary, profiles,
    // histories, chat, or rankings. Preview writes never contend on the lobby row.
    const row = await db.prepare(`SELECT revision,
      (SELECT value FROM json_each(arena.data, '$.matches') WHERE json_extract(value, '$.id') = ?) AS match,
      json_extract(data, ?) AS banned, json_extract(data, ?) AS agent
      FROM arena WHERE id = 'lobby'`).bind(input.matchId, `$.profiles."${me}".ban`, `$.profiles."${me}".agent`)
      .first<{revision: number; match: string | null; banned: unknown; agent: unknown}>();
    if (!row?.match) return fail('Match unavailable.', 404);
    const match: Match = JSON.parse(row.match);
    if (row.banned || row.agent) return fail('This profile cannot play.', 403);
    const member = me ? match.players.findIndex(player => player.id === me) : -1;
    const publicWatch = input.watch === true && !writing && !match.custom && !match.practice && match.mode !== 'agents' && !match.players.some(player => player.agent || player.id === 'bot');
    if (member < 0 && !publicWatch) return fail('Join this match first.', 403);
    const turnId = `${match.id}:${match.turn}:${match.turnStartsAt}:${match.letterChoice?.id || ''}`;
    if (match.winner !== null || match.letterChoice || input.turnId !== turnId) return Response.json({turnId, draft: null}, {headers});
    if (writing) {
      const now = Date.now();
      if (member !== match.turn || match.reconnect || now < (match.turnStartsAt || 0) || now >= match.deadline) return fail('Wait for your turn.', 409);
      const data = JSON.stringify({turnId, writer: input.writer, sequence: input.sequence, draft: censorChat(input.draft!), at: now});
      await db.prepare(`INSERT INTO arena(id, revision, data) VALUES(?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, data=excluded.data
        WHERE excluded.revision >= arena.revision AND
        (json_extract(arena.data, '$.writer') <> json_extract(excluded.data, '$.writer') OR
         json_extract(excluded.data, '$.sequence') > json_extract(arena.data, '$.sequence'))`)
        .bind(`typing:${match.id}`, row.revision, data).run();
      return Response.json({turnId, draft: null}, {headers});
    }
    const stored = await db.prepare('SELECT data FROM arena WHERE id=?').bind(`typing:${match.id}`).first<{data: string}>();
    const preview = stored ? JSON.parse(stored.data) as {turnId: string; draft: string} : null;
    return Response.json({turnId, draft: preview?.turnId === turnId ? censorChat(preview.draft) : null}, {headers});
  } catch { return fail('Preview unavailable.', 503); }
}
