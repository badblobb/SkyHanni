// Renders the ETOH "tower profile" card. Ported from jtoh.pro (src/gens/etoh.ts),
// minus the database-backed leaderboard ranks and per-account backgrounds.
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import Color from 'color';
import { fileURLToPath } from 'node:url';
import { centerText, colorText, drawIconWithText, drawRoundedRect, drawRoundedRectV2, roundedRectPath } from './draw.js';

const asset = (f) => fileURLToPath(new URL(`../assets/${f}`, import.meta.url));
GlobalFonts.registerFromPath(asset('Poppins-Regular.ttf'), 'Poppins');
GlobalFonts.registerFromPath(asset('Twemoji.ttf'), 'Twemoji');
GlobalFonts.registerFromPath(asset('MaterialSymbolsRounded.woff2'), 'MaterialSymbolsRounded');

const W = 700;
const H = 300;
const BG = '#2e2e2e';
const fmt = new Intl.NumberFormat('en-US');
const darken = (c, n) => Color(c).darken(n).hex();

const defaultAvatar = await loadImage(asset('default-roblox-profile.png'));
const verifiedLogo = await loadImage(asset('roblox-verified.svg'));

function base() {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG;
    drawRoundedRect(ctx, 0, 0, W, H, 30);
    return { canvas, ctx };
}

function messageCard(lines, requested) {
    const { canvas, ctx } = base();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (requested) {
        ctx.fillStyle = '#6b6b6b';
        ctx.font = 'italic 20px Poppins';
        ctx.fillText(requested, W / 2, H / 2 - 105);
    }
    ctx.fillStyle = '#ff7e7e';
    ctx.font = '30px Poppins';
    ctx.fillText(lines[0], W / 2, H / 2 - 45);
    ctx.fillStyle = 'white';
    ctx.font = '25px Poppins';
    ctx.fillText(lines[1], W / 2, H / 2 - 5);
    if (lines[2]) {
        ctx.fillStyle = '#bdbdbd';
        ctx.font = 'italic 18px Poppins';
        ctx.fillText(lines[2], W / 2, H / 2 + 35);
    }
    ctx.fillStyle = '#a8a8a8';
    ctx.font = 'bold italic 20px Poppins';
    ctx.textAlign = 'left';
    const credit = 'Stats by TowerStats.com';
    ctx.fillText(credit, centerText(canvas, ctx, credit), H / 2 + 100);
    return canvas.toBuffer('image/png');
}

export function notFoundCard(requested) {
    const shown = requested.startsWith('!') ? `${requested.slice(1)} (ID)` : requested;
    return messageCard(
        ['The requested user was not found!', 'Please check the username or user id.', 'Note: User ids should start with an exclamation mark, such as "!124".'],
        `Requested user: ${shown}`
    );
}

export function errorCard(user) {
    const { canvas, ctx } = base();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 25px Poppins, Twemoji';
    ctx.fillText(user.displayName, 130, 55);
    ctx.fillStyle = '#bdbdbd';
    ctx.font = '20px Poppins';
    ctx.fillText(`@${user.name}`, 130, 85);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7e7e';
    ctx.font = '30px Poppins';
    ctx.fillText("Failed to load the user's stats.", W / 2, H / 2);
    ctx.fillStyle = 'white';
    ctx.font = '25px Poppins';
    ctx.fillText('Please try again in a minute.', W / 2, H / 2 + 30);
    return canvas.toBuffer('image/png');
}

/**
 * @param user   { id, name, displayName, verified, thumbnail }
 * @param stats  TowerStats ETOH payload
 * @param info   { cachedMsLeft?: number, loadSeconds?: number }
 */
