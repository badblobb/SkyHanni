// Canvas drawing helpers, ported from jtoh.pro (src/util.ts).

export function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export function drawRoundedRect(ctx, x, y, w, h, r) {
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fill();
}

/** radii: { topLeft, topRight, bottomRight, bottomLeft } */
export function drawRoundedRectV2(ctx, x, y, w, h, radii) {
    const { topLeft, topRight, bottomRight, bottomLeft } = radii;
    ctx.beginPath();
    ctx.moveTo(x + topLeft, y);
    ctx.lineTo(x + w - topRight, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + topRight);
    ctx.lineTo(x + w, y + h - bottomRight);
    ctx.quadraticCurveTo(x + w, y + h, x + w - bottomRight, y + h);
    ctx.lineTo(x + bottomLeft, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bottomLeft);
    ctx.lineTo(x, y + topLeft);
    ctx.quadraticCurveTo(x, y, x + topLeft, y);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws a string where some words get their own colour. Underscores in a word
 * are rendered as spaces (lets a multi-word value be treated as one "word").
 */
export function colorText(ctx, str, colors, x, y, pastColor) {
    const words = str.split(' ');
    words.forEach((word, index) => {
        if (word.includes('.')) {
            const split = word.split('.');
            words[index] = split[0];
            words.splice(index + 1, 0, '.' + split[1]);
        }
    });
    let currentX = x;
    for (let word of words) {
        const thisColor = colors.find((c) => c.string === word);
        if (thisColor) ctx.fillStyle = thisColor.color;
        const prevX = currentX;
        word = word.replaceAll('_', ' ');
        thisColor?.beforeCallback?.(prevX, word, thisColor.color);
        if (word.startsWith('.')) currentX -= ctx.measureText(' ').width;
        ctx.fillText(word, currentX, y);
        ctx.fillStyle = pastColor;
        currentX += ctx.measureText(word + ' ').width;
        thisColor?.afterCallback?.(prevX, word, thisColor.color);
    }
}

/** Draws a Material Symbols icon (by ligature name) followed by text. */
export function drawIconWithText(ctx, iconName, size, text, color, x, y) {
    ctx.save();
    ctx.font = `${size}px MaterialSymbolsRounded`;
    ctx.fillStyle = color;
    ctx.fillText(iconName, x - 2, y + 5);
    ctx.restore();
    ctx.fillText(text, x - 2 + size + 3, y);
}

export function centerText(canvas, ctx, str) {
    return (canvas.width - ctx.measureText(str).width) / 2;
}
