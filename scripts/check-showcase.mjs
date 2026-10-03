#!/usr/bin/env node
// Dependency-free verification of the static showcase site (showcase/) and its
// GitHub Pages workflow.
// Usage: node scripts/check-showcase.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseBlocks, parseDeclarations, parseTokens } from "./check-tokens.mjs";
import { PRIMITIVES, VARIANTS, HELPER_CLASSES } from "./check-layout.mjs";
import { COMPONENTS, COMPONENT_CLASSES } from "./check-components.mjs";

export const SECTIONS = ["hero", "why", "tokens", "layouts", "responsive", "components", "composed", "ai-examples"];
// The composed interface must use at least this many different components.
export const MIN_COMPOSED_COMPONENTS = 6;
export const RESPONSIVE = ["grid", "sidebar", "cluster", "split"];
export const TAGLINE = "CSS designed to be written by machines and used by humans.";
export const REPO_URL = "https://github.com/nabledhq/synthcss";
export const PAGES_ACTIONS = ["actions/configure-pages@", "actions/upload-pages-artifact@", "actions/deploy-pages@"];
export const MAX_SNIPPET_LINES = 15;

const FRAMEWORK_CLASSES = new Set([...PRIMITIVES, ...VARIANTS, ...HELPER_CLASSES, ...COMPONENT_CLASSES]);
const THIRD_PARTY = /\b(bootstrap|tailwind|bulma|foundation|materialize|material-ui|@mui|daisyui|pico\.css)\b/i;
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const unescapeHtml = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

// Returns the HTML of <section id="..."> up to the next top-level section or the page footer.
function sectionHtml(html, id) {
  const start = html.search(new RegExp(`<section\\b[^>]*\\bid="${id}"`));
  if (start === -1) return null;
  const rest = html.slice(start + 1);
  const end = rest.search(/<section\b[^>]*\bid="|<\/main>|<footer class="sc-footer"/);
  return end === -1 ? rest : rest.slice(0, end);
}

// Splits a selector list on top-level commas (not the ones inside :where()).
function splitSelectors(prelude) {
  const out = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else current += ch;
  }
  out.push(current.trim());
  return out;
}

