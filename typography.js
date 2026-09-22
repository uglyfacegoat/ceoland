/* Live typography. Positions and colours come from Figma, not traced pictures. */
(() => {
  const designs = window.CEO_TYPE_OBJECTS;
  const mobile = matchMedia('(max-width: 700px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionDisabled = () => mobile.matches || reduced.matches;
  const objects = [...document.querySelectorAll('[data-type]')];
  const state = new Map();

  function keyframes(kind, glyph, index, config) {
    const amplitude = config.width / 60;
    if (kind === 'loops') {
      // Fit each original ring separately. Glyphs orbit but remain upright.
      const ring = config.glyphs.filter(g => g.color === glyph.color);
      const xs = ring.map(g => g.x), ys = ring.map(g => g.y);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
      const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
      const start = Math.atan2((glyph.y - cy) / ry, (glyph.x - cx) / rx);
      const direction = glyph.color === '#ffffff' ? 1 : -1;
      return Array.from({length: 97}, (_, step) => {
        const theta = start + direction * Math.PI * 2 * step / 96;
        return { transform: `translate(${cx + Math.cos(theta) * rx - glyph.x}px,${cy + Math.sin(theta) * ry - glyph.y}px)` };
      });
    }
    if (kind === 'diamond') {
      const side = index % 2 ? -1 : 1;
      const spread = config.width * (.08 + .05 * Math.sin(index * 1.7) ** 2);
      return [{transform:'translateX(0)',color:glyph.color},{transform:`translateX(${side * spread}px)`,color:index===6?'#0060ff':glyph.color},{transform:'translateX(0)',color:glyph.color}];
    }
    if (kind === 'arrows' || kind === 'chevron') {
      const direction = kind === 'arrows' && glyph.x > config.width / 2 ? -1 : 1;
      return [{transform:'translateX(0)'},{transform:`translateX(${direction * amplitude}px)`},{transform:'translateX(0)'}];
    }
    if (kind === 'seal') {
      return [{transform:'translateY(0)',color:glyph.color},{transform:'translateY(-2px)',color:'#0060ff'},{transform:'translateY(0)',color:glyph.color}];
    }
    if (kind === 'triangle') {
      return [{transform:'translateY(0)',opacity:1},{transform:'translateY(-3px)',opacity:.55},{transform:'translateY(0)',opacity:1}];
    }
    return [{transform:'translateY(0)',color:glyph.color},{transform:'translateY(-2px)',color:'#0060ff'},{transform:'translateY(0)',color:glyph.color}];
  }

  const pointer = {x: 0, y: 0, active: false};
  let frame = 0, lastTime = 0;
  window.addEventListener('pointermove', event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = event.pointerType !== 'touch' && !motionDisabled();
    startInteraction();
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('blur', () => { pointer.active = false; });

  function createFlow(stage, config) {
    const track = document.createElement('div');
    track.className = 'type-flow';
    stage.append(track);
    const particles = [];
    const source = config.glyphs.filter(glyph => glyph.y >= 0 && glyph.y < config.height);
    const count = Math.max(32, source.length);
    const pitch = config.size * 3.2;
    const period = count * pitch;
    const duration = period / 26 * 1000;
    const phrase = 'CEOMENTALITY ';
    const wordSizes = [.78, 1.1, 1.65, .9, 1.35, .85, 1.5];
    // Only two tiles and only letters inside the horizontal overscan area.
    // Roboto Mono has a fixed .6em advance: no per-letter layout measurements.
    for (let copy = -1; copy <= 0; copy++) {
      for (let index = 0; index < count; index++) {
        const phase = index / count * Math.PI * 2;
        let x = -180 + 44 * Math.sin(phase * 3) + 19 * Math.cos(phase * 5);
        const y = index * pitch + copy * period;
        for (let word = 0; x < config.width + 65; word++) {
          const size = config.size * wordSizes[(index * 3 + word * 5) % wordSizes.length];
          const advance = size * .6 + (config.tracking || 0);
          for (const character of phrase) {
            const cx = x + size * .3;
            if (character !== ' ' && cx > -65 && cx < config.width + 65) {
              const a = phase + cx / 105, b = phase * 2 - cx / 67;
              const bend = 22 * Math.sin(a) + 8 * Math.sin(b);
              const slope = 22 / 105 * Math.cos(a) - 8 / 67 * Math.cos(b);
              const cy = y + config.size * 1.1 + bend;
              const node = document.createElement('span');
              node.className = 'flow-letter';
              const sourceColor = source[index % source.length].color;
              const color = (index * 7 + word * 3) % 11 < 2 ? '#0060ff' : config.light && sourceColor === '#ffffff' ? '#171717' : sourceColor;
              const base = `rotate(${Math.atan(slope) * 180 / Math.PI}deg)`;
              node.style.cssText = `position:absolute;left:${x}px;top:${cy - size * .6}px;font-size:${size}px;line-height:1.2;color:${color};transform:${base}`;
              node.textContent = character;
              track.append(node);
              particles.push({node, x: cx, y: cy, dx: 0, dy: 0, base});
            }
            x += advance;
          }
        }
      }
    }
    const animation = track.animate([
      {transform: 'translate3d(0,0,0)'},
      {transform: `translate3d(0,${period}px,0)`}
    ], {duration, iterations: Infinity, easing: 'linear'});
    animation.pause();
    return {track, particles, period, duration, animation};
  }

  function startInteraction() {
    if (frame || document.hidden || motionDisabled()) return;
    if (![...state.values()].some(item => item.flow && item.visible)) return;
    frame = requestAnimationFrame(animateFlow);
  }

  // Continuous scrolling is handled by the browser compositor. JavaScript
  // runs only while the mouse interacts, or displaced letters settle back.
  function animateFlow(time) {
    frame = 0;
    const dt = Math.min((time - (lastTime || time - 16)) / 1000, .04);
    lastTime = time;
    let active = false;
    for (const [object, item] of state) {
      if (!item.flow || !item.visible || document.hidden || motionDisabled()) continue;
      const rect = object.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const {flow, config} = item;
      const sx = rect.width / config.width, sy = rect.height / config.height;
      const offset = (Number(flow.animation.currentTime || 0) % flow.duration) / flow.duration * flow.period;
      const near = pointer.active && pointer.x > rect.left - 110 && pointer.x < rect.right + 110 && pointer.y > rect.top - 110 && pointer.y < rect.bottom + 110;
      active ||= near;
      const ease = 1 - Math.exp(-dt * 10);
      for (const p of flow.particles) {
        const screenY = rect.top + (p.y + offset) * sy;
        const displaced = Math.abs(p.dx) + Math.abs(p.dy) >= .02;
        if (!displaced && (!near || Math.abs(screenY - pointer.y) > 110)) continue;
        const dx = rect.left + p.x * sx - pointer.x;
        const dy = screenY - pointer.y;
        const distance = Math.hypot(dx, dy);
        const force = near && distance < 110 ? 85 * (1 - distance / 110) ** 2 : 0;
        p.dx += ((force ? dx / (distance || 1) * force / sx : 0) - p.dx) * ease;
        p.dy += ((force ? dy / (distance || 1) * force / sy : 0) - p.dy) * ease;
        if (!force && Math.abs(p.dx) + Math.abs(p.dy) < .02) {
          p.node.style.transform = p.base;
          p.dx = p.dy = 0;
        } else {
          active = true;
          p.node.style.transform = `translate(${p.dx}px,${p.dy}px) ${p.base}`;
        }
      }
    }
    if (active) frame = requestAnimationFrame(animateFlow);
    else lastTime = 0;
  }

  function syncPlayback() {
    for (const item of state.values()) {
      if (item.flow && reduced.matches) {
        item.flow.particles.forEach(p => { p.node.style.transform = p.base; p.dx = p.dy = 0; });
      }
      const playing = item.visible && !document.hidden && !motionDisabled();
      for (const animation of item.animations) {
        if (reduced.matches) { animation.pause(); animation.currentTime = 0; }
        else if (playing) animation.play();
        else animation.pause();
      }
    }
    if (pointer.active) startInteraction();
  }

  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => { const item = state.get(entry.target); if (item) item.visible = entry.isIntersecting; });
    syncPlayback();
  }, {threshold: 0.05});

  const sizes = new ResizeObserver(entries => {
    for (const entry of entries) {
      const item = state.get(entry.target);
      if (!item) continue;
      item.stage.style.transform = `scale(${entry.contentRect.width / item.config.width},${entry.contentRect.height / item.config.height})`;
    }
  });

  function build(object) {
    const previous = state.get(object);
    previous?.animations.forEach(animation => animation.cancel());
    const kind = object.dataset.type;
    const variant = object.dataset.variant || (mobile.matches ? 'mobile' : 'desktop');
    if (kind === 'field' && variant !== (mobile.matches ? 'mobile' : 'desktop')) {
      object.replaceChildren();
      state.delete(object);
      return;
    }
    const original = designs[kind][variant];
    const config = kind === 'field' && variant === 'mobile'
      ? {...original, width:302, height:148, light:true}
      : original;
    const stage = document.createElement('div');
    stage.className = 'type-stage';
    stage.style.cssText = `width:${config.width}px;height:${config.height}px;font-family:'${config.font}',monospace;font-weight:${config.weight};font-size:${config.size}px;`;
    object.style.aspectRatio = `${config.width} / ${config.height}`;
    object.dataset.figmaNode = config.nodeId;
    const animations = [];
    if (kind === 'field') {
      const flow = createFlow(stage, config);
      animations.push(flow.animation);
      object.replaceChildren(stage);
      state.set(object, {stage, config, animations, flow, visible: previous?.visible || false});
      const rect = object.getBoundingClientRect();
      stage.style.transform = `scale(${rect.width / config.width},${rect.height / config.height})`;
      return;
    }
    config.glyphs.forEach((glyph, index) => {
      const position = document.createElement('span');
      position.className = 'type-position';
      position.style.cssText = `left:${glyph.x}px;top:${glyph.y}px;color:${glyph.color};`;
      const moving = document.createElement('span');
      moving.className = 'type-glyph';
      moving.textContent = glyph.text;
      position.append(moving);
      stage.append(position);
      const duration = kind === 'loops' ? 24000 : kind === 'field' ? 9000 : kind === 'triangle' ? 5400 : 6500;
      const delay = kind === 'loops' ? 0 : kind === 'field' ? index * 75 : kind === 'diamond' ? Math.abs(6-index)*95 : index * 45;
      const animation = moving.animate(keyframes(kind, glyph, index, config), {
        duration, delay: 800 + delay, iterations: Infinity,
        easing: kind === 'loops' ? 'linear' : 'ease-in-out', fill: 'both'
      });
      animation.pause();
      animations.push(animation);
    });
    object.replaceChildren(stage);
    state.set(object,{stage,config,animations,visible:previous?.visible || false});
    const rect=object.getBoundingClientRect();
    stage.style.transform=`scale(${rect.width/config.width},${rect.height/config.height})`;
  }

  function syncVariants() {
    objects.forEach(build);
    document.querySelectorAll('[data-mobile-src]').forEach(image=>{image.src=mobile.matches?image.dataset.mobileSrc:image.dataset.desktopSrc;});
    syncPlayback();
  }
  syncVariants();
  objects.forEach(object=>{sizes.observe(object);visibility.observe(object);});
  mobile.addEventListener('change',syncVariants);
  reduced.addEventListener('change',syncPlayback);
  document.addEventListener('visibilitychange',syncPlayback);
})();
