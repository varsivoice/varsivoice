/**
 * Exploratory test for wall.js initialization bug.
 *
 * Task 1.2 / 1.3: Confirms that wall.js throws ReferenceError: sortEl is not defined
 * when initialized in a DOM that has #feed, #search-q, #filter-btn, #filter-menu,
 * and a valid session in sessionStorage — but NO <select> sort element.
 *
 * This test is EXPECTED TO FAIL on unfixed code (the ReferenceError is the counterexample).
 * A passing test would mean loadPosts() was called without error, which is the desired
 * behavior AFTER the fix.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal JSDOM environment that mirrors the elements wall.js expects,
 * but deliberately omits any <select> sort element (matching the real wall.html).
 *
 * Returns { dom, loadPostsCalled, errors }
 *   loadPostsCalled – set to true if fetch('/api/posts…') is invoked
 *   errors          – array of uncaught errors thrown during script evaluation
 */
function buildMinimalWallDOM() {
  const html = `<!DOCTYPE html>
<html>
<head></head>
<body>
  <!-- Required elements that wall.js queries -->
  <div id="feed"></div>
  <p id="feed-status"></p>
  <input type="search" id="search-q" />

  <!-- Filter button / menu (replaces the old <select> sort element) -->
  <button type="button" id="filter-btn" aria-expanded="false">Filter</button>
  <div id="filter-menu" class="filter-menu hidden">
    <button type="button" class="filter-option active" data-sort="latest">Newest first</button>
    <button type="button" class="filter-option" data-sort="comments">Most commented</button>
    <button type="button" class="filter-option" data-sort="likes">Most liked</button>
  </div>
  <p id="active-filter-label" class="hidden"></p>

  <!-- Composer / post form -->
  <textarea id="post-content"></textarea>
  <select id="post-category"><option>Rant</option></select>
  <span id="char-left">1000</span>
  <button type="button" id="composer-submit">Post</button>
  <span id="composer-name"></span>
  <div class="composer-avatar"></div>

  <!-- Header / nav elements -->
  <button type="button" id="btn-logout">Sign out</button>
  <button type="button" id="hamburger-btn" aria-expanded="false">Menu</button>
  <div id="hamburger-menu" class="hidden"></div>
  <div id="settings-item"></div>
  <div id="settings-submenu" class="hidden"></div>
  <button type="button" id="theme-light-btn" class="active" aria-pressed="true">Light</button>
  <button type="button" id="theme-dark-btn" aria-pressed="false">Dark</button>
  <img id="header-avatar" />
  <a id="header-avatar-link" href="#">Avatar</a>

  <!-- Notification elements -->
  <button type="button" id="notif-btn">Notifications</button>
  <span id="notif-badge" class="hidden">0</span>
  <div id="notif-panel" class="hidden"></div>
  <div id="notif-list"></div>
  <button type="button" id="notif-mark-all">Mark all read</button>

  <!-- Action modal -->
  <div id="action-modal" class="hidden" aria-hidden="true">
    <div class="action-modal-card">
      <h4 id="action-modal-title">Confirm</h4>
      <p id="action-modal-message"></p>
      <textarea id="action-modal-input" class="hidden"></textarea>
      <p id="action-modal-error" class="hidden"></p>
      <button type="button" id="action-modal-cancel">Cancel</button>
      <button type="button" id="action-modal-confirm">Confirm</button>
    </div>
  </div>

  <!-- Post modal -->
  <div id="post-modal" class="hidden" aria-hidden="true">
    <div class="post-modal-inner">
      <button type="button" id="post-modal-close">✕</button>
      <div id="post-modal-content"></div>
    </div>
  </div>

  <!-- Trending sidebar -->
  <div id="trending-list"></div>

  <!-- NOTE: No <select> sort element — this is the bug condition -->
</body>
</html>`;

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/wall",
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Track whether loadPosts() was invoked by intercepting fetch calls to /api/posts
  let loadPostsCalled = false;
  const errors = [];

  // Capture script errors that jsdom swallows internally
  dom.window.addEventListener("error", function (event) {
    errors.push(event.error || new Error(event.message));
  });

  // Stub fetch: intercept /api/posts (loadPosts) and return an empty array.
  // Any other fetch also returns a safe empty response.
  window.fetch = function (url) {
    const urlStr = String(url);
    if (urlStr.includes("/api/posts")) {
      loadPostsCalled = true;
    }
    // Return a resolved promise with an empty/safe JSON body
    return Promise.resolve({
      ok: true,
      json: function () {
        if (urlStr.includes("/api/posts")) return Promise.resolve([]);
        if (urlStr.includes("/api/reactions")) return Promise.resolve({ counts: {}, total: 0, user_reaction: null });
        if (urlStr.includes("/api/profile/default-images")) return Promise.resolve({ images: [] });
        if (urlStr.includes("/api/notifications")) return Promise.resolve([]);
        return Promise.resolve({});
      },
    });
  };

  // Stub localStorage (jsdom provides it but let's be explicit)
  // Stub sessionStorage with a valid session so ensureSession() passes
  const STORAGE_KEY = "ub_session";
  const fakeSession = JSON.stringify({
    user_id: 1,
    email: "test@example.com",
    display_name: "Test User",
    photo_url: "",
    at: Date.now(),
  });
  window.sessionStorage.setItem(STORAGE_KEY, fakeSession);

  return { dom, window, getLoadPostsCalled: () => loadPostsCalled, errors };
}

