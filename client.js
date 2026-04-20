/**
 * thelounge-plugin-webcal
 * Intercepts webcal:// URIs in chat messages and renders them as
 * clickable "📅 Add to Calendar" links that open in the browser.
 *
 * TheLounge uses linkify-it for URL detection. webcal:// is not in
 * its default schema list, so we add it and inject a style to make
 * the rendered link look like a button.
 *
 * Install:
 *   cp -r thelounge-plugin-webcal \
 *     $THELOUNGE_HOME/packages/node_modules/
 *   # ensure packages/package.json lists it as a dependency, then:
 *   thelounge start
 */

/* global document, MutationObserver */

(function () {
  "use strict";

  // ── 1. Inject stylesheet ──────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    a.webcal-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px;
      border-radius: 4px;
      background: #2a6496;
      color: #fff !important;
      font-size: 0.85em;
      font-weight: 600;
      text-decoration: none !important;
      white-space: nowrap;
      cursor: pointer;
    }
    a.webcal-link:hover {
      background: #1e4d72;
    }
    a.webcal-link::before {
      content: "📅";
      font-style: normal;
    }
  `;
  document.head.appendChild(style);

  // ── 2. Rewrite webcal:// plain-text spans into styled links ─────────────
  const WEBCAL_RE = /webcal:\/\/[^\s"'<>]+/g;

  function rewriteNode(node) {
    // Only process text nodes inside message content
    if (node.nodeType !== Node.TEXT_NODE) { return; }
    const text = node.nodeValue;
    if (!WEBCAL_RE.test(text)) { return; }
    WEBCAL_RE.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m;

    while ((m = WEBCAL_RE.exec(text)) !== null) {
      // Text before the match
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      // The webcal link button
      const a = document.createElement("a");
      a.href = m[0];
      a.className = "webcal-link";
      a.textContent = "Add to Calendar";
      a.title = m[0];
      frag.appendChild(a);
      last = m.index + m[0].length;
    }

    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }

    node.parentNode.replaceChild(frag, node);
  }

  function rewriteExistingLinks(root) {
    // Also catch cases where linkify-it rendered webcal:// as a bare <a>
    // with the full URI as text but no button styling
    root.querySelectorAll('a[href^="webcal://"]').forEach(function (a) {
      if (!a.classList.contains("webcal-link")) {
        a.classList.add("webcal-link");
        a.textContent = "Add to Calendar";
        a.title = a.href;
      }
    });
  }

  function processElement(el) {
    // Walk text nodes
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) { nodes.push(n); }
    nodes.forEach(rewriteNode);
    rewriteExistingLinks(el);
  }

  // ── 3. MutationObserver — process new messages as they arrive ────────────
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== Node.ELEMENT_NODE) { return; }
        // TheLounge message content lives in .content or .text spans
        const targets = node.querySelectorAll
          ? node.querySelectorAll(".content, .text, .msg")
          : [];
        if (targets.length > 0) {
          targets.forEach(processElement);
        } else if (node.classList &&
                   (node.classList.contains("content") ||
                    node.classList.contains("text") ||
                    node.classList.contains("msg"))) {
          processElement(node);
        }
      });
    });
  });

  // Start observing once the DOM is ready
  function start() {
    // Process any messages already on screen (reconnect / history load)
    document.querySelectorAll(".content, .text, .msg").forEach(processElement);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