const classesIn = (html) => [...html.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
const snippetsIn = (html) => [...html.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => unescapeHtml(m[1]));

export function checkHtml(html, tokens, showcaseClasses) {
  const errors = [];
  const tokenNames = [...tokens.keys()];

  if (!/<link rel="stylesheet" href="\.\.\/src\/synthcss\.css">/.test(html)) {
    errors.push('index.html must load the framework with <link rel="stylesheet" href="../src/synthcss.css">');
  }
  if (!/<link rel="stylesheet" href="showcase\.css">/.test(html)) errors.push("index.html must load showcase.css");
  for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    if (!["../src/synthcss.css", "showcase.css"].includes(m[1])) errors.push(`index.html loads an extra stylesheet: ${m[1]}`);
  }
  if (/<style\b/i.test(html)) errors.push("index.html must not contain <style> blocks; put showcase styles in showcase.css");
  if (/<script\b[^>]*\bsrc="(?:https?:)?\/\//i.test(html)) errors.push("index.html must not load third-party scripts");
  if (THIRD_PARTY.test(html)) errors.push("index.html references a third-party CSS framework");

  for (const id of SECTIONS) {
    if (!sectionHtml(html, id)) errors.push(`missing <section id="${id}">`);
  }

  const hero = sectionHtml(html, "hero") ?? "";
  if (!/<h1\b[^>]*>SynthCSS<\/h1>/.test(hero)) errors.push("hero must have the project name in an <h1>");
  if (!hero.includes(TAGLINE)) errors.push("hero must contain the tagline");
  if (!/AI-generated interfaces/.test(hero)) errors.push("hero must state that SynthCSS targets AI-generated interfaces");
  if (!hero.includes(`href="${REPO_URL}"`)) errors.push("hero must link to the GitHub repository");
  if (!hero.includes(`href="${REPO_URL}#readme"`)) errors.push("hero must link to the documentation");

  const why = sectionHtml(html, "why") ?? "";
  const whyCards = (why.match(/<li\b/g) ?? []).length;
  if (whyCards !== 4) errors.push(`"Why SynthCSS" must have exactly 4 points, found ${whyCards}`);

  // Every token must be rendered with var(--token) somewhere on the page.
  const tokenSection = sectionHtml(html, "tokens") ?? "";
  for (const name of tokenNames) {
    if (!tokenSection.includes(`var(${name})`) && !tokenSection.includes(`<code>${name}</code>`)) {
      errors.push(`token ${name} is not shown in the tokens section`);
    }
  }

  const layouts = sectionHtml(html, "layouts") ?? "";
  const articles = layouts.split(/<article\b/).slice(1);
  for (const p of PRIMITIVES) {
    const article = articles.find((a) => a.includes(`id="layout-${p}"`));
    if (!article) {
      errors.push(`layouts: missing example for .${p}`);
      continue;
    }
    if (!article.includes(`<code>.${p}</code>`)) errors.push(`layouts: .${p} example must show its class name`);
    if (!/<\/h3>\s*<p>[^<]+(<code>[^<]+<\/code>[^<]*)*<\/p>/.test(article)) {
      errors.push(`layouts: .${p} example must have a one-sentence description after its heading`);
    }
    const demo = article.split('class="sc-code"')[0];
    if (!classesIn(demo.split('class="sc-demo"')[1] ?? "").some((c) => c === p || c.startsWith(`${p}-`))) {
      errors.push(`layouts: .${p} example has no live demo using .${p}`);
    }
    const snippet = snippetsIn(article)[0];
    if (!snippet || !new RegExp(`class="([^"]*\\s)?${p}(\\s[^"]*)?"`).test(snippet)) {
      errors.push(`layouts: .${p} example needs an HTML snippet that uses .${p}`);
    }
  }

  const responsive = sectionHtml(html, "responsive") ?? "";
  for (const p of RESPONSIVE) {
    const frame = responsive.split(`id="frame-${p}"`)[1];
    if (!frame || !/class="sc-frame"/.test(responsive)) {
      errors.push(`responsive: missing width-adjustable frame for .${p}`);
      continue;
    }
    if (!responsive.includes(`data-frame="frame-${p}"`)) errors.push(`responsive: .${p} frame has no width slider`);
    const inner = frame.split(/<\/article>/)[0];
    if (!classesIn(inner).some((c) => c === p || c.startsWith(`${p}-`))) {
      errors.push(`responsive: .${p} frame does not use .${p}`);
    }
  }

  // One article per component, each with a description, a live demo and a snippet.
  const components = sectionHtml(html, "components") ?? "";
  const componentArticles = components.split(/<article\b/).slice(1);
  for (const [name, classes] of Object.entries(COMPONENTS)) {
    const article = componentArticles.find((a) => a.includes(`id="component-${name}"`));
    if (!article) {
      errors.push(`components: missing example for .${name}`);
      continue;
    }
    if (!article.includes(`<code>.${name}</code>`)) errors.push(`components: .${name} example must show its class name`);
    const demo = article.split('class="sc-code"')[0].split('class="sc-demo"')[1] ?? "";
    const demoClasses = classesIn(demo);
    if (!demoClasses.includes(name)) errors.push(`components: .${name} example has no live demo using .${name}`);
    for (const cls of classes) {
      if (!demoClasses.includes(cls)) errors.push(`components: .${name} live demo does not show .${cls}`);
    }
    const snippet = snippetsIn(article)[0];
    if (!snippet || !new RegExp(`class="([^"]*\\s)?${name}(\\s[^"]*)?"`).test(snippet)) {
      errors.push(`components: .${name} example needs an HTML snippet that uses .${name}`);
    }
  }

  // A composed interface built only from framework classes.
  const composed = sectionHtml(html, "composed") ?? "";
  const app = composed.split("data-composed")[1];
  if (!app) {
    errors.push("composed: missing the data-composed interface");
  } else {
    const appClasses = classesIn(app);
    for (const cls of new Set(appClasses)) {
      if (!FRAMEWORK_CLASSES.has(cls)) errors.push(`composed: uses .${cls}; the composed interface may only use SynthCSS classes`);
    }
    if (/\bstyle="(?![^"]*--grid-min)/.test(app)) errors.push("composed: inline styles other than --grid-min are not allowed");
    const usedComponents = Object.keys(COMPONENTS).filter((n) => appClasses.includes(n));
    if (usedComponents.length < MIN_COMPOSED_COMPONENTS) {
      errors.push(`composed: uses ${usedComponents.length} components, needs at least ${MIN_COMPOSED_COMPONENTS}`);
    }
  }

  const ai = sectionHtml(html, "ai-examples") ?? "";
  const pairs = ai.split(/<li class="sc-card/).slice(1).filter((c) => c.includes(">Intent<") && c.includes(">SynthCSS<") && c.includes("<pre><code>"));
  if (pairs.length < 3) errors.push(`ai-examples: need at least 3 Intent / SynthCSS pairs, found ${pairs.length}`);
  for (const p of ["cluster", "grid"]) {
    if (!pairs.some((c) => snippetsIn(c).some((s) => s.includes(`class="${p}"`)))) {
      errors.push(`ai-examples: missing the .${p} example`);
    }
  }

  // Code samples: short, and only real SynthCSS classes and tokens.
  for (const [i, snippet] of snippetsIn(html).entries()) {
    const label = `snippet ${i + 1} (${snippet.split("\n")[0].trim()})`;
    const lines = snippet.split("\n").length;
    if (lines > MAX_SNIPPET_LINES) errors.push(`${label} has ${lines} lines, max ${MAX_SNIPPET_LINES}`);
    for (const cls of classesIn(snippet)) {
      if (!FRAMEWORK_CLASSES.has(cls)) errors.push(`${label} uses .${cls}, which is not a SynthCSS class`);
    }
    for (const m of snippet.matchAll(/(--[\w-]+)/g)) {
      if (!tokens.has(m[1])) errors.push(`${label} uses ${m[1]}, which is not a SynthCSS token`);
    }
  }

  // Inline styles may only use or locally override existing tokens.
  for (const m of html.matchAll(/\bstyle="([^"]*)"/g)) {
    for (const v of m[1].matchAll(/(--[\w-]+)/g)) {
      if (!tokens.has(v[1])) errors.push(`inline style uses unknown token ${v[1]}`);
    }
    if (COLOR_LITERAL.test(m[1])) errors.push(`inline style hard-codes a color: ${m[1]}`);
  }

  for (const cls of new Set(classesIn(html))) {
    if (!FRAMEWORK_CLASSES.has(cls) && !showcaseClasses.has(cls)) {
      errors.push(`index.html uses .${cls}, which is neither a SynthCSS class nor defined in showcase.css`);
    }
  }
  return errors;
}

