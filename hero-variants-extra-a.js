/* Additional hero studies share the same canvas and brand palette. */
(() => {
  const word = 'CEOMENTALITY';
  const tau = Math.PI * 2;
  const wrap = (value, length) => ((value % length) + length) % length;

  // Repeated condensed wordmarks roll over the face of one tall type drum.
  // Their spacing and vertical compression follow the same cylindrical surface.
  function drawDrum(ctx, width, height, time, colors) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    const radius = height * .515;
    const count = 16;
    const step = tau / count;
    const fontSize = radius * step * 1.18;
    const angle = time * .30 + .11;
    ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(word);
    const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const inset = 7;
    for (let band = 0; band < count; band++) {
      const theta = wrap(band * step + angle + Math.PI, tau) - Math.PI;
      if (Math.abs(theta) >= Math.PI / 2) continue;
      const facing = Math.cos(theta);
      const y = height / 2 + Math.sin(theta) * radius;
      ctx.save();
      ctx.translate(width / 2, y);
      ctx.scale((width - inset * 2) / inkWidth, Math.max(.018, facing));
      ctx.globalAlpha = .64 + facing * .36;
      ctx.fillStyle = band % 4 === 1 ? colors.blue : colors.white;
      ctx.fillText(word, -inkWidth / 2 + metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent - inkHeight / 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // Wide, cropped words travel in opposing lanes, like continuous printed belts.
  function drawBelts(ctx, width, height, time, colors) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    const rows = Math.max(3, Math.round(height / 112));
    const pitch = height / rows;
    const fontSize = Math.min(128, Math.max(98, pitch * 1.17));
    ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText(word);
    const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const repeatWidth = metrics.width + fontSize * .3;
    for (let row = 0; row < rows; row++) {
      const y = row * pitch;
      const blueLane = row % 4 === 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, width, pitch - 3);
      ctx.clip();
      ctx.fillStyle = blueLane ? colors.blue : colors.ink;
      ctx.fillRect(0, y, width, pitch - 3);
      ctx.fillStyle = row % 4 === 3 ? colors.blue : colors.white;
      const direction = row % 2 === 0 ? -1 : 1;
      const speed = 38 + (row % 3) * 8;
      const travel = time * speed * direction - row * fontSize * 1.81;
      const start = wrap(travel, repeatWidth) - repeatWidth;
      const baseline = y + (pitch - 3 - inkHeight) / 2 + metrics.actualBoundingBoxAscent;
      for (let x = start; x < width; x += repeatWidth) ctx.fillText(word, x, baseline);
      ctx.restore();
    }
    ctx.restore();
  }

  window.CEO_HERO_STUDIES = {
    ...(window.CEO_HERO_STUDIES || {}),
    4: drawDrum,
    5: drawBelts
  };
})();
