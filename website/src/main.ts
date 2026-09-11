import "./styles/base.css";
import "./styles/landing.css";
import "./styles/commerce.css";
import "./styles/drop.css";
import { getCart, resetCart, setCartQuantity, initializeCart } from "./cart.ts";
import { renderRoute } from "./routes.ts";
import { seoHead, siteOrigin } from "./seo.ts";
import { mountCountdown } from "./drop.ts";
import { mountProduct } from "./product.ts";
import { mountForms } from "./forms.ts";
import { errorMessage } from "./ui.ts";

import { cartCount } from "./cart-model.ts";

initializeCart();
const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root is missing");
const app: HTMLElement = root;
let lifecycle = new AbortController();
let currentPath = "";

function render(focus = false): void {
  lifecycle.abort();
  lifecycle = new AbortController();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const params = new URLSearchParams(location.search);
  currentPath = path;
  document.body.classList.toggle(
    "dark-page",
    path === "/menu" || path === "/request/sent",
  );
  app.innerHTML = renderRoute(path, params);
  document.head
    .querySelectorAll("[data-seo]")
    .forEach((element) => element.remove());
  document.head.insertAdjacentHTML(
    "beforeend",
    seoHead(path, siteOrigin(import.meta.env.VITE_SITE_URL)),
  );
  mountProduct(app, lifecycle.signal);
  mountForms(app, lifecycle.signal, navigate);
  mountCountdown(app, lifecycle.signal);
  if (focus)
    app.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
}

function scrollToDestination(): void {
  const id = location.hash.slice(1);
  if (id) document.getElementById(id)?.scrollIntoView();
  else window.scrollTo({ top: 0, behavior: "instant" });
}

function navigate(path: string): void {
  const previous = location.pathname + location.search;
  history.pushState(null, "", path);
  if (location.pathname + location.search !== previous) render(true);
  scrollToDestination();
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>("a");
  if (
    anchor &&
    !anchor.target &&
    !anchor.hasAttribute("download") &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.button === 0
  ) {
    const url = new URL(anchor.href);
    if (url.origin === location.origin) {
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
      return;
    }
  }
  const control = event.target.closest<HTMLButtonElement>(
    '[data-quantity="cart"], [data-remove-item], [data-reset-cart]',
  );
  if (!control) return;
  const delta = control.dataset.delta;
  try {
    if (control.hasAttribute("data-reset-cart")) {
      resetCart();
      app.querySelector<HTMLElement>("#main")?.focus();
    } else {
      const variantId = control.dataset.variantId;
      if (!variantId) throw new Error("Не указан цвет товара");
      const line = getCart().find((entry) => entry.variantId === variantId);
      if (!line) throw new Error("Позиция уже удалена из корзины");
      setCartQuantity(
        variantId,
        control.hasAttribute("data-remove-item")
          ? 0
          : line.quantity + Number(delta),
      );
      const nextFocus = delta
        ? (app.querySelector<HTMLButtonElement>(
            `[data-quantity="cart"][data-variant-id="${variantId}"][data-delta="${delta}"]:not(:disabled)`,
          ) ??
          app.querySelector<HTMLButtonElement>(
            `[data-quantity="cart"][data-variant-id="${variantId}"]:not(:disabled)`,
          ))
        : app.querySelector<HTMLButtonElement>("[data-remove-item]");
      (nextFocus ?? app.querySelector<HTMLElement>("#main"))?.focus();
    }
  } catch (error) {
    const message = app.querySelector<HTMLElement>(
      ".cart-error, .storage-page .form-message",
    );
    if (message) {
      message.textContent = errorMessage(error);
      message.hidden = false;
    }
  }
});

window.addEventListener("cartchange", () => {
  if (currentPath === "/cart") {
    render();
    return;
  }
  app.querySelectorAll(".cart-count").forEach((count) => {
    count.textContent = `Корзина (${cartCount(getCart())})`;
  });
  app.querySelectorAll(".mobile-count").forEach((count) => {
    count.textContent = String(cartCount(getCart()));
    count.classList.toggle("is-hidden", cartCount(getCart()) === 0);
  });
});
window.addEventListener("popstate", () => {
  render(true);
  scrollToDestination();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && currentPath === "/menu") {
    navigate("/");
    app.querySelector<HTMLElement>(".menu-trigger")?.focus();
  }
});
render();
if (location.hash) requestAnimationFrame(scrollToDestination);
