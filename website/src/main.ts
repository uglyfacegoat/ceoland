import "./styles/base.css";
import "./styles/home.css";
import "./styles/commerce.css";

import { getQuantity, setQuantity, updateCartBadges } from "./catalog";
import { productImages } from "./product-media";
import {
  cartPage,
  checkoutPage,
  homePage,
  legalPage,
  productPage,
  orderConfirmationPreview,
} from "./templates";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Application root is missing.");

const path = window.location.pathname.replace(/\/$/, "") || "/";
const quantity = getQuantity();

const renderers: Record<string, () => string> = {
  "/": homePage,
  "/product": productPage,
  "/cart": () => cartPage(quantity),
  "/checkout": () => checkoutPage(quantity),
  "/preview/order-success": orderConfirmationPreview,
  "/privacy": () => legalPage("privacy"),
  "/terms": () => legalPage("terms"),
};

const renderer = renderers[path];
if (renderer) {
  app.innerHTML = renderer();
} else {
  app.innerHTML = `<main class="not-found"><a class="wordmark" href="/">CEOMENTALITY</a><p>404</p><h1>Страница не найдена</h1><a class="text-link" href="/">Вернуться на главную →</a></main>`;
  document.title = "Страница не найдена — CEOMENTALITY";
}

updateCartBadges(quantity);

const galleryMain = document.querySelector<HTMLImageElement>(
  ".product-main-image img",
);
const galleryCounter = document.querySelector<HTMLElement>(
  "[data-gallery-counter]",
);
const galleryButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-gallery-index]"),
);
let galleryIndex = 0;

function showGalleryImage(nextIndex: number) {
  if (!galleryMain) return;
  galleryIndex = (nextIndex + productImages.length) % productImages.length;
  const picture = productImages[galleryIndex];
  galleryMain.alt = picture.alt;
  const surface = galleryMain.closest<HTMLElement>(".product-main-image");
  if (surface) surface.dataset.view = picture.view;
  galleryButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === galleryIndex);
    button.setAttribute(
      "aria-current",
      index === galleryIndex ? "true" : "false",
    );
  });
  if (galleryCounter)
    galleryCounter.textContent = `${String(galleryIndex + 1).padStart(2, "0")} / ${String(productImages.length).padStart(2, "0")}`;
}

galleryButtons.forEach((button) => {
  button.addEventListener("click", () =>
    showGalleryImage(Number(button.dataset.galleryIndex)),
  );
});
document
  .querySelector("[data-gallery-prev]")
  ?.addEventListener("click", () => showGalleryImage(galleryIndex - 1));
document
  .querySelector("[data-gallery-next]")
  ?.addEventListener("click", () => showGalleryImage(galleryIndex + 1));

const gallerySurface = document.querySelector<HTMLElement>(
  ".product-main-image",
);
if (gallerySurface) {
  let gesture: { x: number; y: number } | undefined;
  gallerySurface.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse")
      gesture = { x: event.clientX, y: event.clientY };
  });
  gallerySurface.addEventListener("pointerup", (event) => {
    if (!gesture) return;
    const deltaX = event.clientX - gesture.x;
    const deltaY = event.clientY - gesture.y;
    gesture = undefined;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaY) < 40)
      showGalleryImage(galleryIndex + (deltaX < 0 ? 1 : -1));
  });
  gallerySurface.addEventListener("pointercancel", () => {
    gesture = undefined;
  });
  gallerySurface.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showGalleryImage(galleryIndex + (event.key === "ArrowRight" ? 1 : -1));
  });
}

const addButton =
  document.querySelector<HTMLButtonElement>("[data-add-to-cart]");
if (addButton && quantity === 9) {
  addButton.disabled = true;
  addButton.textContent = "В корзине 9 шт.";
}
addButton?.addEventListener("click", (event) => {
  const nextQuantity = Math.min(9, getQuantity() + 1);
  setQuantity(nextQuantity);
  updateCartBadges(nextQuantity);
  const button = event.currentTarget as HTMLButtonElement;
  button.firstChild?.replaceWith("Добавлено в корзину ");
  button.classList.add("is-added");
  const feedback = document.querySelector<HTMLElement>("[data-cart-feedback]");
  if (feedback) feedback.hidden = false;
  if (nextQuantity === 9) {
    button.disabled = true;
    button.textContent = "В корзине 9 шт.";
  }
});

document
  .querySelectorAll<HTMLButtonElement>("[data-quantity]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const nextQuantity = Number(button.dataset.quantity);
      if (!Number.isInteger(nextQuantity)) return;
      setQuantity(Math.min(9, Math.max(0, nextQuantity)));
      window.location.reload();
    });
  });

document
  .querySelector<HTMLFormElement>("[data-checkout-form]")
  ?.addEventListener("submit", (event) => {
    // No payment provider is connected. Never clear the cart or pretend an order exists.
    event.preventDefault();
  });

const header = document.querySelector<HTMLElement>(".site-header");
const menuToggle =
  document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
if (header && menuToggle) {
  const closeMenu = () => {
    header.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Открыть меню");
  };
  menuToggle.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Закрыть меню" : "Открыть меню",
    );
  });
  header
    .querySelectorAll(".navigation a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-open")) {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !header.contains(event.target))
      closeMenu();
  });
  window
    .matchMedia("(min-width: 1024px)")
    .addEventListener("change", closeMenu);
}
const navigationSections = ["about", "how"].map((id) => ({
  section: document.getElementById(id),
  link: header?.querySelector<HTMLAnchorElement>(`a[href="/#${id}"]`),
}));
const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 40);
  navigationSections.forEach(({ section, link }) => {
    if (!section || !link) return;
    const bounds = section.getBoundingClientRect();
    const active =
      bounds.top < innerHeight * 0.5 && bounds.bottom > innerHeight * 0.5;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const rail = document.querySelector<HTMLElement>(".product-rail");
const previous = document.querySelector<HTMLButtonElement>("[data-rail-prev]");
const next = document.querySelector<HTMLButtonElement>("[data-rail-next]");
const railProgress = document.querySelector<HTMLElement>(
  "[data-rail-progress]",
);
if (rail && previous && next && railProgress) {
  const updateRail = () => {
    const distance = rail.scrollWidth - rail.clientWidth;
    previous.disabled = rail.scrollLeft < 2;
    next.disabled = rail.scrollLeft >= distance - 2;
    railProgress.style.width = `${distance > 0 ? 30 + (70 * rail.scrollLeft) / distance : 100}%`;
  };
  const scrollRail = (direction: number) =>
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  previous.addEventListener("click", () => scrollRail(-1));
  next.addEventListener("click", () => scrollRail(1));
  rail.addEventListener("scroll", updateRail, { passive: true });
  window.addEventListener("resize", updateRail);
  updateRail();
}
