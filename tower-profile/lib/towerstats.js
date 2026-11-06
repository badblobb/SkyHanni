// TowerStats ETOH stats fetch with a small TTL cache.

const TTL = 10 * 60 * 1000;
const cache = new Map(); // id -> { at, data }

export function getCached(id) {
    const hit = cache.get(id);
    if (!hit) return undefined;
    if (Date.now() - hit.at > TTL) {
        cache.delete(id);
        return undefined;
    }
    return { data: hit.data, remainingMs: TTL - (Date.now() - hit.at) };
}

/** Resolves to the stats object, or throws. `base` is overridable for tests. */
export async function fetchEtohStats(id, apiKey, base = process.env.TOWERSTATS_API_URL ?? 'https://api.towerstats.com') {
    if (!apiKey) throw new Error('TOWERSTATS_API_KEY is not set');
    const res = await fetch(`${base}/api/etoh`, {
        method: 'POST',
        headers: { apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error(`TowerStats ${res.status}`);
    const data = await res.json();
    if (data.error !== undefined) throw new Error(`TowerStats: ${data.error}`);
    if (cache.size > 1000) cache.clear();
    cache.set(id, { at: Date.now(), data });
    return data;
}
