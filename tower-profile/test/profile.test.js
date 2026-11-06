import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

process.env.TOWERSTATS_API_KEY = 'test-key';

const names = ['Easy', 'Medium', 'Hard', 'Difficult', 'Challenging', 'Intense', 'Remorseless', 'Insane', 'Extreme', 'Terrifying', 'Catastrophic'];
const colors = ['#76f44c', '#ffff00', '#fe7c00', '#ff3232', '#bf00ff', '#1e00ff', '#00dcff', '#ffffff', '#222222', '#800080', '#ff0000'];
const stats = {
    id: 1, username: 'Tester', completed_towers: 120, total_towers: 260, skill_points: 12345.67,
    donated_amount: 0, has_sc_completion: false, hardest_tower: 'Tower of Examples', hardest_abbreviation: 'ToE',
    hardest_raw_difficulty: 7.45, completed_areas: ['a', 'b', 'c'], completed_types: { steeple: 30, tower: 80, citadel: 10 },
    difficulties: Object.fromEntries(names.map((n, i) => [String(i + 1), n])),
    difficulty_colors: Object.fromEntries(names.map((n, i) => [n, colors[i]])),
    difficulty_progress: Object.fromEntries(names.map((n, i) => [n, [Math.max(0, 20 - i * 2), 24]]))
};

let seenKey, towerCalls = 0;
globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
    if (u.includes('users.roblox.com')) {
        const body = JSON.parse(opts.body);
        const missing = body.usernames?.[0] === 'nobody';
        return ok({ data: missing ? [] : [{ id: 1, name: 'Tester', displayName: 'Tester 🗼', hasVerifiedBadge: true }] });
    }
    if (u.includes('thumbnails.roblox.com')) return ok({ data: [{ imageUrl: 'http://127.0.0.1:1/x.webp' }] });
    if (u.includes('/api/etoh')) { towerCalls++; seenKey = opts.headers.apiKey; return ok(stats); }
    throw new Error('unexpected fetch ' + u);
};

const { buildProfile } = await import('../server.js');

test('renders a PNG profile and sends the API key', async () => {
    const r = await buildProfile('Tester');
    assert.equal(r.status, 200);
    assert.deepEqual([...r.png.subarray(1, 4)], [0x50, 0x4e, 0x47]);
    assert.equal(seenKey, 'test-key');
    if (process.env.SAVE_PNG) writeFileSync(process.env.SAVE_PNG, r.png);
});

test('second request for same user is served from cache', async () => {
    const before = towerCalls;
    const r = await buildProfile('Tester');
    assert.equal(r.status, 200);
    assert.equal(towerCalls, before);
});

test('unknown user gives a 404 image', async () => {
    const r = await buildProfile('nobody');
    assert.equal(r.status, 404);
    assert.deepEqual([...r.png.subarray(1, 4)], [0x50, 0x4e, 0x47]);
});