export function checkShowcaseCss(rawCss, tokens) {
  const errors = [];
  const css = stripComments(rawCss);
  const classes = new Set();
  const rawValues = new Set([...tokens.values()].map((v) => v.toLowerCase()));

  if (/@import\b/i.test(css)) errors.push("showcase.css must not @import other stylesheets");
  if (THIRD_PARTY.test(css)) errors.push("showcase.css references a third-party CSS framework");

  let blocks;
  try {
    blocks = parseBlocks(css);
  } catch (err) {
    return { errors: [`showcase.css: ${err.message}`], classes };
  }
  for (const { prelude, body } of blocks) {
    if (prelude.startsWith("@")) {
      errors.push(`showcase.css: at-rules are not allowed (${prelude}); keep the showcase intrinsic like the framework`);
      continue;
    }
    for (const selector of splitSelectors(prelude)) {
      const own = [...selector.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      own.forEach((c) => c.startsWith("sc-") && classes.add(c));
      if (!own.some((c) => c.startsWith("sc-"))) {
        errors.push(`showcase.css: selector "${selector}" must be scoped with an sc- class`);
      }
      for (const c of own) {
        if (!c.startsWith("sc-")) errors.push(`showcase.css: selector "${selector}" targets the framework class .${c}`);
      }
    }
    for (const { prop, value } of parseDeclarations(body)) {
      if (!prop) continue;
      if (prop.startsWith("--")) errors.push(`showcase.css: must not define custom properties (${prop})`);
      if (COLOR_LITERAL.test(value)) errors.push(`showcase.css: hard-coded color in ${prop}: ${value}`);
      for (const m of value.matchAll(/var\((--[\w-]+)/g)) {
        if (!tokens.has(m[1])) errors.push(`showcase.css: ${prop} uses unknown token ${m[1]}`);
      }
      const parts = value.toLowerCase().replace(/var\([^)]*\)/g, " ").split(/[\s,()*+/]+/).filter(Boolean);
      for (const part of parts) {
        if (rawValues.has(part)) errors.push(`showcase.css: ${prop} hard-codes the token value ${part}; use var(--token)`);
      }
    }
  }
  return { errors, classes };
}

export function checkWorkflow(yaml) {
  const errors = [];
  if (!yaml) return [".github/workflows/pages.yml is missing"];
  for (const action of PAGES_ACTIONS) {
    if (!yaml.includes(`uses: ${action}`)) errors.push(`pages.yml must use ${action.slice(0, -1)}`);
  }
  if (!/^\s+pages: write$/m.test(yaml)) errors.push("pages.yml must grant pages: write");
  if (!/^\s+id-token: write$/m.test(yaml)) errors.push("pages.yml must grant id-token: write");
  if (!/^\s+push:\s*\n\s+branches: \[main\]/m.test(yaml)) errors.push("pages.yml must run on push to main");
  if (!/^\s+workflow_dispatch:/m.test(yaml)) errors.push("pages.yml must allow workflow_dispatch");
  for (const path of ['"showcase/**"', '"src/**.css"', '".github/workflows/pages.yml"']) {
    if (!yaml.includes(`- ${path}`)) errors.push(`pages.yml push paths must include ${path}`);
  }
  if (/\t/.test(yaml)) errors.push("pages.yml must not contain tabs");
  return errors;
}

export function checkDocs(readme, showcaseReadme) {
  const errors = [];
  if (!/\]\(showcase\/README\.md\)/.test(readme)) errors.push("README.md must link to showcase/README.md");
  if (!showcaseReadme) return [...errors, "showcase/README.md is missing"];
  for (const [text, what] of [
    [/python3 -m http\.server|npx serve/, "local preview with a static server"],
    [/GitHub Actions/, "the GitHub Actions Pages source setting"],
    [/Settings → Pages/, "the Settings → Pages step"],
    [/pages\.yml/, "how deployment works (pages.yml)"],
    [/<section id=/, "how to add a new section"],
  ]) {
    if (!text.test(showcaseReadme)) errors.push(`showcase/README.md must document ${what}`);
  }
  return errors;
}

export function checkShowcase({ html, showcaseCss, tokensCss, workflow, readme, showcaseReadme }) {
  const { root: tokens } = parseTokens(tokensCss);
  const css = checkShowcaseCss(showcaseCss, tokens);
  return [
    ...checkHtml(html, tokens, css.classes),
    ...css.errors,
    ...checkWorkflow(workflow),
    ...checkDocs(readme, showcaseReadme),
  ];
}

export function readRepoFiles(repo) {
  const read = (p) => {
    try {
      return readFileSync(resolve(repo, p), "utf8");
    } catch {
      return "";
    }
  };
  return {
    html: read("showcase/index.html"),
    showcaseCss: read("showcase/showcase.css"),
    tokensCss: read("src/tokens.css"),
    workflow: read(".github/workflows/pages.yml"),
    readme: read("README.md"),
    showcaseReadme: read("showcase/README.md"),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkShowcase(readRepoFiles(repo));
  if (errors.length) {
    for (const e of errors) console.error(`  FAIL ${e}`);
    console.error(`\ncheck-showcase: ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log("check-showcase: showcase page, styles, Pages workflow and docs are consistent with the framework.");
}
