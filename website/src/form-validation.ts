export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+") && digits.length === 10)
    return `+7${digits}`;
  if (
    !value.trim().startsWith("+") &&
    digits.length === 11 &&
    digits.startsWith("8")
  )
    return `+7${digits.slice(1)}`;
  return `+${digits}`;
}

export function fieldError(
  name: string,
  value: string,
  required = false,
  checked = false,
): string {
  if (["privacy", "terms", "purchase"].includes(name))
    return required && !checked
      ? "Подтвердите согласие, чтобы продолжить."
      : "";
  const text = value.trim();
  if (!text) return required ? "Заполните это поле." : "";
  if (name === "name" && !/^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{1,119}$/u.test(text))
    return "Укажите имя: от 2 букв, без цифр и специальных символов.";
  if (name === "email") {
    const local = text.split("@")[0]!;
    if (
      text.length > 120 ||
      !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(text) ||
      local.startsWith(".") ||
      local.endsWith(".") ||
      local.includes("..")
    )
      return "Проверьте email. Например: name@example.com.";
  }
  if (name === "phone") {
    const digits = text.replace(/\D/g, "");
    const international = text.startsWith("+");
    const validLength = international
      ? digits.length >= 8 && digits.length <= 15 && !digits.startsWith("0")
      : digits.length === 10 || (digits.length === 11 && /^[78]/.test(digits));
    if (
      !/^\+?[\d\s()\-]+$/.test(text) ||
      !validLength ||
      (international && digits.startsWith("7") && digits.length !== 11) ||
      /^(\d)\1+$/.test(digits)
    )
      return "Введите полный номер. Например: +7 999 123-45-67. Для другой страны укажите + и её код.";
  }
  if (name === "address" && (text.length < 5 || text.length > 300))
    return "Укажите адрес получения: город, улицу и дом.";
  if (name === "accessCode" && text.length > 64)
    return "Код должен быть не длиннее 64 символов.";
  return "";
}

function showFieldError(input: HTMLInputElement): boolean {
  const message = fieldError(
    input.name,
    input.value,
    input.required,
    input.checked,
  );
  const id = `${input.form!.id}-${input.name}-error`;
  let hint = document.getElementById(id);
  if (!hint) {
    hint = document.createElement("span");
    hint.id = id;
    hint.className = "field-error";
    hint.setAttribute("role", "alert");
    if (input.type === "checkbox") input.closest("label")!.after(hint);
    else input.after(hint);
    input.setAttribute(
      "aria-describedby",
      [input.getAttribute("aria-describedby"), id].filter(Boolean).join(" "),
    );
  }
  hint.textContent = message;
  hint.hidden = !message;
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
  input.dataset.validated = "true";
  return !message;
}

export function mountValidation(
  form: HTMLFormElement,
  signal: AbortSignal,
): void {
  form.noValidate = true;
  form.inert = false;
  form.addEventListener(
    "input",
    (event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.dataset.validated
      )
        showFieldError(event.target);
    },
    { signal },
  );
}

export function validateForm(form: HTMLFormElement): boolean {
  let firstInvalid: HTMLInputElement | undefined;
  form
    .querySelectorAll<HTMLInputElement>("input:not(:disabled)")
    .forEach((input) => {
      if (input.type !== "checkbox") input.value = input.value.trim();
      if (!showFieldError(input) && !firstInvalid) firstInvalid = input;
    });
  firstInvalid?.focus();
  return !firstInvalid;
}
