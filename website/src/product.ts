import {
  collectionProducts,
  formatMoney,
  walletVariants,
  walletVariant,
  type CollectionProduct,
  type WalletVariant,
  type ProductPhoto,
} from "./catalog.ts";
import { addToCart } from "./cart.ts";
import { MAX_QUANTITY } from "./cart-model.ts";
import {
  announce,
  errorMessage,
  icon,
  objectImage,
  productImage,
  quantityControl,
} from "./ui.ts";

export function productSection(
  standalone = false,
  selected: CollectionProduct = collectionProducts[0],
  variant: WalletVariant = walletVariants[0],
): string {
  const available = selected.availability === "available";
  const photos: readonly ProductPhoto[] = available
    ? variant.views
    : selected.views;
  const firstView = photos[0]!;
  return `<section class="shop ${standalone ? "shop-standalone" : ""}" id="product" data-product="${selected.id}" aria-labelledby="shop-title">
    <h${standalone ? "1" : "2"} id="shop-title">${standalone ? "ceowallet" : "забрать своё."}</h${standalone ? "1" : "2"}>
    <div class="product-layout">
      <div class="gallery" role="region" aria-label="Изображения ${selected.name}" ${photos.length > 1 ? 'aria-roledescription="карусель"' : ""}>
        <div class="gallery-photo">${available ? objectImage(firstView.id, "gallery-object", standalone, variant) : productImage(firstView, "gallery-object collection-gallery-object flat-view", true)}</div>
        <p class="sr-only gallery-description" aria-live="polite">${firstView.alt}. 1 из ${photos.length}</p>
        <button class="gallery-next icon-button" aria-label="Следующая фотография" ${photos.length === 1 ? "hidden" : ""}>${icon("arrow")}</button>
      </div>
      <div class="product-info">
        <h${standalone ? "2" : "3"} tabindex="-1" class="product-name ${available ? "wallet-name" : ""}">${available ? "ceowallet" : `CEOMENTALITY <span>${selected.shortName}</span>`}</h${standalone ? "2" : "3"}>
        <p class="variant">${available ? "Картхолдер · " + variant.label.toLowerCase() : selected.variant}</p>
        ${available ? `<fieldset class="color-choice"><legend>Цвет: ${variant.label.toLowerCase()}</legend>${walletVariants.map((option) => `<label class="color-option"><input type="radio" name="wallet-color" value="${option.id}" ${option.id === variant.id ? "checked" : ""}><span class="color-swatch" style="--swatch:${option.swatch}" aria-hidden="true"></span><span>${option.label}</span></label>`).join("")}</fieldset>` : `<p class="product-intro">${selected.description[0]}</p>`}
        ${selected.availability === "available" ? `<div class="purchase-options"><p class="price">${formatMoney(selected.priceMinor)}</p><div class="product-quantity"><span>Количество</span>${quantityControl(1, "product")}</div></div><button class="button add-to-cart">Добавить в корзину${icon("arrow")}</button>` : `<p class="product-availability">В следующей коллекции</p><button class="button upcoming-product" disabled>Скоро в продаже${icon("arrow")}</button>`}
        <p class="product-note">${available ? "Для оплаты понадобится действующий код доступа." : "Концепт. Дизайн, цена и дата продажи будут объявлены отдельно."}</p>
        <p class="product-feedback" role="status" hidden></p>
        <details class="product-details"><summary>${available ? "Детали и доставка" : "О предмете"}${icon("plus")}</summary><div>${selected.description.map((paragraph) => `<p>${paragraph}</p>`).join("")}</div></details>
      </div>
    </div>
  </section>`;
}

export function mountProduct(root: HTMLElement, signal: AbortSignal): void {
  const initialSection = root.querySelector<HTMLElement>(".shop");
  if (!initialSection) return;
  const standalone = initialSection.classList.contains("shop-standalone");
  let selected: CollectionProduct = collectionProducts[0];
  let variant: WalletVariant = walletVariants[0];
  let section = initialSection;
  let controls = new AbortController();
  signal.addEventListener("abort", () => controls.abort(), { once: true });
  const requestedColor = new URLSearchParams(location.search).get("color");
  if (requestedColor === "black") variant = walletVariants[1];

  function renderSelection(): void {
    controls.abort();
    controls = new AbortController();
    section.outerHTML = productSection(standalone, selected, variant);
    section = root.querySelector<HTMLElement>(".shop")!;
    mountProductControls(section, selected, variant, controls.signal);
  }
  renderSelection();
  root.addEventListener(
    "change",
    (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.name !== "wallet-color")
        return;
      variant = walletVariant(input.value);
      renderSelection();
      section
        .querySelector<HTMLInputElement>(`input[value="${variant.id}"]`)!
        .focus({ preventScroll: true });
      announce(`Выбран ceowallet, ${variant.label.toLowerCase()}`);
    },
    { signal },
  );

  root.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLElement>(
        '[data-product-select], a[href="/#product"]',
      );
      if (!trigger) return;
      if (
        trigger instanceof HTMLAnchorElement &&
        (event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0)
      )
        return;
      const choice = trigger.matches("a")
        ? collectionProducts[0]
        : collectionProducts.find(
            (entry) => entry.id === trigger.dataset.productSelect,
          );
      if (!choice) throw new Error("Unknown collection product");
      if (selected.id !== choice.id) {
        selected = choice;
        renderSelection();
        root
          .querySelectorAll<HTMLButtonElement>("[data-product-select]")
          .forEach((button) => {
            button.setAttribute(
              "aria-pressed",
              String(button.dataset.productSelect === selected.id),
            );
          });
        const note = root.querySelector<HTMLElement>("#collection-note");
        if (note)
          note.textContent =
            selected.availability === "available"
              ? "Будущая коллекция. Новые предметы пока не в продаже."
              : `${selected.category} — в разработке. Пока не в продаже.`;
        const returnButton =
          root.querySelector<HTMLButtonElement>(".collection-return");
        if (returnButton)
          returnButton.hidden = selected.availability === "available";
        announce(
          `Выбран ${selected.name}. ${selected.availability === "coming-soon" ? "Скоро в продаже." : ""}`,
        );
      }
      section
        .querySelector<HTMLElement>(".product-name")!
        .focus({ preventScroll: true });
      section.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    },
    { signal },
  );
}

