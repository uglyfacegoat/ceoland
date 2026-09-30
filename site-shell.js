/* Shared navigation and footer for the landing page and task pages. */
(() => {
  const documents = [['Конфиденциальность','privacy'],['Соглашение','agreement'],['Условия покупки','purchase-terms'],['Реквизиты','company']];
  const pages = [['CEOWALLET','wallet'],['КУПИТЬ ПО КОДУ','access'],['ЗАПРОСИТЬ КОД','purchase-application'],['КОНТАКТЫ','contact'],['КОРЗИНА','cart']];
  const footer = (route, home='index.html') => `<footer class="footer section dark" id="footer">
    <h2>СВОЙ<br>КРУГ.</h2><p class="footer-description">Закрытый клуб молодых предпринимателей.<br>Ручной отбор. Общение. Общие цели.</p>
    <nav class="footer-nav" aria-label="Навигация по сайту">
      <div><h3>КЛУБ</h3><a href="${home}#community">О сообществе</a><a href="${home}#selection">КАК ВСТУПИТЬ</a><a href="${home}#faq">Вопросы и ответы</a></div>
      <div><h3>ОБЪЕКТЫ</h3><a href="${home}#objects">Вся линейка</a><a href="${route('wallet',{colour:'white'})}">CEOWALLET</a><a href="${home}#nfc">NFC CARD</a></div>
      <div><h3>ИНФОРМАЦИЯ</h3><a href="${route('contact')}">Контакты</a><a href="${route('privacy')}">Конфиденциальность</a><a href="${route('agreement')}">Соглашение</a><a href="${route('purchase-terms')}">Условия покупки</a><a href="${route('company')}">Реквизиты</a></div>
    </nav>
    <div class="footer-serial"><img src="assets/serial.svg" width="185" height="64" alt=""><p>EST. 2024<br>001 / ∞</p></div><div class="triangle decoration type-object" data-type="triangle" aria-hidden="true"></div>
    <a class="footer-wordmark" href="${home}#top" aria-label="CEOMENTALITY — наверх">CEOMENTALITY</a><div class="footer-bottom"><span>© CEOMENTALITY / 2026</span><span>MORE THAN A CLUB.</span></div>
  </footer>`;
  function menuReturn() {
    try {
      const url = new URL(sessionStorage.getItem('ceo-menu-return') || 'index.html', location.href);
      if(url.origin === location.origin && url.searchParams.get('screen') !== 'menu') return url.pathname+url.search+url.hash;
    } catch {}
    return 'index.html';
  }
  window.CEO_SHELL = {footer, documents, pages, menuReturn};
  const placeholder = document.querySelector('[data-site-footer]');
  if(placeholder) placeholder.outerHTML = footer((name,extra={}) => 'app.html?'+new URLSearchParams({screen:name,...extra}));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if(!link) return;
    const url = new URL(link.href);
    if(url.origin === location.origin && url.searchParams.get('screen') === 'menu') {
      try { sessionStorage.setItem('ceo-menu-return',location.pathname+location.search+location.hash); } catch {}
    }
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') document.querySelector('[data-menu-close]')?.click();
  });
})();
