import { landing } from "./landing.ts";
import {
  accessPage,
  acceptedPage,
  cartPage,
  checkoutPage,
  emptyCartPage,
  infoPage,
  menuPage,
  notFoundPage,
  previewPage,
  productPage,
  requestPage,
  requestSentPage,
} from "./pages.ts";

export function renderRoute(
  path: string,
  params = new URLSearchParams(),
): string {
  switch (path) {
    case "/":
      return landing();
    case "/menu":
      return menuPage();
    case "/access":
      return accessPage(params.get("state"));
    case "/access/accepted":
      return acceptedPage();
    case "/product":
      return productPage();
    case "/cart":
      return params.get("state") === "empty" ? emptyCartPage() : cartPage();
    case "/checkout":
      return checkoutPage(params.get("preview") === "filled");
    case "/request":
      return requestPage();
    case "/request/sent":
      return requestSentPage();
    case "/preview":
      return previewPage();
    default:
      return path.startsWith("/info/")
        ? infoPage(path.slice(6))
        : notFoundPage();
  }
}
