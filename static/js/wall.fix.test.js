/**
 * Fix-checking and preservation-checking tests for wall.js
 *
 * Task 3 — Fix-checking tests (Property 1):
 *   Validates: Requirements 2.1, 2.2
 *   For any wall page load where sortEl is not defined, the fixed wall.js SHALL:
 *     - Complete IIFE execution without throwing a ReferenceError
 *     - Call loadPosts() during initialization
 *     - Populate #feed with posts from the API
 *
 * Task 4 — Preservation-checking tests (Property 2):
 *   Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 *   All existing behaviors unrelated to the removed sortEl line remain unchanged.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// ── shared helpers ────────────────────────────────────────────────────────────

const wallJsSource = fs.readFileSync(
  path.join(__dirname, "wall.js"),
  "utf8"
);

/**
 * Build a minimal JSDOM environment that mirrors the elements wall.js expects.
 * No <select> sort element is present (matching the real wall.html after the UI refactor).
 *
 * @param {object} options
 * @param {object} [options.session]   - Session object to store in sessionStorage
 * @param {Array}  [options.posts]     - Posts array returned by /api/posts
 * @returns {{ dom, window, calls, errors }}
 *   calls.loadPosts  – number of times fetch('/api/posts…') was invoked
 *   calls.postSubmit – number of times fetch('/api/posts', {method:'POST'}) was invoked
 *   errors           – array of uncaught errors thrown during script evaluation
 */
