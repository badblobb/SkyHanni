// Minimal Roblox lookups: username / "!userId" -> user + headshot thumbnail.

const json = { 'Content-Type': 'application/json' };

async function post(url, body) {
    const res = await fetch(url, { method: 'POST', headers: json, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Roblox API ${res.status}`);
    return res.json();
}

export async function resolveUser(input) {
    let name = String(input ?? '')
        .trim()
        .replace(/\s+/g, '')
        .slice(0, 20);
    if (!name) return undefined;

    let user;
    if (name.startsWith('!')) {
        const id = parseInt(name.slice(1), 10);
        if (!Number.isSafeInteger(id) || id <= 0) return undefined;
        user = (await post('https://users.roblox.com/v1/users', { userIds: [id], excludeBannedUsers: false })).data?.[0];
    } else {
        user = (await post('https://users.roblox.com/v1/usernames/users', { usernames: [name], excludeBannedUsers: false }))
            .data?.[0];
    }
    if (!user) return undefined;

    let thumbnail;
    try {
        const res = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=352x352&format=Webp&isCircular=false`
        );
        thumbnail = (await res.json()).data?.[0]?.imageUrl;
    } catch {
        /* fall back to default avatar */
    }

    return {
        id: user.id,
        name: user.name,
        displayName: user.displayName ?? user.name,
        verified: user.hasVerifiedBadge === true,
        thumbnail
    };
}
