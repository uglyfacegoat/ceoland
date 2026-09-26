/* Oversized mechanical letter tiles. */
(() => {
  const phrase = 'CEOMENTALITY';
  const smooth = value => value * value * (3 - 2 * value);

  function drawPlates(ctx, width, height, time, colors) {
    const columns = 3, rows = 4;
    const gutter = 4;
    const slotWidth = (width - gutter * (columns + 1)) / columns;
    const slotHeight = (height - gutter * (rows + 1)) / rows;
    ctx.save();
    ctx.font = '800 100px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const clock = Math.max(0, time - row * .11 - column * .07) / 3.8;
        const current = Math.floor(clock);
        const phase = clock % 1;
        const progress = smooth(Math.max(0, Math.min(1, (phase - .79) / .21)));
        const direction = column % 2 ? -1 : 1;
        const x = gutter + column * (slotWidth + gutter);
        const y = gutter + row * (slotHeight + gutter);
        const blue = index === 1 || index === 8;
        const paper = index === 6;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, slotWidth, slotHeight);
        ctx.clip();
        ctx.fillStyle = blue ? colors.blue : paper ? colors.white : colors.ink;
        ctx.fillRect(x, y, slotWidth, slotHeight);
        ctx.fillStyle = paper ? colors.ink : colors.white;
        for (let next = 0; next < 2; next++) {
          const letter = phrase[(index + current + next) % phrase.length];
          const metrics = ctx.measureText(letter);
          const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
          const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
          const scaleX = (slotWidth - 16) / Math.max(inkWidth, 67);
          const scaleY = (slotHeight - 22) / inkHeight;
          ctx.save();
          ctx.translate(x + (slotWidth - inkWidth * scaleX) / 2,
            y + 11 + (next - progress) * (slotHeight + gutter) * direction);
          ctx.scale(scaleX, scaleY);
          ctx.fillText(letter, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
          ctx.restore();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  window.CEO_HERO_STUDIES = {...(window.CEO_HERO_STUDIES || {}), 8:drawPlates};
})();
