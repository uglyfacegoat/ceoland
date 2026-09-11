import type { StorefrontGateway } from "./contracts.ts";

export const DEMO_CODE = "CM-DEMO-2026";

function previewDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Navigation cancelled preview", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 350);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// No network requests: this adapter never creates orders or payment sessions.
export const gateway: StorefrontGateway = {
  mode: "preview",
  async checkAccess(code, signal) {
    await previewDelay(signal);
    return code.trim().toUpperCase() === DEMO_CODE
      ? { status: "accepted", mode: "preview" }
      : {
          status: "rejected",
          message: "Код недействителен или уже использован.",
        };
  },
  async requestInvitation(_request, signal) {
    await previewDelay(signal);
    return { mode: "preview" };
  },
  async createCheckout(_request, signal) {
    signal.throwIfAborted();
    throw new Error(
      "Это демонстрация интерфейса. Оплата ещё не подключена, заказ не создан.",
    );
  },
};
