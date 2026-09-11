import { finishFlip, flipDigit, setFlipDigit } from "./flip-digit.ts";

export const nextDropAt = "2026-12-31T00:00:00+03:00";
const deadline = Date.parse(nextDropAt);
const units = [
  { key: "days", label: "дней", digits: 3 },
  { key: "hours", label: "часов", digits: 2 },
  { key: "minutes", label: "минут", digits: 2 },
  { key: "seconds", label: "секунд", digits: 2 },
] as const;

export function timeRemaining(target: number, now: number) {
  if (!Number.isFinite(target) || !Number.isFinite(now)) {
    throw new RangeError("Countdown requires valid timestamps");
  }
  const seconds = Math.max(0, Math.ceil((target - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    ended: seconds === 0,
  };
}

export function dropSection(): string {
  const remaining = timeRemaining(deadline, Date.now());
  return `<section class="drop" id="next-drop" aria-labelledby="drop-title">
    <h2 id="drop-title">Следующий<br>дроп.</h2>
    <p class="sr-only">До <time datetime="${nextDropAt}">31 декабря 2026 года, 00:00 по Москве</time></p>
    <div class="drop-timer" role="timer" aria-live="off" aria-label="До следующего дропа"><dl class="drop-countdown">
      ${units.map(({ key, label, digits }) => `<div class="drop-unit drop-${key}"><dt>${label}</dt><dd><span class="sr-only" data-countdown="${key}">${remaining[key]}</span><span class="flip-group" data-flip="${key}" aria-hidden="true">${String(remaining[key]).padStart(digits, "0").split("").map(flipDigit).join("")}</span></dd></div>`).join("")}
    </dl></div>
    <p class="drop-ended" role="status" ${remaining.ended ? "" : "hidden"}>Отсчёт завершён.</p>
  </section>`;
}

export function mountCountdown(root: HTMLElement, signal: AbortSignal): void {
  const section = root.querySelector<HTMLElement>(".drop");
  if (!section) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const fields = units.map(({ key, digits }) => ({
    key,
    digits,
    label: section.querySelector<HTMLElement>(`[data-countdown="${key}"]`)!,
    group: section.querySelector<HTMLElement>(`[data-flip="${key}"]`)!,
  }));
  const status = section.querySelector<HTMLElement>(".drop-ended")!;
  let interval: ReturnType<typeof setInterval> | undefined;
  let inView = false;

  function update(animate = false): void {
    const remaining = timeRemaining(deadline, Date.now());
    for (const { key, digits, label, group } of fields) {
      const value = String(remaining[key]).padStart(digits, "0");
      if (label.textContent !== String(remaining[key]))
        label.textContent = String(remaining[key]);
      if (group.children.length !== value.length) {
        group.innerHTML = value.split("").map(flipDigit).join("");
        continue;
      }
      [...group.querySelectorAll<HTMLElement>(".flip-digit")].forEach(
        (digit, index) => {
          setFlipDigit(digit, value[index]!, animate && !reducedMotion.matches);
        },
      );
    }
    status.hidden = !remaining.ended;
    if (remaining.ended) clearInterval(interval);
  }
  const resume = (): void => {
    clearInterval(interval);
    if (document.hidden || !inView) return;
    section.querySelectorAll<HTMLElement>(".is-flipping").forEach(finishFlip);
    update();
    if (Date.now() < deadline) interval = setInterval(() => update(true), 1000);
  };
  section.addEventListener(
    "animationend",
    (event) => {
      if (
        event.animationName !== "flip-bottom" ||
        !(event.target instanceof Element)
      )
        return;
      const digit = event.target.closest<HTMLElement>(".flip-digit");
      if (digit) finishFlip(digit);
    },
    { signal },
  );
  reducedMotion.addEventListener(
    "change",
    () => {
      section.querySelectorAll<HTMLElement>(".is-flipping").forEach(finishFlip);
    },
    { signal },
  );
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry!.isIntersecting;
    resume();
  });
  observer.observe(section);
  document.addEventListener("visibilitychange", resume, { signal });
  signal.addEventListener(
    "abort",
    () => {
      clearInterval(interval);
      observer.disconnect();
    },
    { once: true },
  );
}
