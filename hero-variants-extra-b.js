/* A cut poster and three vertical printing belts. */
(() => {
  const fragmentCache = new Map();
  const ease = value => value * value * (3 - 2 * value);
  const clamp = value => Math.max(0, Math.min(1, value));

  function fragmentPlate(width, height, colors) {
    const key = `${width}/${height}/${colors.white}/${colors.blue}`;
    if (fragmentCache.has(key)) return fragmentCache.get(key);
    const plate = document.createElement('canvas');
    const ratio = 2;
    plate.width = Math.ceil(width * ratio);
    plate.height = Math.ceil(height * ratio);
    const pen = plate.getContext('2d');
    pen.scale(ratio, ratio);
    pen.font = '800 100px Inter';
    pen.textAlign = 'left';
    pen.textBaseline = 'alphabetic';
    const inset = 8, gap = 12;
    const topHeight = height * .43 - inset;
    const lines = [
      {word:'CEO', y:inset, height:topHeight, color:colors.white},
      {word:'MENTALITY', y:topHeight + inset + gap, height:height - topHeight - inset * 2 - gap, color:colors.blue}
    ];
    lines.forEach(line => {
      const metrics = pen.measureText(line.word);
      const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      pen.save();
      pen.translate(inset, line.y);
      pen.scale((width - inset * 2) / inkWidth, line.height / inkHeight);
      pen.fillStyle = line.color;
      pen.fillText(line.word, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
      pen.restore();
    });
    fragmentCache.clear();
    fragmentCache.set(key, plate);
    return plate;
  }

  // A deliberate travelling cut opens the poster into offset strips, then
  // closes in the same order. Long assembled holds keep the wordmark legible.
  function drawFragments(ctx, width, height, time, colors) {
    const plate = fragmentPlate(width, height, colors);
    const clock = time % 9.6;
    const strips = 12;
    const stripHeight = height / strips;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    for (let strip = 0; strip < strips; strip++) {
      const delay = strip * .075;
      const open = ease(clamp((clock - 1.4 - delay) / 1.25));
      const close = ease(clamp((clock - 5.3 - delay) / 1.4));
      const displacement = open - close;
      const direction = strip % 2 ? -1 : 1;
      const dx = direction * displacement * width * (.13 + (strip % 3) * .035);
      const gap = displacement * 3;
      const y = strip * stripHeight;
      // Wrapping each slice keeps all of the original ink within the frame.
      for (const shift of [-width, 0, width]) {
        ctx.drawImage(plate, 0, y * 2, width * 2, stripHeight * 2,
          dx + shift, y + gap / 2, width, stripHeight - gap);
      }
    }
    ctx.restore();
  }

  function drawColumns(ctx, width, height, time, colors) {
    const word = 'CEOMENTALITY';
    const margin = 7, gap = 8;
    const weights = [0, 1, 2].map(index => (index === 1 ? 1.25 : 1) * Math.exp(Math.sin(time * .32 - index * 1.7) * .28));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const usableWidth = width - margin * 2 - gap * 2;
    const lineLength = Math.max(480, height * .97);
    const repeat = lineLength + 28;
    ctx.save();
    ctx.font = '800 100px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(word);
    const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    let left = margin;
    weights.forEach((weight, column) => {
      const columnWidth = usableWidth * weight / total;
      const direction = column % 2 === 0 ? 1 : -1;
      const displacement = time * (column === 1 ? 41 : 31) * direction + column * lineLength * .26;
      const offset = ((displacement % repeat) + repeat) % repeat;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, 0, columnWidth, height);
      ctx.clip();
      if (column === 1) {
        ctx.fillStyle = colors.blue;
        ctx.fillRect(left, 0, columnWidth, height);
      }
      ctx.fillStyle = colors.white;
      const padding = column === 1 ? 6 : 0;
      for (let row = -2; row <= Math.ceil(height / repeat) + 1; row++) {
        ctx.save();
        ctx.translate(left + columnWidth - padding, row * repeat + offset);
        ctx.rotate(Math.PI / 2);
        ctx.scale(lineLength / inkWidth, (columnWidth - padding * 2) / inkHeight);
        ctx.fillText(word, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
        ctx.restore();
      }
      ctx.restore();
      left += columnWidth + gap;
    });
    ctx.restore();
  }

  window.CEO_HERO_STUDIES = {
    ...(window.CEO_HERO_STUDIES || {}),
    6: drawFragments,
    7: drawColumns
  };
})();
