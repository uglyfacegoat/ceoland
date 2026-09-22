/* Figma loading screen; only critical first-screen assets gate the reveal. */
(() => {
  const root = document.documentElement;
  const screen = document.querySelector('.loading-screen');
  if (!root.classList.contains('is-loading')) { screen?.remove(); return; }
  const title = screen.querySelector('.loading-wordmark');
  const letters = screen.querySelector('.loading-letters');
  const progress = screen.querySelector('.loading-progress');
  const caption = screen.querySelector('.loading-caption');
  const logo = document.querySelector('.identity .wordmark');
  const content = [...document.querySelectorAll('body > main, body > footer')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = [];
  let finished = false;
  content.forEach(node => { node.inert = true; });
  function cleanup() {
    if (finished) return;
    finished = true;
    clearTimeout(window.ceoLoaderTimeout);
    root.classList.remove('is-loading', 'is-revealing', 'is-docking');
    content.forEach(node => { node.inert = false; });
    animations.forEach(animation => animation.cancel());
    screen.remove();
    window.dispatchEvent(new Event('ceo:loaded'));
  }
  window.addEventListener('ceo:loader-timeout', cleanup, {once:true});
  window.addEventListener('pagehide', cleanup, {once:true});
  window.addEventListener('resize', () => { if (root.classList.contains('is-revealing')) cleanup(); });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const imageReady = image => image?.decode ? image.decode().catch(() => {}) : Promise.resolve();
  const fontReady = (font, text) => document.fonts?.load(font, text).catch(() => {}) || Promise.resolve();
  const identityReady = fontReady('800 32px Inter', 'CEOMENTALITY').then(() => {
    if (finished) return;
    const natural = letters.getBoundingClientRect().width;
    if (natural) {
      const size = parseFloat(getComputedStyle(title).fontSize);
      title.style.fontSize = `${size * title.getBoundingClientRect().width / natural}px`;
    }
  });
  const tasks = [identityReady, fontReady('700 14px "Roboto Mono"', 'CEOMENTALITY'), imageReady(logo)];
  let done = 0;
  function update() {
    const value = Math.round(done / tasks.length * 100);
    progress.style.transform = `scaleX(${value / 100})`;
    caption.textContent = `ЗАГРУЗКА / ${String(value).padStart(3, '0')}`;
  }
  Promise.all([Promise.all(tasks.map(task => task.finally(() => { done++; update(); }))), wait(reduced.matches ? 0 : 650)])
    .then(async () => {
      if (finished) return;
      if (reduced.matches) { cleanup(); return; }
      await wait(180);
      if (finished) return;
      const from = title.getBoundingClientRect();
      const to = logo.getBoundingClientRect();
      if (!from.width || !to.width || to.top < 0) { cleanup(); return; }
      // Fix the start geometry before revealing the document underneath.
      title.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;font-size:${getComputedStyle(title).fontSize};margin:0;transform:none;`;
      // One scale for both axes: the letterforms keep their proportions.
      const scale = to.width / from.width;
      const destinationTop = to.top + (to.height - from.height * scale) / 2;
      root.classList.add('is-revealing');
      const flight = title.animate([
        {transform:'translate3d(0,0,0) scale(1)'},
        {transform:`translate3d(${to.left-from.left}px,${destinationTop-from.top}px,0) scale(${scale})`}
      ], {duration:950,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
      animations.push(flight);
      await flight.finished;
      if (finished) return;
      // The Figma loading type and spaced SVG wordmark differ. Crossfade
      // their shapes at the destination instead of stretching one into the other.
      root.classList.add('is-docking');
      const fadeOut = title.animate([{opacity:1},{opacity:0}], {duration:180,fill:'forwards'});
      const fadeIn = logo.animate([{opacity:0},{opacity:1}], {duration:180,fill:'forwards'});
      animations.push(fadeOut, fadeIn);
      await Promise.all([fadeOut.finished, fadeIn.finished]);
      cleanup();
    }).catch(cleanup);
})();
