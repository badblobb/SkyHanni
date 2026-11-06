import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { errorCard, notFoundCard, renderProfileCard } from './lib/card.js';
import { resolveUser } from './lib/roblox.js';
import { fetchEtohStats, getCached } from './lib/towerstats.js';

// Load .env if present (no dependency needed).
try {
    const env = await readFile(new URL('./.env', import.meta.url), 'utf8');
    for (const line of env.split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
} catch {}

const PORT = Number(process.env.PORT ?? 3000);
const indexHtml = await readFile(fileURLToPath(new URL('./public/index.html', import.meta.url)));

// Tiny per-IP rate limit: 5 profile requests / 10s.
const hits = new Map();
function limited(ip) {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10_000);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > 5;
}

export function buildProfile(rawUser) {
    return (async () => {
        const user = await resolveUser(rawUser).catch(() => undefined);
        if (!user) return { status: 404, png: notFoundCard(String(rawUser).slice(0, 20)) };
        try {
            const cached = getCached(user.id);
            const t0 = Date.now();
            const stats = cached?.data ?? (await fetchEtohStats(user.id, process.env.TOWERSTATS_API_KEY));
            const png = await renderProfileCard(user, stats, {
                cachedMsLeft: cached?.remainingMs,
                loadSeconds: (Date.now() - t0) / 1000
            });
            return { status: 200, png, user };
        } catch (err) {
            console.error(`[profile] ${user.name}:`, err.message);
            return { status: 502, png: errorCard(user) };
        }
    })();
}

export const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method !== 'GET') return res.writeHead(405).end();

    if (url.pathname === '/') {
        return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(indexHtml);
    }

    if (url.pathname === '/api/profile') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? '';
        if (limited(ip)) return res.writeHead(429, { 'Content-Type': 'text/plain' }).end('Too many requests, slow down.');
        const name = url.searchParams.get('user') ?? '';
        if (!name.trim()) return res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing ?user=');
        const { status, png, user } = await buildProfile(name);
        const headers = { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' };
        if (user) headers['Content-Disposition'] = `inline; filename="tower-profile-${encodeURIComponent(user.name)}.png"`;
        return res.writeHead(status, headers).end(png);
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (!process.env.TOWERSTATS_API_KEY) console.warn('Warning: TOWERSTATS_API_KEY is not set; profiles will fail to load.');
    server.listen(PORT, () => console.log(`Tower profile app on http://localhost:${PORT}`));
}
