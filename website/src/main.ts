import "./styles/base.css";
import "./styles/home.css";
import "./styles/commerce.css";

import { getQuantity, setQuantity, updateCartBadges } from "./catalog";
import { initAccessStory } from "./sticky-access";
import {
  cartPage,
  checkoutPage,
  homePage,
  legalPage,
  productPage,
  successPage,
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
  "/success": successPage,
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
if (path === "/") initAccessStory();

const galleryImages = [
  ["/images/cardholder-front.png", "CEOMENTALITY Access, вид спереди"],
  ["/images/cardholder-straight.png", "CEOMENTALITY Access, вид сбоку"],
  ["/images/cardholder-detail.png", "CEOMENTALITY Access, крупный план"],
] as const;
const galleryMain = document.querySelector<HTMLImageElement>("[data-gallery-main]");
const galleryCounter = document.querySelector<HTMLElement>("[data-gallery-counter]");
const galleryButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-gallery-index]"));
let galleryIndex = 0;

function showGalleryImage(nextIndex: number) {
  if (!galleryMain) return;
  galleryIndex = (nextIndex + galleryImages.length) % galleryImages.length;
  const [source, alt] = galleryImages[galleryIndex];
  galleryMain.src = source;
  galleryMain.alt = alt;
  galleryButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === galleryIndex);
    button.setAttribute("aria-current", index === galleryIndex ? "true" : "false");
  });
  if (galleryCounter) galleryCounter.textContent = `${String(galleryIndex + 1).padStart(2, "0")} / 03`;
}

galleryButtons.forEach((button) => {
  button.addEventListener("click", () => showGalleryImage(Number(button.dataset.galleryIndex)));
});
document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => showGalleryImage(galleryIndex - 1));
document.querySelector("[data-gallery-next]")?.addEventListener("click", () => showGalleryImage(galleryIndex + 1));

document.querySelector<HTMLButtonElement>("[data-add-to-cart]")?.addEventListener("click", (event) => {
  const nextQuantity = Math.min(9, getQuantity() + 1);
  setQuantity(nextQuantity);
  updateCartBadges(nextQuantity);
  const button = event.currentTarget as HTMLButtonElement;
  button.firstChild?.replaceWith("Добавлено в корзину ");
  button.classList.add("is-added");
});

document.querySelectorAll<HTMLButtonElement>("[data-quantity]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextQuantity = Number(button.dataset.quantity);
    if (!Number.isInteger(nextQuantity)) return;
    setQuantity(Math.min(9, Math.max(0, nextQuantity)));
    window.location.reload();
  });
});

document.querySelector<HTMLFormElement>("[data-checkout-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  setQuantity(0);
  window.location.assign("/success");
});
