/*! SynthCSS v0.10.0 | synth.js | MIT License | https://github.com/nabledhq/synthcss */
/*
 * SynthJS: optional behaviors for SynthCSS markup.
 *
 * Markup declares intent with one data-synth-* attribute; this script adds the
 * events and keeps the ARIA state in sync. SynthCSS needs no JavaScript: pages
 * that do not load this file keep working, they just lose these behaviors.
 *
 *   data-synth-open="<id>"   button: showModal() on <dialog id>; focus returns on close
 *   data-synth-dismiss       button: closes its <dialog>, or hides its [data-synth-dismissible]
 *   data-synth-toggle="<id>" button: toggles hidden on #id; aria-expanded / aria-controls
 *   data-synth-tabs          container of role="tab" / role="tabpanel"; click, arrows, Home, End
 *   data-synth-dropdown      wrapper of a trigger button and a menu; outside click and Escape close
 *
 * Plain browser script with no dependencies: it defines window.Synth and
 * initializes itself on DOMContentLoaded. Call Synth.init(element) after
 * inserting markup; calling it again on the same markup does nothing.
 *
 * Reference: docs/behaviors.md
 */
(function () {
  "use strict";

  // Loaded twice: keep the first copy, so listeners are never bound twice.
  if (window.Synth) return;

  var warned = new WeakSet();
  var ready = new WeakSet();
  var listening = new WeakSet();
  var openers = new WeakMap();
  var watched = new WeakSet();

  // One warning per element, never an exception.
  function warn(el, message) {
    if (warned.has(el)) return;
    warned.add(el);
    console.warn("SynthJS: " + message, el);
  }

  // Elements under root matching selector, root included.
  function all(root, selector) {
    var found = Array.prototype.slice.call(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) found.unshift(root);
    return found;
  }

  function targetOf(el, attribute) {
    var id = el.getAttribute(attribute);
    var target = id ? el.ownerDocument.getElementById(id) : null;
    if (!target) warn(el, attribute + '="' + (id || "") + '" names no element id in the document');
    return target;
  }

  // Open: data-synth-open="<dialog id>".
  function dialogOf(button) {
    var dialog = targetOf(button, "data-synth-open");
    if (dialog && (dialog.tagName !== "DIALOG" || typeof dialog.showModal !== "function")) {
      warn(button, 'data-synth-open must name a <dialog>, found <' + dialog.tagName.toLowerCase() + ">");
      return null;
    }
    return dialog;
  }

  function open(button) {
    var dialog = dialogOf(button);
    if (!dialog || dialog.open) return;
    openers.set(dialog, button);
    if (!watched.has(dialog)) {
      watched.add(dialog);
      // Escape (native), dismiss buttons and dialog.close() all end here.
      dialog.addEventListener("close", function () {
        var opener = openers.get(dialog);
        openers.delete(dialog);
        if (opener && opener.isConnected) opener.focus();
      });
    }
    dialog.showModal();
  }

  // Dismiss: closest <dialog>, otherwise closest [data-synth-dismissible].
  function dismiss(button) {
    var dialog = button.closest("dialog");
    if (dialog) {
      if (dialog.open) dialog.close();
      return;
    }
    var box = button.closest("[data-synth-dismissible]");
    if (box) box.hidden = true;
    else warn(button, "data-synth-dismiss is not inside a <dialog> or a [data-synth-dismissible] element");
  }

  // Toggle: data-synth-toggle="<id>" flips hidden on the target.
  function syncToggle(button, target) {
    if (!button.hasAttribute("aria-controls")) button.setAttribute("aria-controls", target.id);
    button.setAttribute("aria-expanded", String(!target.hidden));
  }

  function toggle(button) {
    var target = targetOf(button, "data-synth-toggle");
    if (!target) return;
    target.hidden = !target.hidden;
    // Every button that controls the same target reports the same state.
    all(button.ownerDocument, "[data-synth-toggle]").forEach(function (other) {
      if (other.getAttribute("data-synth-toggle") === target.id) syncToggle(other, target);
    });
  }

  // Tabs: role="tab" elements of a [data-synth-tabs] container (not of a nested one).
  function tabsOf(container) {
    return all(container, '[role="tab"]').filter(function (tab) {
      return tab.closest("[data-synth-tabs]") === container;
    });
  }

  function panelOf(tab) {
    var id = tab.getAttribute("aria-controls");
    var panel = id ? tab.ownerDocument.getElementById(id) : null;
    if (!panel) warn(tab, 'role="tab" needs aria-controls naming the id of its role="tabpanel" element');
    return panel;
  }

  function select(container, selected, moveFocus) {
    tabsOf(container).forEach(function (tab) {
      var on = tab === selected;
      tab.setAttribute("aria-selected", String(on));
      tab.setAttribute("tabindex", on ? "0" : "-1");
      var panel = panelOf(tab);
      if (panel) panel.hidden = !on;
    });
    if (moveFocus) selected.focus();
  }

  function initTabs(container) {
    var tabs = tabsOf(container);
    if (!tabs.length) {
      warn(container, 'data-synth-tabs contains no role="tab" elements');
      return;
    }
    var selected = tabs.filter(function (tab) {
      return tab.getAttribute("aria-selected") === "true";
    })[0];
    select(container, selected || tabs[0], false);
  }

  var TAB_KEYS = { ArrowRight: 1, ArrowLeft: -1, Home: 0, End: 0 };

  function tabKey(event, tab, container) {
    var tabs = tabsOf(container).filter(function (t) {
      return !t.disabled;
    });
    var i = tabs.indexOf(tab);
    if (i === -1) return;
    var next =
      event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + TAB_KEYS[event.key] + tabs.length) % tabs.length;
    event.preventDefault();
    select(container, tabs[next], true);
  }

  // Dropdown: a trigger button and a menu inside [data-synth-dropdown].
  function dropdownOf(wrapper) {
    var trigger = wrapper.querySelector("[data-synth-dropdown-trigger]") || wrapper.querySelector("button");
    var menu = wrapper.querySelector("[data-synth-dropdown-menu]") || wrapper.querySelector('[role="menu"]');
    if (!trigger || !menu) {
      warn(wrapper, "data-synth-dropdown needs a trigger <button> and a [data-synth-dropdown-menu] element");
      return null;
    }
    return { trigger: trigger, menu: menu };
  }

  function setDropdown(parts, expanded) {
    parts.menu.hidden = !expanded;
    parts.trigger.setAttribute("aria-expanded", String(expanded));
  }

  function initDropdown(wrapper) {
    var parts = dropdownOf(wrapper);
    if (!parts) return;
    if (parts.menu.id && !parts.trigger.hasAttribute("aria-controls")) parts.trigger.setAttribute("aria-controls", parts.menu.id);
    parts.trigger.setAttribute("aria-expanded", String(!parts.menu.hidden));
  }

  // Open dropdowns, each with its wrapper.
  function openDropdowns(doc) {
    return all(doc, "[data-synth-dropdown]")
      .map(function (wrapper) {
        var parts = dropdownOf(wrapper);
        if (parts) parts.wrapper = wrapper;
        return parts;
      })
      .filter(function (parts) {
        return parts && !parts.menu.hidden;
      });
  }

  // Delegated listeners: one pair per document, whatever the number of init() calls.
  function onClick(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    openDropdowns(target.ownerDocument).forEach(function (parts) {
      if (!parts.wrapper.contains(target)) setDropdown(parts, false);
    });

    var el = target.closest("[data-synth-open]");
    if (el) open(el);
    el = target.closest("[data-synth-dismiss]");
    if (el) dismiss(el);
    el = target.closest("[data-synth-toggle]");
    if (el) toggle(el);
    el = target.closest('[role="tab"]');
    var container = el && el.closest("[data-synth-tabs]");
    if (container) select(container, el, false);
    el = target.closest("[data-synth-dropdown]");
    var parts = el && dropdownOf(el);
    if (parts && parts.trigger.contains(target)) setDropdown(parts, parts.menu.hidden);
  }

  function onKeydown(event) {
    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    if (event.key === "Escape") {
      // Inside an open dialog, only its own menus: Escape then closes the dialog.
      var dialog = target.closest("dialog[open]");
      var expanded = openDropdowns(target.ownerDocument).filter(function (parts) {
        return !dialog || dialog.contains(parts.wrapper);
      });
      if (!expanded.length) return;
      // Close the menus, not the dialog they may sit in.
      event.preventDefault();
      expanded.forEach(function (parts) {
        setDropdown(parts, false);
      });
      var inner = expanded.filter(function (parts) {
        return parts.wrapper.contains(target);
      })[0];
      (inner || expanded[expanded.length - 1]).trigger.focus();
      return;
    }

    if (event.key in TAB_KEYS && !event.altKey && !event.ctrlKey && !event.metaKey) {
      var tab = target.closest('[role="tab"]');
      var container = tab && tab.closest("[data-synth-tabs]");
      if (container) tabKey(event, tab, container);
    }
  }

  // SynthCSS classes such as .alert, .stack or .nav set display, which beats the
  // browser's [hidden] rule. This one rule lets hidden hide them.
  function addHiddenRule(doc) {
    if (doc.querySelector("style[data-synth]")) return;
    var style = doc.createElement("style");
    style.setAttribute("data-synth", "");
    style.textContent = '[hidden]:not([hidden="until-found"]) { display: none !important; }';
    (doc.head || doc.documentElement).appendChild(style);
  }

  // Sets the initial ARIA state of the markup under root (default: the whole
  // document) and checks its targets. Safe to call any number of times.
  function init(root) {
    root = root || document;
    var doc = root.ownerDocument || root;
    if (!listening.has(doc)) {
      listening.add(doc);
      doc.addEventListener("click", onClick);
      doc.addEventListener("keydown", onKeydown);
      addHiddenRule(doc);
    }
    var steps = [
      ["[data-synth-open]", dialogOf],
      ["[data-synth-toggle]", function (button) {
        var target = targetOf(button, "data-synth-toggle");
        if (target) syncToggle(button, target);
      }],
      ["[data-synth-dismiss]", function (button) {
        if (!button.closest("dialog, [data-synth-dismissible]")) {
          warn(button, "data-synth-dismiss is not inside a <dialog> or a [data-synth-dismissible] element");
        }
      }],
      ["[data-synth-tabs]", initTabs],
      ["[data-synth-dropdown]", initDropdown],
    ];
    steps.forEach(function (step) {
      all(root, step[0]).forEach(function (el) {
        if (ready.has(el)) return;
        ready.add(el);
        step[1](el);
      });
    });
  }

  window.Synth = Object.freeze({ init: init });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(document);
    });
  } else {
    init(document);
  }
})();