// ── test runner ───────────────────────────────────────────────────────────────

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    return true;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log("\nExploratory Bug Test — wall.js initialization");
console.log("=".repeat(55));
console.log("Purpose: Confirm ReferenceError: sortEl is not defined");
console.log("         aborts IIFE before loadPosts() is called.\n");

const wallJsSource = fs.readFileSync(
  path.join(__dirname, "wall.js"),
  "utf8"
);

let thrownError = null;
let loadPostsCalled = false;

// Set up the DOM environment
const { dom, window, getLoadPostsCalled, errors } = buildMinimalWallDOM();

// Evaluate wall.js inside the jsdom window context.
// jsdom catches script errors internally; we capture them via the error event
// listener registered in buildMinimalWallDOM(). We also try/catch in case
// the error propagates synchronously in some jsdom versions.
try {
  const scriptEl = dom.window.document.createElement("script");
  scriptEl.textContent = wallJsSource;
  dom.window.document.body.appendChild(scriptEl);
} catch (err) {
  thrownError = err;
}

// If jsdom swallowed the error (common behaviour), pick it up from the
// errors array populated by the window "error" event listener.
if (thrownError === null && errors.length > 0) {
  thrownError = errors[0];
}

// Give microtasks a tick to settle (fetch stubs are async)
// We use a synchronous check here because the ReferenceError is synchronous.
loadPostsCalled = getLoadPostsCalled();

console.log("Results:");
console.log("-".repeat(55));

let allPassed = true;

// Test 1: Script initialization throws a ReferenceError
allPassed &= runTest(
  "Script initialization throws ReferenceError: sortEl is not defined",
  function () {
    assert(
      thrownError !== null,
      "Expected a ReferenceError to be thrown during IIFE execution, but no error was thrown. " +
        "This means the bug may already be fixed or the test environment is not correctly set up."
    );
    assert(
      thrownError instanceof window.ReferenceError ||
        thrownError.name === "ReferenceError" ||
        (thrownError.message && thrownError.message.includes("sortEl")),
      "Expected ReferenceError mentioning 'sortEl', but got: " +
        thrownError.constructor.name +
        ": " +
        thrownError.message
    );
  }
);

// Test 2: loadPosts() is NOT called (because the crash happens before it)
allPassed &= runTest(
  "loadPosts() is NOT called — crash aborts initialization before line 1220",
  function () {
    assert(
      !loadPostsCalled,
      "loadPosts() was called, which means the script did NOT crash before reaching it. " +
        "This is unexpected on unfixed code — the bug may already be fixed."
    );
  }
);

// Test 3: #feed remains empty (no posts rendered)
allPassed &= runTest(
  "#feed remains empty after failed initialization",
  function () {
    const feed = dom.window.document.getElementById("feed");
    assert(
      feed !== null,
      "#feed element not found in DOM — check the test HTML setup."
    );
    assert(
      feed.children.length === 0,
      "#feed has " +
        feed.children.length +
        " children, expected 0 (feed should be empty because loadPosts() never ran)."
    );
  }
);

console.log("\n" + "=".repeat(55));

if (thrownError) {
  console.log("\nCounterexample recorded:");
  console.log("  Error type : " + thrownError.constructor.name);
  console.log("  Message    : " + thrownError.message);
  if (thrownError.stack) {
    const stackLines = thrownError.stack.split("\n").slice(0, 5);
    console.log("  Stack      :\n    " + stackLines.join("\n    "));
  }
  console.log(
    "\nRoot cause confirmed: `sortEl` is referenced but never defined."
  );
  console.log(
    "The IIFE aborts at the sortEl.addEventListener line before loadPosts() runs."
  );
} else {
  console.log(
    "\nNo error was thrown — the bug may already be fixed or the test setup needs adjustment."
  );
}

console.log("\nTest summary: " + (allPassed ? "ALL PASSED" : "SOME FAILED"));
console.log(
  "(On unfixed code, tests 1 and 2 should PASS — confirming the bug exists.)"
);
console.log(
  "(After the fix is applied, tests 1 and 2 will FAIL — confirming the fix works.)\n"
);

// Exit with non-zero if tests failed (for CI integration)
process.exit(allPassed ? 0 : 1);
