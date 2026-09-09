const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function initAccessStory() {
  const story = document.querySelector<HTMLElement>("[data-access-story]");
  const sticky = story?.querySelector<HTMLElement>("[data-access-sticky]");
  const steps = Array.from(story?.querySelectorAll<HTMLElement>("[data-access-step]") ?? []);
  const count = steps.length;
  if (!story || !sticky || count === 0) return;

  let scheduled = false;

  const update = () => {
    scheduled = false;
    const rect = story.getBoundingClientRect();
    const distance = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / distance, 0, 0.9999);
    const activeIndex = Math.min(count - 1, Math.floor(progress * count));

    sticky.dataset.step = String(activeIndex + 1);
    sticky.style.setProperty("--story-progress", String(progress));
    steps.forEach((step, index) => {
      const active = index === activeIndex;
      step.classList.toggle("is-active", active);
      step.setAttribute("aria-current", active ? "step" : "false");
    });
    const counter = sticky.querySelector<HTMLElement>("[data-step-counter]");
    if (counter) counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / 04`;
  };

  const requestUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}
