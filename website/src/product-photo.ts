export function productPhoto({ blueCard = true, priority = false } = {}) {
  return `<div class="product-photo${blueCard ? "" : " without-card"}">
    <div class="product-photo-surface">
      <img src="/images/editorial/product-original-1254.webp"
        alt="Белый CEOMENTALITY Access — композиция по фотографии изделия заказчика"
        width="1254" height="1254" decoding="async"
        ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} />
      <span class="card-insert" aria-hidden="true"></span>
    </div>
  </div>`;
}