export async function renderProfileCard(user, stats, info = {}) {
    const { canvas, ctx } = base();

    const thumb = user.thumbnail ? await loadImage(user.thumbnail).catch(() => defaultAvatar) : defaultAvatar;

    // Avatar tab
    ctx.fillStyle = darken(BG, 0.4);
    drawRoundedRectV2(ctx, 20, 20, 100, 80, { bottomLeft: 0, bottomRight: 0, topLeft: 50, topRight: 50 });
    ctx.drawImage(thumb, 23, 6, 94, 94);
    ctx.save();
    ctx.fillStyle = darken(BG, 0.4);
    ctx.beginPath();
    ctx.moveTo(20, 100);
    for (let i = 1; i <= 6; i++) ctx.lineTo(20 + (100 / 6) * i, i === 6 ? 100 : i % 2 ? 115 : 105);
    ctx.lineTo(20, 100);
    ctx.fill();
    ctx.restore();

    // Name
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 25px Poppins, Twemoji';
    if (stats.donated_amount > 0) {
        ctx.fillStyle = '#fff88f';
        ctx.fillText(`⭐ ${user.displayName}`, 130, 40);
    } else {
        ctx.fillText(user.displayName, 130, 40);
        if (user.verified) ctx.drawImage(verifiedLogo, 130 + ctx.measureText(user.displayName).width + 8, 20, 25, 25);
    }
    ctx.fillStyle = '#bdbdbd';
    ctx.font = '20px Poppins';
    ctx.fillText(`@${user.name}`, 130, 70);

    // Hardest tower
    ctx.save();
    ctx.font = '18px Poppins';
    ctx.fillStyle = '#bdbdbd';
    if (stats.hardest_tower != null && stats.hardest_abbreviation != null && stats.hardest_raw_difficulty != null) {
        let text = stats.hardest_tower.replaceAll(' ', '_');
        if (text.length > 35) text = stats.hardest_abbreviation;
        const raw = stats.hardest_raw_difficulty.toString();
        const diffColor = stats.difficulty_colors?.[stats.difficulties?.[raw.split('.')[0]]] ?? '#bdbdbd';
        colorText(
            ctx,
            `Hardest tower is ${text} (${raw})`,
            [
                {
                    string: text,
                    color: diffColor,
                    beforeCallback: (x, w) => {
                        ctx.font = 'bold 18px Poppins';
                        ctx.strokeStyle = darken(diffColor, 0.5);
                        ctx.lineWidth = 4;
                        ctx.lineJoin = 'miter';
                        ctx.miterLimit = 2;
                        ctx.strokeText(w, x, 98);
                    },
                    afterCallback: () => (ctx.font = '18px Poppins')
                },
                {
                    string: `(${raw})`,
                    color: '#a3a3a3',
                    beforeCallback: () => (ctx.font = 'italic 18px Poppins'),
                    afterCallback: () => (ctx.font = '18px Poppins')
                }
            ],
            130,
            98,
            '#bdbdbd'
        );
    } else {
        ctx.fillText('This user has not completed a tower!', 130, 98);
    }
    ctx.restore();

    // Difficulty progress bar
    if (stats.difficulties && stats.difficulty_colors && stats.difficulty_progress) {
        const length = 660;
        const startY = 245;
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(20, startY, length, 5);
        const order = [];
        for (const [key, name] of Object.entries(stats.difficulties)) {
            if (parseInt(key) > 11) continue;
            order[parseInt(key) - 1] = name;
        }
        const segs = order.filter(Boolean);
        let done = 0;
        let total = 0;
        segs.forEach((difficulty, index) => {
            const color = stats.difficulty_colors[difficulty];
            const [completed, count] = stats.difficulty_progress[difficulty] ?? [0, 0];
            done += completed;
            total += count;
            const pct = count > 0 ? Math.floor((completed / count) * 100) : 0;
            const segW = length / segs.length;
            const startX = (W - length) / 2 + index * segW;
            ctx.fillStyle = darken(color, 0.75);
            ctx.fillRect(startX, startY, segW, 5);
            ctx.fillStyle = color;
            ctx.fillRect(startX, startY, count > 0 ? (completed / count) * segW : 0, 5);

            ctx.textAlign = 'left';
            ctx.font = 'bold 16px Poppins';
            if (Color(color).isDark()) {
                const m = ctx.measureText(`${pct}%`);
                const th = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.2;
                drawRoundedRect(ctx, startX - 4, startY - (6 + th) - 4, m.width + 8, th + 8, 5);
                ctx.globalAlpha = 1;
            }
            ctx.strokeStyle = darken(color, 0.5);
            ctx.lineWidth = 3;
            ctx.lineJoin = 'miter';
            ctx.miterLimit = 2;
            ctx.strokeText(`${pct}%`, startX, startY - 6, 98);
            ctx.fillStyle = color;
            ctx.fillText(`${pct}%`, startX, startY - 6);
            ctx.fillStyle = darken('#bdbdbd', 0.2);
            ctx.font = 'bold 15px Poppins';
            ctx.fillText(`${count - completed}`, startX, startY + 20);
        });

        ctx.save();
        roundedRectPath(ctx, 0, 0, W, H, 30);
        ctx.clip();
        ctx.fillStyle = darken(BG, 0.3);
        drawRoundedRect(ctx, 0, startY + 31, W, 24, 0);
        ctx.fillStyle = '#218f3e';
        drawRoundedRect(ctx, 0, startY + 31, total > 0 ? (done / total) * W : 0, 24, 0);
        ctx.restore();

        const pctAll = stats.total_towers > 0 ? Math.floor((stats.completed_towers / stats.total_towers) * 100) : 0;
        ctx.fillStyle = '#e3e3e3';
        ctx.font = 'bold 15px Poppins';
        ctx.textAlign = 'left';
        ctx.fillText(`${stats.completed_towers} Completed`, 60, startY + 48);
        ctx.textAlign = 'right';
        ctx.fillText(`${stats.total_towers} Total`, 640, startY + 48);
        ctx.textAlign = 'center';
        ctx.fillText(`${pctAll}% Progress`, 680 / 2, startY + 48);
    }

    // Stat blocks
    const label = (icon, text, x, y) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8f8f8';
        ctx.font = 'bold 15px Poppins, Twemoji';
        drawIconWithText(ctx, icon, 18, text, '#f8f8f8', x, y);
        ctx.fillStyle = '#bdbdbd';
    };
    const types = stats.completed_types ?? {};

    label('inventory', 'Completed Towers', 20, 135);
    ctx.fillText(`${types.steeple ?? 0} Steeples, ${types.tower ?? 0} Towers, ${types.citadel ?? 0} Citadels`, 20, 155);

    label('timeline', 'Skill Points', 340, 135);
    const sp = fmt.format(stats.skill_points);
    const spDec = sp.split('.')[1];
    if (!spDec) ctx.fillText(sp, 340, 155);
    else colorText(ctx, sp, [{ string: `.${spDec}`, color: darken('#bdbdbd', 0.2) }], 340, 155, '#bdbdbd');

    label('trophy', 'Total Towers', 475, 135);
    ctx.fillText(`${fmt.format(stats.completed_towers)} / ${fmt.format(stats.total_towers)}`, 475, 155);

    label('map', 'Completed Areas', 20, 185);
    ctx.fillText(`${stats.completed_areas?.length ?? 0} Areas Completed`, 20, 205);

    label('stars', 'Special Completion', 340, 185);
    ctx.fillText(stats.has_sc_completion ? 'Yes' : 'Not yet', 340, 205);

    // Top-right badge
    const credit = 'Stats by TowerStats.com';
    ctx.font = '13px Poppins';
    const cw = ctx.measureText(credit).width;
    ctx.fillStyle = darken('#986cba', 0.2);
    drawRoundedRectV2(ctx, W - (cw + 55), 0, cw + 18, 47, { bottomLeft: 10, bottomRight: 10, topLeft: 0, topRight: 0 });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd54c';
    ctx.fillText(credit, W - (cw + 55) + 9, 30);

    // Timing note
    ctx.fillStyle = '#a8a8a8';
    ctx.font = 'italic 10px Poppins';
    const note = info.cachedMsLeft != null
        ? `Cached (${(info.cachedMsLeft / 1000).toFixed(0)}s left)`
        : `Took ${(info.loadSeconds ?? 0).toFixed(2)}s to load.`;
    ctx.fillText(note, W - (ctx.measureText(note).width + 40), 75);

    return canvas.toBuffer('image/png');
}
