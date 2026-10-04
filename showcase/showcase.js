// Small progressive enhancements for the showcase. The page works without it.

// Show the live value of each token next to its specimen, read from the
// framework stylesheet so the page never repeats token values.
const rootStyle = getComputedStyle(document.documentElement);
for (const el of document.querySelectorAll("[data-token]")) {
  el.textContent = rootStyle.getPropertyValue(el.dataset.token).trim();
}

// Copy-to-clipboard buttons on every code sample.
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for contexts without the async Clipboard API.
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

for (const block of document.querySelectorAll(".sc-code")) {
  const code = block.querySelector("code");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sc-copy";
  button.textContent = "Copy";
  button.setAttribute("aria-live", "polite");
  let timer;
  button.addEventListener("click", async () => {
    try {
      await copyText(code.textContent);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Press Ctrl+C";
      getSelection().selectAllChildren(code);
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      button.textContent = "Copy";
    }, 2000);
  });
  block.prepend(button);
}

// Range inputs change the width of their responsive demo frame.
for (const input of document.querySelectorAll("input[type=range][data-frame]")) {
  const frame = document.getElementById(input.dataset.frame);
  const update = () => {
    frame.style.inlineSize = `${input.value}%`;
  };
  input.addEventListener("input", update);
  update();
}

// Motion demo: move the dots with each duration token.
for (const toggle of document.querySelectorAll("[data-motion-toggle]")) {
  const demo = toggle.closest(".sc-card").querySelector("[data-motion]");
  toggle.addEventListener("click", () => {
    const playing = demo.classList.toggle("sc-is-playing");
    toggle.setAttribute("aria-pressed", String(playing));
  });
}

// Behaviors demo: bring a dismissed alert back.
for (const button of document.querySelectorAll("[data-sc-restore]")) {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.scRestore).hidden = false;
  });
}
