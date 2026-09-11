import { getCart, getCartError } from "./cart.ts";
import { formatMoney, product } from "./catalog.ts";
import { gateway, DEMO_CODE } from "./integration/preview.ts";
import { errorMessage } from "./ui.ts";
import {
  mountValidation,
  normalizePhone,
  validateForm,
} from "./form-validation.ts";

import { cartCount, cartSubtotal, type CartLine } from "./cart-model.ts";
import { checkoutItems } from "./pages.ts";

type Navigate = (path: string) => void;

function readText(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLInputElement))
    throw new Error("Form field is missing: " + name);
  return input.value.trim();
}

function busy(form: HTMLFormElement, active: boolean): void {
  form.dataset.busy = String(active);
  form.setAttribute("aria-busy", String(active));
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  submit.disabled = active;
  if (active) {
    submit.dataset.originalLabel = submit.innerHTML;
    submit.textContent = "Подождите…";
  } else if (submit.dataset.originalLabel) {
    submit.innerHTML = submit.dataset.originalLabel;
  }
}

export function mountForms(
  root: HTMLElement,
  signal: AbortSignal,
  navigate: Navigate,
): void {
  root
    .querySelectorAll<HTMLFormElement>("form")
    .forEach((form) => mountValidation(form, signal));
  const access = root.querySelector<HTMLFormElement>("#access-form");
  if (access) {
    const input = access.querySelector<HTMLInputElement>("input")!;
    const message = access.querySelector<HTMLElement>("#access-message")!;
    access.querySelector(".fill-demo")!.addEventListener(
      "click",
      () => {
        input.value = DEMO_CODE;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.removeAttribute("aria-invalid");
        message.hidden = true;
        input.focus();
      },
      { signal },
    );
    input.addEventListener(
      "input",
      () => {
        input.removeAttribute("aria-invalid");
        message.hidden = true;
      },
      { signal },
    );
    access.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        if (access.dataset.busy === "true" || !validateForm(access)) return;
        busy(access, true);
        message.hidden = true;
        try {
          const result = await gateway.checkAccess(input.value, signal);
          if (signal.aborted) return;
          if (result.status === "accepted") navigate("/access/accepted");
          else {
            message.textContent = result.message;
            message.hidden = false;
            input.setAttribute("aria-invalid", "true");
            input.focus();
          }
        } catch (error) {
          if (signal.aborted) return;
          message.textContent = errorMessage(error);
          message.hidden = false;
        } finally {
          if (!signal.aborted) busy(access, false);
        }
      },
      { signal },
    );
  }

  const request = root.querySelector<HTMLFormElement>("#request-form");
  if (request) {
    request.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        if (request.dataset.busy === "true" || !validateForm(request)) return;
        const message = request.querySelector<HTMLElement>(".form-message")!;
        message.hidden = true;
        busy(request, true);
        try {
          const accessCode = readText(request, "accessCode");
          await gateway.requestInvitation(
            {
              name: readText(request, "name"),
              email: readText(request, "email"),
              phone: normalizePhone(readText(request, "phone")),
              ...(accessCode ? { accessCode } : {}),
              privacyConsent: true,
            },
            signal,
          );
          if (!signal.aborted) navigate("/request/sent");
        } catch (error) {
          if (signal.aborted) return;
          message.textContent = errorMessage(error);
          message.hidden = false;
        } finally {
          if (!signal.aborted) busy(request, false);
        }
      },
      { signal },
    );
  }

  const checkout = root.querySelector<HTMLFormElement>("#checkout-form");
  if (checkout) mountCheckout(checkout, signal);
}

