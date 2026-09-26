/* Alternate typography lives only inside the original black letter field. */
(async () => {
  const root = document.documentElement;
  const variant = Number(root.dataset.heroVariant || 0);
  if (!variant) return;
  const canvas = document.querySelector('.hero-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 701px)');
  const colors = {ink:'#171717', white:'#ffffff', blue:'#2451b2', gray:'#adadad'};
  const phrase = 'CEOMENTALITY';
  // One design space keeps the letter sizes consistent with the rest of the hero.
  const width = 360;
  let height = 700, time = 0, lastTime = 0, frameId = 0;
  let visible = false, initialized = false, engine, floor;
  let bodies = [], nextLetter = 0, nextDrop = 0, accumulator = 0;
  let filledAt = null, drainingAt = null;
  const glyphs = new Map();
  const random = (min, max) => min + Math.random() * (max - min);

  function loadPhysics() {
    if (window.Matter) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/matter.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  // Derive the collision outline from the actual font. Rendering uses the same
  // glyph and centroid, so narrow I/T and the sloping edges of A/Y keep their shape.
  function makeGlyph(letter, size, color) {
    const key = `${letter}/${size}/${color}`;
    if (glyphs.has(key)) return glyphs.get(key);
    const sprite = document.createElement('canvas');
    const pen = sprite.getContext('2d', {willReadFrequently:true});
    pen.font = `800 ${size}px Inter`;
    const metrics = pen.measureText(letter);
    const padding = 3;
    const w = Math.ceil(metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + padding * 2);
    const h = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + padding * 2);
    sprite.width = w * 2;
    sprite.height = h * 2;
    pen.scale(2, 2);
    pen.font = `800 ${size}px Inter`;
    pen.fillStyle = color;
    pen.fillText(letter, padding + metrics.actualBoundingBoxLeft, padding + metrics.actualBoundingBoxAscent);
    const pixels = pen.getImageData(0, 0, sprite.width, sprite.height).data;
    const points = [];
    for (let y = 0; y < sprite.height; y += 3) {
      let first = -1, last = -1;
      for (let x = 0; x < sprite.width; x++) {
        if (pixels[(y * sprite.width + x) * 4 + 3] > 150) {
          if (first < 0) first = x;
          last = x;
        }
      }
      if (first >= 0) points.push({x:first / 2, y:y / 2}, {x:last / 2, y:y / 2});
    }
    const vertices = Matter.Vertices.hull(points);
    const center = Matter.Vertices.centre(vertices);
    const glyph = {sprite, w, h, vertices, center};
    glyphs.set(key, glyph);
    return glyph;
  }

  function dropLetter(position) {
    const letter = phrase[nextLetter % phrase.length];
    const size = [160, 180, 154, 172, 184][nextLetter % 5];
    const color = [colors.white, colors.blue, colors.white, colors.gray, colors.blue, colors.white][nextLetter % 6];
    const glyph = makeGlyph(letter, size, color);
    const margin = glyph.w * .62;
    const x = position?.x ?? random(margin, width - margin);
    const y = position?.y ?? -glyph.h * .35;
    const body = Matter.Bodies.fromVertices(x, y, glyph.vertices, {
      restitution:.22, friction:.62, frictionStatic:.85, frictionAir:.006,
      density:.002, sleepThreshold:90, label:`hero-${letter}`
    });
    Matter.Body.setAngle(body, position ? random(-.22, .22) : random(-.5, .5));
    if (!position) {
      Matter.Body.setVelocity(body, {x:random(-.9, .9), y:random(1.5, 2.5)});
      Matter.Body.setAngularVelocity(body, random(-.025, .025));
    }
    body.glyph = glyph;
    bodies.push(body);
    Matter.Composite.add(engine.world, body);
    nextLetter++;
  }

  function resetPhysics() {
    if (!engine) engine = Matter.Engine.create({enableSleeping:true, positionIterations:8, velocityIterations:8});
    Matter.Composite.clear(engine.world, false);
    Matter.Engine.clear(engine);
    engine.gravity.y = 1.12;
    bodies = [];
    accumulator = 0;
    nextDrop = time;
    nextLetter = 0;
    filledAt = drainingAt = null;
    const wallOptions = {isStatic:true, friction:.55, restitution:.2};
    floor = Matter.Bodies.rectangle(width / 2, height + 32, width + 128, 64, wallOptions);
    Matter.Composite.add(engine.world, [
      floor,
      Matter.Bodies.rectangle(-32, height / 2 - 200, 64, height + 800, wallOptions),
      Matter.Bodies.rectangle(width + 32, height / 2 - 200, 64, height + 800, wallOptions)
    ]);
    if (reduced.matches) {
      for (let row = 0; row < Math.ceil(height / 105); row++) {
        for (let column = 0; column < 3; column++) dropLetter({x:65 + column * 115, y:height - 75 - row * 145});
      }
      for (let step = 0; step < 220; step++) Matter.Engine.update(engine, 1000 / 60);
    } else {
      dropLetter();
      nextDrop = time + .32;
    }
  }

  function stepPhysics(delta) {
    if (drainingAt !== null) {
      if (time - drainingAt > 2) resetPhysics();
    } else if (filledAt !== null) {
      if (time - filledAt > 2.8) {
        Matter.Composite.remove(engine.world, floor);
        bodies.forEach(body => Matter.Sleeping.set(body, false));
        drainingAt = time;
      }
    } else if (time >= nextDrop) {
      const full = bodies.length > 12 && bodies.some(body => body.position.y < 145 && body.position.y > 0 && body.speed < .3);
      if (full || bodies.length >= 34) filledAt = time;
      else { dropLetter(); nextDrop = time + .32; }
    }
    accumulator += delta;
    while (accumulator >= 1 / 60) {
      Matter.Engine.update(engine, 1000 / 60);
      accumulator -= 1 / 60;
    }
  }

  function drawFallingType() {
    for (const body of bodies) {
      const glyph = body.glyph;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.drawImage(glyph.sprite, -glyph.center.x, -glyph.center.y, glyph.w, glyph.h);
      ctx.restore();
    }
  }

  // Each large line expands while its neighbours compress; the column stays full.
  function drawPress() {
    const words = ['CEO', 'MEN', 'TAL', 'ITY'];
    const weights = words.map((_, i) => Math.exp(Math.sin(time * .62 - i * 1.5) * .94));
    const total = weights.reduce((sum, value) => sum + value, 0);
    const gutter = 9;
    let y = gutter;
    ctx.font = '800 100px Inter';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    words.forEach((word, i) => {
      const slot = (height - gutter * 5) * weights[i] / total;
      const metrics = ctx.measureText(word);
      const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      ctx.save();
      ctx.translate(gutter, y);
      ctx.scale((width - gutter * 2) / inkWidth, slot / inkHeight);
      ctx.fillStyle = i === 1 ? colors.blue : colors.white;
      ctx.fillText(word, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
      ctx.restore();
      y += slot + gutter;
    });
  }

  // A letter matrix with a diagonal blue scan echoes the adjacent barcode.
  function drawScan() {
    const columns = 6;
    const pitchX = width / columns, pitchY = width / 6;
    const rows = Math.ceil(height / pitchY) + 2;
    const scan = (time * 88 + height * .5 + 130) % (height + 260) - 130;
    ctx.font = `800 ${pitchX * .88}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let column = 0; column < columns; column++) {
      const direction = column % 2 ? -1 : 1;
      const travel = time * 19 * direction + column * 11;
      const shift = Math.floor(travel / pitchY);
      const offset = ((travel % pitchY) + pitchY) % pitchY;
      for (let row = -1; row < rows; row++) {
        const y = row * pitchY + offset;
        const distance = Math.abs(y - scan + column * 13);
        const index = ((row - shift) * columns + column) % phrase.length;
        ctx.globalAlpha = distance < 78 ? 1 : .65 + .35 * Math.max(0, 1 - distance / 260);
        ctx.fillStyle = distance < 78 ? colors.blue : colors.white;
        ctx.fillText(phrase[(index + phrase.length) % phrase.length], pitchX * (column + .5), y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    if (!initialized) return;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(0, 0, width, height);
    if (variant === 1) drawFallingType();
    else if (variant === 2) drawPress();
    else if (variant === 3) drawScan();
    else if (window.CEO_HERO_STUDIES?.[variant]) window.CEO_HERO_STUDIES[variant](ctx, width, height, time, colors);
    else drawPress();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    height = rect.height / rect.width * width;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    if (variant === 1) resetPhysics();
    initialized = true;
    draw();
    root.dataset.heroReady = '';
  }

  function tick(now) {
    frameId = 0;
    if (!visible || document.hidden || !desktop.matches || reduced.matches) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
    lastTime = now;
    // Let visitors see the first letters arrive after the intro.
    if (!root.classList.contains('is-loading')) {
      time += delta;
      if (variant === 1) stepPhysics(delta);
    }
    draw();
    frameId = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    lastTime = 0;
    if (visible && !document.hidden && desktop.matches && !reduced.matches) frameId = requestAnimationFrame(tick);
    else draw();
  }

  try {
    await Promise.all([
      document.fonts.load('800 100px Inter'),
      document.fonts.load('700 29px "Roboto Mono"'),
      variant === 1 ? loadPhysics() : Promise.resolve()
    ]);
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold:.01}).observe(canvas);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', () => { if (variant === 1 && initialized) resetPhysics(); sync(); });
    desktop.addEventListener('change', sync);
    resize();
  } catch (error) {
    canvas.style.display = 'none';
    delete root.dataset.heroReady;
    console.warn('Hero typography fallback:', error);
  }
})();
