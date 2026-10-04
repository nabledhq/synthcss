// SynthJS (src/js/synth.js) in a real DOM: happy-dom, real elements, real events.
// The script under test is the built dist/synth.js, evaluated in a fresh context
// that only has window, document and console, as a classic <script> would.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { Window } from "happy-dom";
import { build } from "./build.mjs";

const src = new URL("../src/", import.meta.url);
const SCRIPT = build("0.0.0", (file) => readFileSync(new URL(file, src), "utf8"))["synth.js"];

// Loads html into a new page, then runs synth.js. Returns the page and the
// console.warn calls the script made. An exception in a SynthJS listener (which
// happy-dom reports as a window error event, as browsers do) fails the test.
// Assertions compare element ids: a failing assert on a happy-dom element would
// try to print its whole object graph.
function page(t, html, { readyState } = {}) {
  const window = new Window({ url: "https://example.test/" });
  const { document } = window;
  document.body.innerHTML = html;
  if (readyState) Object.defineProperty(document, "readyState", { value: readyState, configurable: true });
  const warnings = [];
  const errors = [];
  window.addEventListener("error", (event) => errors.push(String(event.error ?? event.message)));
  const run = () => vm.runInNewContext(SCRIPT, { window, document, console: { warn: (...args) => warnings.push(args) } });
  run();
  t.after(async () => {
    await window.happyDOM.close();
    assert.deepEqual(errors, [], "SynthJS threw in a listener");
  });
  const $ = (selector) => document.querySelector(selector);
  const focused = () => document.activeElement?.id;
  const key = (el, k) => el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  return { window, document, $, key, focused, warnings: { list: warnings, messages: () => warnings.map(([m]) => m) }, run };
}

const TOGGLE = `
  <button type="button" id="open-filters" data-synth-toggle="filters">Filters</button>
  <div id="filters" hidden>Filter form</div>
  <button type="button" id="hide-help" data-synth-toggle="help" aria-controls="help other">Help</button>
  <p id="help">Help text</p>`;

const TABS = `
  <div data-synth-tabs>
    <div class="tabs" role="tablist" aria-label="Range">
      <button type="button" class="tabs-item" role="tab" id="t-day" aria-controls="p-day" aria-selected="false">Day</button>
      <button type="button" class="tabs-item" role="tab" id="t-week" aria-controls="p-week" aria-selected="true">Week</button>
      <button type="button" class="tabs-item" role="tab" id="t-month" aria-controls="p-month" aria-selected="false">Month</button>
    </div>
    <div role="tabpanel" id="p-day" aria-labelledby="t-day">Day panel</div>
    <div role="tabpanel" id="p-week" aria-labelledby="t-week" hidden>Week panel</div>
    <div role="tabpanel" id="p-month" aria-labelledby="t-month">Month panel</div>
  </div>`;

const DROPDOWN = `
  <div data-synth-dropdown id="account">
    <button type="button" class="button" data-synth-dropdown-trigger>Account</button>
    <ul class="nav stack-sm" role="list" id="account-menu" data-synth-dropdown-menu hidden>
      <li><a class="nav-link" href="#profile">Profile</a></li>
      <li><button type="button" id="inside">Sign out</button></li>
    </ul>
  </div>
  <button type="button" id="outside">Elsewhere</button>`;

const DIALOG = `
  <button type="button" id="opener" data-synth-open="confirm">Delete…</button>
  <button type="button" id="other">Other</button>
  <dialog id="confirm" aria-labelledby="confirm-title">
    <h2 id="confirm-title">Delete project?</h2>
    <button type="button" id="cancel" data-synth-dismiss>Cancel</button>
  </dialog>`;

const state = (tabs) => tabs.map((t) => [t.id, t.getAttribute("aria-selected"), t.getAttribute("tabindex")]);