function mountCheckout(form: HTMLFormElement, signal: AbortSignal): void {
  const input = form.querySelector<HTMLInputElement>('[name="accessCode"]')!;
  const codeMessage = form.querySelector<HTMLElement>(
    "#checkout-code-message",
  )!;
  const paymentMessage = form.querySelector<HTMLElement>(
    ".checkout-payment .form-message",
  )!;
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const check = form.querySelector<HTMLButtonElement>(".check-checkout-code")!;
  let acceptedCode: string | null = null;
  let checking = false;
  let revision = 0;
  const items = (): readonly CartLine[] =>
    form.dataset.preview === "true"
      ? [{ variantId: "ceowallet-white", quantity: 1 }]
      : getCart();
  const quantity = () => cartCount(items());

  function updateReadiness(): void {
    submit.disabled =
      checking ||
      form.dataset.busy === "true" ||
      !quantity() ||
      Boolean(getCartError());
  }
  async function checkCode(): Promise<void> {
    if (checking) return;
    if (!input.value.trim()) {
      codeMessage.textContent = "Введите код доступа.";
      codeMessage.classList.add("error");
      codeMessage.hidden = false;
      input.setAttribute("aria-invalid", "true");
      return;
    }
    const code = input.value.trim();
    const requestRevision = ++revision;
    checking = true;
    check.disabled = true;
    acceptedCode = null;
    codeMessage.classList.remove("error");
    codeMessage.textContent = "Проверяем…";
    codeMessage.hidden = false;
    updateReadiness();
    try {
      const result = await gateway.checkAccess(code, signal);
      if (signal.aborted || requestRevision !== revision) return;
      if (result.status === "accepted") {
        acceptedCode = code;
        codeMessage.textContent = "Демо-код принят.";
        input.removeAttribute("aria-invalid");
      } else {
        codeMessage.textContent = result.message;
        codeMessage.classList.add("error");
        input.setAttribute("aria-invalid", "true");
      }
    } catch (error) {
      if (signal.aborted || requestRevision !== revision) return;
      codeMessage.textContent = errorMessage(error);
      codeMessage.classList.add("error");
    } finally {
      if (!signal.aborted && requestRevision === revision) {
        checking = false;
        check.disabled = false;
        updateReadiness();
      }
    }
  }
  input.addEventListener(
    "input",
    () => {
      revision++;
      checking = false;
      check.disabled = false;
      acceptedCode = null;
      input.removeAttribute("aria-invalid");
      codeMessage.hidden = true;
      paymentMessage.hidden = true;
      updateReadiness();
    },
    { signal },
  );
  check.addEventListener(
    "click",
    () => {
      void checkCode();
    },
    { signal },
  );
  form.addEventListener("input", updateReadiness, { signal });
  form.addEventListener("change", updateReadiness, { signal });
  window.addEventListener(
    "cartchange",
    () => {
      form.querySelector("[data-order-total]")!.textContent = formatMoney(
        cartSubtotal(items()),
      );
      form.querySelector(".checkout-items")!.innerHTML = checkoutItems(items());
      if (!quantity() || getCartError()) {
        paymentMessage.hidden = false;
        paymentMessage.textContent =
          "Корзина изменилась. Вернитесь в корзину и проверьте заказ.";
      }
      updateReadiness();
    },
    { signal },
  );
  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();
      if (
        form.dataset.busy === "true" ||
        !validateForm(form) ||
        !quantity() ||
        getCartError()
      )
        return;
      busy(form, true);
      paymentMessage.hidden = true;
      try {
        if (acceptedCode !== input.value.trim()) {
          await checkCode();
          if (signal.aborted || acceptedCode !== input.value.trim()) {
            if (!signal.aborted) input.focus();
            return;
          }
        }
        // The user or another tab can change the order while the code is checked.
        if (!validateForm(form) || !quantity() || getCartError()) return;
        const city = readText(form, "city");
        await gateway.createCheckout(
          {
            items: items().map((line) => ({
              productId: product.id,
              variantId: line.variantId,
              quantity: line.quantity,
            })),
            customer: {
              name: readText(form, "name"),
              email: readText(form, "email"),
              phone: normalizePhone(readText(form, "phone")),
              address: [city, readText(form, "address")]
                .filter(Boolean)
                .join(", "),
            },
            accessCode: input.value.trim(),
            consents: { privacy: true, terms: true, purchase: true },
          },
          signal,
        );
        throw new Error(
          "Платёжный переход должен быть подключён интегратором вместе с серверным адаптером.",
        );
      } catch (error) {
        if (signal.aborted) return;
        paymentMessage.textContent = errorMessage(error);
        paymentMessage.hidden = false;
      } finally {
        if (!signal.aborted) {
          busy(form, false);
          updateReadiness();
        }
      }
    },
    { signal },
  );
}
