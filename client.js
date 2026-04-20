/**
 * thelounge-plugin-webcal v1.0.2
 * Rewrites webcal:// URLs in chat messages into clickable [📅] links.
 *
 * Handles TheLounge's nick-highlighter which splits message text into
 * multiple <span> nodes around any nick that appears in the URL.
 * Processes one URL at a time, rebuilding the char→node map after
 * each DOM mutation so indices stay correct.
 */
/* global document, MutationObserver, Node */
(function () {
  "use strict";

  // ── Styles ──────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    a.webcal-link {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 0 7px;
      border: 1px solid #00c853;
      background: rgba(0,200,83,0.08);
      color: #39ff14 !important;
      font-size: 0.72em;
      letter-spacing: 0.06em;
      text-decoration: none !important;
      cursor: pointer;
      transition: all 0.15s;
    }
    a.webcal-link:hover {
      background: rgba(57,255,20,0.12);
      border-color: #39ff14;
      color: #39ff14 !important;
      text-decoration: none !important;
    }
    a.webcal-link::before { content: '[📅 '; }
    a.webcal-link::after  { content: ']'; }
  `;
  document.head.appendChild(style);

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Strip trailing sentence punctuation unlikely to be part of a URL. */
  function cleanUrl(url) {
    return url.replace(/[.,;:!?)]+$/, "");
  }

  /** Flat list of all text-node leaves under el. */
  function getLeafNodes(el) {
    const nodes = [];
    (function walk(n) {
      if (n.nodeType === Node.TEXT_NODE) nodes.push(n);
      else if (n.nodeType === Node.ELEMENT_NODE)
        for (const c of n.childNodes) walk(c);
    })(el);
    return nodes;
  }

  /**
   * Build a char-offset → {node, offsetInNode} map from leaf text nodes.
   * Allows mapping a character position in el.textContent back to its
   * exact text node and position within that node.
   */
  function buildCharMap(leafNodes) {
    const map = [];
    for (const node of leafNodes)
      for (let i = 0; i < node.nodeValue.length; i++)
        map.push({ node, offsetInNode: i });
    return map;
  }

  function makeLink(url) {
    const a = document.createElement("a");
    a.href = url;
    a.className = "webcal-link";
    a.title = url;
    a.textContent = url.replace("webcal://", "");
    return a;
  }

  /**
   * Wrap one URL match in an <a> tag.
   * Handles multi-node spans (URL split across text + nick spans).
   */
  function processOneMatch(el, rawUrl, rawIndex) {
    const url   = cleanUrl(rawUrl);
    const start = rawIndex;
    const end   = rawIndex + url.length;

    const leafNodes = getLeafNodes(el);
    const charMap   = buildCharMap(leafNodes);
    if (end > charMap.length || start >= charMap.length) return false;

    const startInfo = charMap[start];
    const endInfo   = charMap[end - 1];
    const a = makeLink(url);

    // ── Single text node (no nick spans inside the URL) ──────────────────
    if (startInfo.node === endInfo.node) {
      const node   = startInfo.node;
      const text   = node.nodeValue;
      const before = text.slice(0, startInfo.offsetInNode);
      const after  = text.slice(endInfo.offsetInNode + 1);
      const frag   = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(a);
      if (after)  frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
      return true;
    }

    // ── Multi-node (URL spans across text nodes and nick <span>s) ────────
    const seen = new Set(), involvedNodes = [];
    for (let i = start; i < end; i++) {
      if (!seen.has(charMap[i].node)) {
        seen.add(charMap[i].node);
        involvedNodes.push(charMap[i].node);
      }
    }

    const startNode  = startInfo.node;
    const endNode    = endInfo.node;
    const beforeText = startNode.nodeValue.slice(0, startInfo.offsetInNode);
    const afterText  = endNode.nodeValue.slice(endInfo.offsetInNode + 1);

    // Insert anchor before the first node of the URL
    startNode.parentNode.insertBefore(a, startNode);
    // Preserve any text before the URL start in the same node
    if (beforeText)
      startNode.parentNode.insertBefore(
        document.createTextNode(beforeText), a
      );
    // Remove all nodes that were part of the URL
    for (const node of involvedNodes)
      if (node.parentNode) node.parentNode.removeChild(node);
    // Preserve any text after the URL end in the last node (e.g. ", " or " ")
    if (afterText)
      a.parentNode.insertBefore(
        document.createTextNode(afterText), a.nextSibling
      );

    return true;
  }

  /**
   * Process all webcal:// URLs in a .content element.
   * Rebuilds text and charmap after each DOM mutation.
   */
  function processContent(el) {
    if (el.dataset.webcalDone) return;
    if (!(el.textContent || "").includes("webcal://")) {
      el.dataset.webcalDone = "1";
      return;
    }

    let safety = 20; // max URLs per message
    while (safety-- > 0) {
      const text = el.textContent || "";
      const m    = /webcal:\/\/[^\s"'<>]+/.exec(text);
      if (!m) break;
      processOneMatch(el, m[0], m.index);
    }

    el.dataset.webcalDone = "1";
  }

  // ── MutationObserver ────────────────────────────────────────────────────
  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.classList && node.classList.contains("content")) {
          processContent(node);
        } else if (node.querySelectorAll) {
          for (const el of node.querySelectorAll(".content"))
            processContent(el);
        }
      }
    }
  });

  function start() {
    for (const el of document.querySelectorAll(".content"))
      processContent(el);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