test("defines window.Synth and initializes the page on load", (t) => {
  const { window, $, document, warnings } = page(t, TOGGLE + TABS + DROPDOWN);
  assert.equal(typeof window.Synth.init, "function");
  assert.equal($("#open-filters").getAttribute("aria-expanded"), "false");
  assert.equal($("#t-week").getAttribute("tabindex"), "0");
  assert.equal($("[data-synth-dropdown-trigger]").getAttribute("aria-expanded"), "false");
  // One rule so hidden beats the display of SynthCSS classes (.nav, .stack, .alert).
  const rule = document.querySelectorAll("style[data-synth]");
  assert.equal(rule.length, 1);
  assert.match(rule[0].textContent, /\[hidden\][^{]*\{ display: none !important; \}/);
  assert.deepEqual(warnings.messages(), []);
});

test("waits for DOMContentLoaded while the document is loading", (t) => {
  const { window, document, $ } = page(t, TOGGLE, { readyState: "loading" });
  assert.equal(typeof window.Synth.init, "function");
  assert.equal($("#open-filters").hasAttribute("aria-expanded"), false);
  document.dispatchEvent(new window.Event("DOMContentLoaded"));
  assert.equal($("#open-filters").getAttribute("aria-expanded"), "false");
});

test("Synth.init(root) initializes markup inserted later", (t) => {
  const { window, document, $ } = page(t, "");
  const box = document.createElement("section");
  box.innerHTML = TOGGLE + TABS;
  document.body.append(box);
  assert.equal($("#open-filters").hasAttribute("aria-expanded"), false);
  window.Synth.init(box);
  assert.equal($("#open-filters").getAttribute("aria-expanded"), "false");
  assert.equal($("#open-filters").getAttribute("aria-controls"), "filters");
  assert.equal($("#t-day").getAttribute("tabindex"), "-1");
  // An element can be the root itself.
  const solo = document.createElement("div");
  solo.innerHTML = '<button type="button" id="solo" data-synth-toggle="filters">More</button>';
  document.body.append(solo);
  window.Synth.init($("#solo"));
  assert.equal($("#solo").getAttribute("aria-expanded"), "false");
});

test("repeated Synth.init() and a second copy of the script never double-bind", (t) => {
  const { window, document, $, run } = page(t, TOGGLE + TABS + DROPDOWN + DIALOG);
  window.Synth.init();
  window.Synth.init(document);
  window.Synth.init(document.body);
  const first = window.Synth;
  run();
  assert.ok(window.Synth === first, "a second copy keeps the first Synth");
  assert.equal(document.querySelectorAll("style[data-synth]").length, 1);

  // A doubled handler would toggle twice and leave everything as it was.
  $("#open-filters").click();
  assert.equal($("#filters").hidden, false);
  assert.equal($("#open-filters").getAttribute("aria-expanded"), "true");
  $("[data-synth-dropdown-trigger]").click();
  assert.equal($("#account-menu").hidden, false);

  let opened = 0;
  const dialog = $("#confirm");
  const showModal = dialog.showModal.bind(dialog);
  dialog.showModal = () => (opened++, showModal());
  $("#opener").click();
  assert.equal(opened, 1);
  assert.equal(dialog.open, true);

  let closes = 0;
  $("#opener").focus = () => closes++;
  dialog.close();
  assert.equal(closes, 1, "focus returns once");
});

test("data-synth-open shows the dialog modally and returns focus to the opener on close", (t) => {
  const { $, focused } = page(t, DIALOG);
  const dialog = $("#confirm");
  $("#opener").focus();
  $("#opener").click();
  assert.equal(dialog.open, true);
  $("#cancel").focus();
  // Escape closes a modal <dialog> natively, which fires close like this does.
  dialog.close();
  assert.equal(dialog.open, false);
  assert.equal(focused(), "opener");

  // Opening an open dialog again is a no-op.
  $("#opener").click();
  $("#opener").click();
  assert.equal(dialog.open, true);
});

test("data-synth-dismiss closes its dialog, and focus returns to the opener", (t) => {
  const { $, focused } = page(t, DIALOG);
  $("#opener").click();
  $("#cancel").focus();
  $("#cancel").click();
  assert.equal($("#confirm").open, false);
  assert.equal(focused(), "opener");
});

test("data-synth-dismiss hides its [data-synth-dismissible] ancestor without removing it", (t) => {
  const { $, warnings } = page(t, `
    <div class="alert alert-success" role="status" data-synth-dismissible id="saved">
      <p>Settings saved.</p>
      <button type="button" class="button button-sm" data-synth-dismiss aria-label="Dismiss"><span>×</span></button>
    </div>`);
  $("[data-synth-dismiss] span").click();
  assert.equal($("#saved").hidden, true);
  assert.ok($("#saved").isConnected);
  assert.deepEqual(warnings.messages(), []);
});

test("data-synth-toggle flips hidden and keeps aria-expanded in sync from the initial state", (t) => {
  const { $ } = page(t, TOGGLE + '<button type="button" id="second" data-synth-toggle="filters">Also filters</button>');
  const [button, target] = [$("#open-filters"), $("#filters")];
  // Initial state comes from the target's hidden attribute.
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal($("#hide-help").getAttribute("aria-expanded"), "true");
  // aria-controls is added when missing and kept when present.
  assert.equal(button.getAttribute("aria-controls"), "filters");
  assert.equal($("#hide-help").getAttribute("aria-controls"), "help other");

  button.click();
  assert.equal(target.hidden, false);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal($("#second").getAttribute("aria-expanded"), "true", "every trigger of the target is synced");
  button.click();
  assert.equal(target.hidden, true);
  assert.equal(button.getAttribute("aria-expanded"), "false");

  $("#hide-help").click();
  assert.equal($("#help").hidden, true);
  assert.equal($("#hide-help").getAttribute("aria-expanded"), "false");
});

test("data-synth-tabs selects on click: aria-selected, roving tabindex and panel hidden", (t) => {
  const { document, $ } = page(t, TABS);
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  // Init applies the markup's selected tab to tabindex and panels.
  assert.deepEqual(state(tabs), [["t-day", "false", "-1"], ["t-week", "true", "0"], ["t-month", "false", "-1"]]);
  assert.deepEqual(panels.map((p) => p.hidden), [true, false, true]);

  $("#t-month").click();
  assert.deepEqual(state(tabs), [["t-day", "false", "-1"], ["t-week", "false", "-1"], ["t-month", "true", "0"]]);
  assert.deepEqual(panels.map((p) => p.hidden), [true, true, false]);
});

test("data-synth-tabs: ArrowRight/ArrowLeft wrap, Home and End jump, focus follows", (t) => {
  const { document, $, key, focused } = page(t, TABS);
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const selected = () => tabs.find((tab) => tab.getAttribute("aria-selected") === "true").id;
  const press = (k) => {
    const event = key(document.activeElement, k);
    assert.equal(event, false, `${k} is handled (default prevented)`);
    assert.equal(focused(), selected(), "focus moves with the selection");
    assert.deepEqual(tabs.map((tab) => tab.getAttribute("tabindex")), tabs.map((tab) => (tab.id === selected() ? "0" : "-1")));
    assert.deepEqual(panels.map((p) => p.hidden), tabs.map((tab) => tab.id !== selected()));
    return selected();
  };
  $("#t-week").focus();
  assert.equal(press("ArrowRight"), "t-month");
  assert.equal(press("ArrowRight"), "t-day", "ArrowRight wraps to the first tab");
  assert.equal(press("ArrowLeft"), "t-month", "ArrowLeft wraps to the last tab");
  assert.equal(press("ArrowLeft"), "t-week");
  assert.equal(press("Home"), "t-day");
  assert.equal(press("End"), "t-month");
  // Other keys are left alone.
  assert.equal(key(document.activeElement, "ArrowDown"), true);
  assert.equal(selected(), "t-month");
});

test("data-synth-dropdown toggles on the trigger and closes on an outside click", (t) => {
  const { $, focused } = page(t, DROPDOWN);
  const [trigger, menu] = [$("[data-synth-dropdown-trigger]"), $("#account-menu")];
  assert.equal(trigger.getAttribute("aria-controls"), "account-menu");
  trigger.click();
  assert.equal(menu.hidden, false);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  $("#inside").click();
  assert.equal(menu.hidden, false, "a click inside the menu keeps it open");
  $("#outside").focus();
  $("#outside").click();
  assert.equal(menu.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(focused(), "outside", "an outside click does not move focus");
  trigger.click();
  trigger.click();
  assert.equal(menu.hidden, true, "the trigger closes it again");
});

test("data-synth-dropdown closes on Escape and returns focus to the trigger", (t) => {
  const { $, key, focused } = page(t, DROPDOWN);
  const [trigger, menu] = [$("[data-synth-dropdown-trigger]"), $("#account-menu")];
  trigger.id = "trigger";
  trigger.click();
  $("#inside").focus();
  assert.equal(key($("#inside"), "Escape"), false);
  assert.equal(menu.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(focused(), "trigger");
  // With no open menu, Escape is left to the browser (e.g. to close a dialog).
  assert.equal(key(trigger, "Escape"), true);
});

test("data-synth-dropdown falls back to the first button and a role=menu element", (t) => {
  const { $ } = page(t, `
    <div data-synth-dropdown>
      <button type="button" id="more">More</button>
      <div role="menu" id="more-menu" hidden><button type="button" role="menuitem">Rename</button></div>
    </div>`);
  assert.equal($("#more").getAttribute("aria-expanded"), "false");
  $("#more").click();
  assert.equal($("#more-menu").hidden, false);
  assert.equal($("#more").getAttribute("aria-expanded"), "true");
});

test("a missing or invalid target warns once per element and never throws", (t) => {
  const { window, $, warnings } = page(t, `
    <button type="button" id="b1" data-synth-open="nope">Open</button>
    <button type="button" id="b2" data-synth-open="not-a-dialog">Open</button><div id="not-a-dialog"></div>
    <button type="button" id="b3" data-synth-toggle="missing">Toggle</button>
    <button type="button" id="b4" data-synth-toggle>Toggle</button>
    <button type="button" id="b5" data-synth-dismiss>Dismiss</button>
    <div data-synth-tabs id="w6"><button type="button" role="tab" id="b6" aria-selected="true">Lonely</button></div>
    <div data-synth-tabs id="w7"></div>
    <div data-synth-dropdown id="w8"><button type="button" id="b8">No menu</button></div>`);
  const warnedAbout = () => warnings.list.map(([message, el]) => {
    assert.match(message, /^SynthJS: /);
    return el.id;
  });
  assert.deepEqual(warnedAbout().sort(), ["b1", "b2", "b3", "b4", "b5", "b6", "w7", "w8"]);
  for (const id of ["b1", "b2", "b3", "b4", "b5", "b6", "b8"]) assert.doesNotThrow(() => $(`#${id}`).click());
  assert.doesNotThrow(() => window.Synth.init());
  assert.equal(warnings.list.length, 8, "no repeated warnings after clicks or another init");
  assert.equal($("#b6").getAttribute("aria-selected"), "true", "tabs without panels still select");
});

test("the showcase demos initialize without warnings and respond", (t) => {
  const html = readFileSync(new URL("../showcase/index.html", import.meta.url), "utf8");
  const body = html.split(/<body[^>]*>/)[1].split("</body>")[0];
  const { $, key, focused, warnings } = page(t, body);
  assert.deepEqual(warnings.messages(), []);

  $('[data-synth-open="demo-confirm"]').click();
  assert.equal($("#demo-confirm").open, true);
  $("#demo-confirm [data-synth-dismiss]").click();
  assert.equal($("#demo-confirm").open, false);

  $('[data-synth-toggle="demo-filters"]').click();
  assert.equal($("#demo-filters").hidden, false);

  $("#demo-tab-week").focus();
  key($("#demo-tab-week"), "End");
  assert.equal(focused(), "demo-tab-month");
  assert.equal($("#demo-panel-month").hidden, false);
  assert.equal($("#demo-panel-week").hidden, true);

  const menu = $("#behavior-dropdown ~ .sc-demo [data-synth-dropdown-menu]");
  $("#behavior-dropdown ~ .sc-demo [data-synth-dropdown-trigger]").click();
  assert.equal(menu.hidden, false);
  $("#behaviors-title").click();
  assert.equal(menu.hidden, true);

  $("#demo-saved [data-synth-dismiss]").click();
  assert.equal($("#demo-saved").hidden, true);
});