function buildWallDOM(options) {
  options = options || {};

  const session = options.session || {
    user_id: 1,
    email: "test@example.com",
    display_name: "Test User",
    photo_url: "",
    at: Date.now(),
  };

  const posts = options.posts !== undefined ? options.posts : [];

  const html = `<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="feed"></div>
  <p id="feed-status"></p>
  <input type="search" id="search-q" />

  <button type="button" id="filter-btn" aria-expanded="false">Filter</button>
  <div id="filter-menu" class="filter-menu hidden">
    <button type="button" class="filter-option active" data-sort="latest">Newest first</button>
    <button type="button" class="filter-option" data-sort="comments">Most commented</button>
    <button type="button" class="filter-option" data-sort="likes">Most liked</button>
  </div>
  <p id="active-filter-label" class="hidden"></p>

  <textarea id="post-content"></textarea>
  <select id="post-category"><option>Rant</option></select>
  <span id="char-left">1000</span>
  <button type="button" id="composer-submit">Post</button>
  <span id="composer-name"></span>
  <div class="composer-avatar"></div>

  <button type="button" id="btn-logout">Sign out</button>
  <button type="button" id="hamburger-btn" aria-expanded="false">Menu</button>
  <div id="hamburger-menu" class="hidden"></div>
  <div id="settings-item"></div>
  <div id="settings-submenu" class="hidden"></div>
  <button type="button" id="theme-light-btn" class="active" aria-pressed="true">Light</button>
  <button type="button" id="theme-dark-btn" aria-pressed="false">Dark</button>
  <img id="header-avatar" />
  <a id="header-avatar-link" href="#">Avatar</a>

  <button type="button" id="notif-btn">Notifications</button>
  <span id="notif-badge" class="hidden">0</span>
  <div id="notif-panel" class="hidden"></div>
  <div id="notif-list"></div>
  <button type="button" id="notif-mark-all">Mark all read</button>

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

  <div id="post-modal" class="hidden" aria-hidden="true">
    <div class="post-modal-inner">
      <button type="button" id="post-modal-close">✕</button>
      <div id="post-modal-content"></div>
    </div>
  </div>

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
  const errors = [];
  const calls = { loadPosts: 0, postSubmit: 0 };

  dom.window.addEventListener("error", function (event) {
    errors.push(event.error || new Error(event.message));
  });

  window.fetch = function (url, opts) {
    const urlStr = String(url);
    const method = (opts && opts.method) ? opts.method.toUpperCase() : "GET";

    if (urlStr.includes("/api/posts") && method === "GET") {
      calls.loadPosts++;
    }
    if (urlStr === "/api/posts" && method === "POST") {
      calls.postSubmit++;
    }

    return Promise.resolve({
      ok: true,
      json: function () {
        if (urlStr.includes("/api/posts") && method === "GET") {
          return Promise.resolve(posts);
        }
        if (urlStr === "/api/posts" && method === "POST") {
          return Promise.resolve({ id: 99, content: "new post" });
        }
        if (urlStr.includes("/api/reactions")) {
          return Promise.resolve({ counts: {}, total: 0, user_reaction: null });
        }
        if (urlStr.includes("/api/profile/default-images")) {
          return Promise.resolve({ images: [] });
        }
        if (urlStr.includes("/api/notifications")) {
          return Promise.resolve({ notifications: [], unread: 0 });
        }
        return Promise.resolve({});
      },
    });
  };

  window.sessionStorage.setItem("ub_session", JSON.stringify(session));

  return { dom, window, calls, errors };
}

/**
 * Evaluate wall.js inside the given jsdom window.
 * Returns the thrown error (if any), or null if initialization succeeded.
 */
function evalWallJs(dom) {
  let thrownError = null;
  try {
    const scriptEl = dom.window.document.createElement("script");
    scriptEl.textContent = wallJsSource;
    dom.window.document.body.appendChild(scriptEl);
  } catch (err) {
    thrownError = err;
  }
  return thrownError;
}

/**
 * Flush the microtask queue by awaiting several Promise.resolve() chains.
 * This allows jsdom's fetch stub .then() callbacks to run before we check DOM state.
 */
async function flushMicrotasks() {
  // Multiple rounds to handle chained .then() calls in wall.js
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

// ── async test runner ─────────────────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passedTests++;
    return true;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failedTests++;
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

// ── main (async) ──────────────────────────────────────────────────────────────

async function main() {

  // ── Task 3: Fix-checking tests (Property 1) ─────────────────────────────────
  // Validates: Requirements 2.1, 2.2

  console.log("\n" + "=".repeat(65));
  console.log("Task 3 — Fix-checking tests (Property 1)");
  console.log("Validates: Requirements 2.1, 2.2");
  console.log("=".repeat(65));

  // 3.1 — Initialization completes without throwing when no sort <select> is present
  await runTest(
    "3.1 Initialization completes without throwing (no sort <select> present)",
    async function () {
      const { dom, errors } = buildWallDOM();
      const thrownError = evalWallJs(dom);
      await flushMicrotasks();

      const anyError = thrownError || (errors.length > 0 ? errors[0] : null);

      assert(
        anyError === null,
        "Expected no error during initialization, but got: " +
          (anyError ? anyError.constructor.name + ": " + anyError.message : "unknown error")
      );
    }
  );

  // 3.2 — loadPosts() is invoked during initialization
  await runTest(
    "3.2 loadPosts() is invoked during initialization",
    async function () {
      const { dom, calls } = buildWallDOM();
      evalWallJs(dom);
      await flushMicrotasks();

      assert(
        calls.loadPosts >= 1,
        "Expected loadPosts() to be called at least once during initialization, " +
          "but fetch('/api/posts') was called " + calls.loadPosts + " time(s)."
      );
    }
  );

  // 3.3 — #feed is populated after initialization when the API returns posts
  await runTest(
    "3.3 #feed is populated after initialization when API returns posts",
    async function () {
      const fakePosts = [
        {
          id: 1,
          user_id: 1,
          content: "Hello world",
          category: "Rant",
          author_name: "Test User",
          author_photo: "",
          like_count: 0,
          comment_count: 0,
          created_at: new Date().toISOString(),
          updated_at: null,
          image_url: null,
        },
        {
          id: 2,
          user_id: 2,
          content: "Another post",
          category: "Advice",
          author_name: "Other User",
          author_photo: "",
          like_count: 3,
          comment_count: 1,
          created_at: new Date().toISOString(),
          updated_at: null,
          image_url: null,
        },
      ];

      const { dom } = buildWallDOM({ posts: fakePosts });
      evalWallJs(dom);

      // Flush microtasks so the fetch .then() chain runs and renders posts into #feed
      await flushMicrotasks();

      const feed = dom.window.document.getElementById("feed");
      const feedCount = feed.children.length;

      assert(
        feedCount >= fakePosts.length,
        "#feed should contain " + fakePosts.length + " post card(s) after initialization, " +
          "but found " + feedCount + "."
      );
    }
  );

  // ── Task 4: Preservation-checking tests (Property 2) ────────────────────────
  // Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5

  console.log("\n" + "=".repeat(65));
  console.log("Task 4 — Preservation-checking tests (Property 2)");
  console.log("Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5");
  console.log("=".repeat(65));

  // 4.1 — Filter menu option clicks update currentSort and call loadPosts()
  await runTest(
    "4.1 Filter menu option click updates currentSort and calls loadPosts()",
    async function () {
      const { dom, calls } = buildWallDOM();
      evalWallJs(dom);
      await flushMicrotasks();

      // Record how many times loadPosts was called during initialization
      const callsBeforeClick = calls.loadPosts;

      // Simulate clicking the "Most liked" filter option (data-sort="likes")
      const filterOptions = dom.window.document.querySelectorAll(".filter-option");
      let likesBtn = null;
      filterOptions.forEach(function (btn) {
        if (btn.dataset.sort === "likes") likesBtn = btn;
      });

      assert(likesBtn !== null, "Could not find .filter-option[data-sort='likes'] in the DOM.");

      // Click the filter option
      likesBtn.click();
      await flushMicrotasks();

      // loadPosts() should have been called again after the click
      assert(
        calls.loadPosts > callsBeforeClick,
        "Expected loadPosts() to be called after clicking a filter option, " +
          "but fetch('/api/posts') call count did not increase. " +
          "Before: " + callsBeforeClick + ", After: " + calls.loadPosts
      );

      // Verify the active class was moved to the clicked button
      assert(
        likesBtn.classList.contains("active"),
        "Expected the clicked filter option to have class 'active', but it does not."
      );

      // Verify other options lost the active class
      let otherStillActive = false;
      filterOptions.forEach(function (btn) {
        if (btn !== likesBtn && btn.classList.contains("active")) {
          otherStillActive = true;
        }
      });
      assert(
        !otherStillActive,
        "Expected only the clicked filter option to be active, but another option still has class 'active'."
      );
    }
  );

  // 4.2 — Post submission calls the API and triggers a feed refresh
  await runTest(
    "4.2 Post submission calls the API and triggers a feed refresh",
    async function () {
      const { dom, calls } = buildWallDOM();
      evalWallJs(dom);
      await flushMicrotasks();

      const callsBeforeSubmit = calls.loadPosts;
      const postSubmitsBefore = calls.postSubmit;

      // Set post content (required for submission)
      const postContent = dom.window.document.getElementById("post-content");
      postContent.value = "Test post content";

      // Click the composer submit button
      const composerSubmit = dom.window.document.getElementById("composer-submit");
      composerSubmit.click();

      // Flush microtasks so the POST fetch resolves and the .then() calls loadPosts()
      await flushMicrotasks();

      // The POST to /api/posts should have been made
      assert(
        calls.postSubmit > postSubmitsBefore,
        "Expected fetch('/api/posts', {method:'POST'}) to be called after clicking composer-submit, " +
          "but it was not. postSubmit count: " + calls.postSubmit
      );

      // After the POST resolves, loadPosts() should be called again (feed refresh)
      assert(
        calls.loadPosts > callsBeforeSubmit,
        "Expected loadPosts() to be called after post submission (feed refresh), " +
          "but fetch('/api/posts') call count did not increase after submit. " +
          "Before submit: " + callsBeforeSubmit + ", After: " + calls.loadPosts
      );
    }
  );

  // 4.3 — Property-based test: random valid session objects
  // Generates random valid session objects and asserts initialization always
  // completes and calls loadPosts() without throwing.
  //
  // **Validates: Requirements 2.1, 2.2**
  await runTest(
    "4.3 [PBT] Random valid sessions: initialization always completes and calls loadPosts()",
    async function () {
      // Generator: produce a random valid session object
      function randomString(prefix, len) {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = prefix || "";
        for (let i = 0; i < (len || 6); i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }

      function generateSession() {
        const userId = Math.floor(Math.random() * 10000) + 1;
        return {
          user_id: userId,
          email: randomString("user", 5) + "@" + randomString("", 4) + ".com",
          display_name: randomString("User ", 4),
          photo_url: Math.random() > 0.5 ? "" : "/static/uploads/profiles/test.jpg",
          at: Date.now() - Math.floor(Math.random() * 3600000),
        };
      }

      const NUM_TRIALS = 50;
      let firstFailure = null;

      for (let i = 0; i < NUM_TRIALS; i++) {
        const session = generateSession();
        const env = buildWallDOM({ session });
        const thrownError = evalWallJs(env.dom);
        await flushMicrotasks();

        const anyError = thrownError || (env.errors.length > 0 ? env.errors[0] : null);

        if (anyError !== null) {
          firstFailure = {
            trial: i,
            session,
            error: anyError.constructor.name + ": " + anyError.message,
          };
          break;
        }

        if (env.calls.loadPosts < 1) {
          firstFailure = {
            trial: i,
            session,
            error: "loadPosts() was not called (fetch('/api/posts') count = 0)",
          };
          break;
        }
      }

      if (firstFailure !== null) {
        throw new Error(
          "Property failed after " + firstFailure.trial + " trial(s).\n" +
          "        Counterexample session: " + JSON.stringify(firstFailure.session) + "\n" +
          "        Error: " + firstFailure.error
        );
      }

      console.log("        Ran " + NUM_TRIALS + " trials — all passed.");
    }
  );

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(65));
  console.log(
    "Test summary: " + passedTests + "/" + totalTests + " passed" +
    (failedTests > 0 ? " (" + failedTests + " FAILED)" : "")
  );
  console.log("=".repeat(65) + "\n");

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch(function (err) {
  console.error("Unexpected error in test runner:", err);
  process.exit(1);
});
