export function flipDigit(value: string): string {
  return `<span class="flip-digit" data-value="${value}"><span class="flip-half flip-top"><span>${value}</span></span><span class="flip-half flip-bottom"><span>${value}</span></span><span class="flip-leaf flip-leaf-top"><span>${value}</span></span><span class="flip-leaf flip-leaf-bottom"><span>${value}</span></span><span class="flip-hinge"></span></span>`;
}

export function setFlipDigit(
  digit: HTMLElement,
  value: string,
  animate: boolean,
): void {
  const previous = digit.dataset.value!;
  if (previous === value) return;
  digit.classList.remove("is-flipping");
  digit.dataset.value = value;
  digit.querySelector(".flip-top > span")!.textContent = value;
  digit.querySelector(".flip-bottom > span")!.textContent = animate
    ? previous
    : value;
  if (!animate) return;
  digit.querySelector(".flip-leaf-top > span")!.textContent = previous;
  digit.querySelector(".flip-leaf-bottom > span")!.textContent = value;
  digit.classList.add("is-flipping");
}

export function finishFlip(digit: HTMLElement): void {
  digit.querySelector(".flip-bottom > span")!.textContent =
    digit.dataset.value!;
  digit.classList.remove("is-flipping");
}