function mountProductControls(
  section: HTMLElement,
  selected: CollectionProduct,
  variant: WalletVariant,
  signal: AbortSignal,
): void {
  let quantity = 1;
  const photos: readonly ProductPhoto[] =
    selected.availability === "available" ? variant.views : selected.views;
  let viewIndex = 0;
  const requested = new URLSearchParams(location.search).get("view");
  const requestedIndex = photos.findIndex((view) => view.id === requested);
  if (requestedIndex >= 0) viewIndex = requestedIndex;
  const description = section.querySelector<HTMLElement>(
    ".gallery-description",
  )!;
  const feedback = section.querySelector<HTMLElement>(".product-feedback")!;
  function updatePhoto(eager = true): void {
    const photo = photos[viewIndex]!;
    section.querySelector(".gallery-photo")!.innerHTML =
      selected.availability === "available"
        ? objectImage(
            photo.id,
            `gallery-object ${photo.id === "angle" ? "" : "flat-view"}`,
            eager,
            variant,
          )
        : productImage(
            photo,
            "gallery-object collection-gallery-object flat-view",
            eager,
          );
    description.textContent = `${photo.alt}. ${viewIndex + 1} из ${photos.length}`;
  }
  function cycle(direction = 1): void {
    viewIndex = (viewIndex + direction + photos.length) % photos.length;
    updatePhoto();
  }
  updatePhoto(section.classList.contains("shop-standalone"));
  if (photos.length > 1) {
    const next = section.querySelector<HTMLElement>(".gallery-next")!;
    next.addEventListener("click", () => cycle(), { signal });
    next.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        cycle(event.key === "ArrowLeft" ? -1 : 1);
      },
      { signal },
    );
    const gallery = section.querySelector<HTMLElement>(".gallery")!;
    let pointerStart: { x: number; y: number } | null = null;
    gallery.addEventListener(
      "pointerdown",
      (event) => {
        pointerStart = { x: event.clientX, y: event.clientY };
      },
      { signal },
    );
    gallery.addEventListener(
      "pointercancel",
      () => {
        pointerStart = null;
      },
      { signal },
    );
    gallery.addEventListener(
      "pointerup",
      (event) => {
        if (!pointerStart) return;
        const distance = event.clientX - pointerStart.x;
        if (
          Math.abs(distance) > 45 &&
          Math.abs(event.clientY - pointerStart.y) < 60
        )
          cycle(distance < 0 ? 1 : -1);
        pointerStart = null;
      },
      { signal },
    );
  }
  if (selected.availability !== "available") return;
  section
    .querySelectorAll<HTMLButtonElement>('[data-quantity="product"]')
    .forEach((control) => {
      control.addEventListener(
        "click",
        () => {
          quantity = Math.max(
            1,
            Math.min(MAX_QUANTITY, quantity + Number(control.dataset.delta)),
          );
          section.querySelector("output")!.textContent = String(quantity);
          section.querySelector<HTMLButtonElement>(
            '[data-delta="-1"]',
          )!.disabled = quantity === 1;
          section.querySelector<HTMLButtonElement>(
            '[data-delta="1"]',
          )!.disabled = quantity === MAX_QUANTITY;
        },
        { signal },
      );
    });
  section.querySelector(".add-to-cart")!.addEventListener(
    "click",
    () => {
      feedback.hidden = false;
      try {
        addToCart(variant.id, quantity);
        feedback.classList.remove("error");
        feedback.innerHTML =
          'Добавлено. <a href="/cart">Перейти в корзину →</a>';
        announce(
          `ceowallet, ${variant.label.toLowerCase()}, добавлен в корзину`,
        );
      } catch (error) {
        feedback.classList.add("error");
        feedback.textContent = errorMessage(error);
      }
    },
    { signal },
  );
}
