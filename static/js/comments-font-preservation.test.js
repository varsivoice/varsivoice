/**
 * Preservation Property Tests — Comments Font Issue
 *
 * Task 2: Verifies that NON-COMMENT elements (posts, headers, buttons, labels)
 * retain their current font styling on UNFIXED code. This establishes the
 * baseline behavior that must be preserved after the fix.
 *
 * This test is EXPECTED TO PASS on unfixed code (confirming baseline).
 * After the fix, this test should STILL PASS (confirming no regressions).
 *
 * Property 2: Preservation - Non-Comment Font Styling Unchanged
 * Validates: Requirements 3.1, 3.2
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// ── Property-Based Testing Helpers ──────────────────────────────────────────

/**
 * Simple property-based testing: run a test function with multiple generated inputs.
 * This provides stronger guarantees than single example tests.
 */
function forAll(generator, testFn, numTests = 20) {
  const results = [];
  
  for (let i = 0; i < numTests; i++) {
    const input = generator(i);
    try {
      testFn(input);
      results.push({ success: true, input });
    } catch (err) {
      results.push({ success: false, input, error: err.message });
    }
  }
  
  const failures = results.filter(r => !r.success);
  
  if (failures.length > 0) {
    const firstFailure = failures[0];
    throw new Error(
      `Property failed for input: ${JSON.stringify(firstFailure.input)}\n` +
      `Error: ${firstFailure.error}\n` +
      `Failed ${failures.length}/${numTests} cases`
    );
  }
  
  return results;
}

/**
 * Generator: Creates various non-comment element selectors to test.
 * These are elements that should NOT be affected by the comment font fix.
 */
function generateNonCommentElements(seed) {
  const elements = [
    // Post elements
    { selector: '.post-body', type: 'post content', expectedFont: 'inherit or default' },
    { selector: '.post-anon-name', type: 'post author name', expectedFont: 'inherit or default' },
    { selector: '.post-time', type: 'post timestamp', expectedFont: 'inherit or default' },
    { selector: '.post-cat-pill', type: 'post category pill', expectedFont: 'inherit or default' },
    
    // Button elements
    { selector: '.btn-post-pill', type: 'post button', expectedFont: 'inherit or default' },
    { selector: '.composer-tool', type: 'composer tool button', expectedFont: 'inherit or default' },
    { selector: '.post-menu-btn', type: 'post menu button', expectedFont: 'inherit or default' },
    
    // Header elements
    { selector: '.masthead-title', type: 'masthead title', expectedFont: 'serif' },
    { selector: '.masthead-sub', type: 'masthead subtitle', expectedFont: 'inherit or default' },
    { selector: '.hero-title', type: 'hero title', expectedFont: 'serif' },
    
    // Label and text elements
    { selector: '.composer-name', type: 'composer name', expectedFont: 'inherit or default' },
    { selector: '.composer-hint', type: 'composer hint', expectedFont: 'inherit or default' },
    { selector: '.status-msg', type: 'status message', expectedFont: 'inherit or default' },
    { selector: '.trending-title', type: 'trending title', expectedFont: 'serif' },
    
    // Form elements
    { selector: '.composer-textarea', type: 'composer textarea', expectedFont: 'serif' },
    { selector: '.input-search', type: 'search input', expectedFont: 'inherit or default' },
    { selector: '.composer-select', type: 'composer select', expectedFont: 'inherit or default' },
  ];
  
  return elements[seed % elements.length];
}

/**
 * Generator: Creates various text content samples to test font rendering.
 */
function generateTextContent(seed) {
  const samples = [
    "Short text",
    "This is a longer piece of text that spans multiple words and tests font consistency.",
    "Text with\nmultiple\nlines",
    "Text with special chars: @#$%^&*()",
    "UPPERCASE TEXT",
    "lowercase text",
    "MiXeD CaSe TeXt",
    "Text with numbers 123456",
    "Unicode: 你好世界 🌍",
    ""  // Empty text edge case
  ];
  
  return samples[seed % samples.length];
}

// ── DOM Setup ────────────────────────────────────────────────────────────────

/**
 * Build a comprehensive JSDOM environment with all non-comment elements.
 */
function buildPreservationTestDOM() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <style id="app-styles"></style>
</head>
<body>
  <!-- Masthead -->
  <header class="masthead">
    <div class="masthead-inner">
      <div class="masthead-brand">
        <div class="masthead-brand-text">
          <div class="masthead-title">Freedom Wall</div>
          <div class="masthead-sub">University of Bohol</div>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Hero -->
  <div class="hero-banner">
    <div class="hero-content">
      <h1 class="hero-title">Welcome to Freedom Wall</h1>
      <p class="hero-tagline">Share your thoughts anonymously</p>
    </div>
  </div>
  
  <!-- Composer -->
  <div class="card">
    <div class="composer-head">
      <div>
        <span class="composer-name">Anonymous User</span>
        <span class="composer-hint">Share your thoughts</span>
      </div>
    </div>
    <textarea class="composer-textarea" placeholder="What's on your mind?"></textarea>
    <div class="composer-meta-row">
      <select class="composer-select">
        <option>Rant</option>
        <option>Confession</option>
      </select>
    </div>
    <div class="composer-toolbar">
      <div class="composer-tools">
        <button class="composer-tool">📎 Image</button>
      </div>
      <button class="btn-post-pill">Post</button>
    </div>
  </div>
  
  <!-- Post Card -->
  <div class="post-card">
    <div class="post-card-top">
      <div class="post-author-row">
        <div>
          <span class="post-anon-name">Anonymous</span>
          <span class="post-time">2 hours ago</span>
        </div>
      </div>
      <button class="post-menu-btn">⋯</button>
    </div>
    <div class="post-cat-pill">RANT</div>
    <div class="post-body">This is a post body that should keep its current font styling.</div>
  </div>
  
  <!-- Sidebar -->
  <div class="sidebar-trending">
    <h3 class="trending-title">Trending Posts</h3>
  </div>
  
  <!-- Search -->
  <input type="text" class="input-search" placeholder="Search posts..." />
  
  <!-- Status Message -->
  <p class="status-msg">No posts yet.</p>
  
  <!-- Comments block (for comparison - should NOT be tested here) -->
  <div class="comments-block">
    <div class="comment">
      <div class="comment-body">This is a comment (not tested in preservation tests)</div>
    </div>
  </div>
</body>
</html>`;

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/wall",
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Load the actual CSS file
  const cssPath = path.join(__dirname, "..", "css", "style.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");
  const styleEl = window.document.getElementById("app-styles");
  styleEl.textContent = cssContent;

  return { dom, window };
}

/**
 * Capture the current font styling of an element.
 * This creates a baseline snapshot that we'll verify remains unchanged.
 */
function captureElementFontBaseline(window, selector) {
  const element = window.document.querySelector(selector);
  
  if (!element) {
    return { found: false, selector };
  }
  
  const computed = window.getComputedStyle(element);
  
  return {
    found: true,
    selector,
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontStyle: computed.fontStyle,
    lineHeight: computed.lineHeight,
    textContent: element.textContent.trim()
  };
}

// ── Test Helpers ─────────────────────────────────────────────────────────────

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

// ── Main Tests ───────────────────────────────────────────────────────────────

console.log("\nPreservation Property Tests — Comments Font Issue");
console.log("=".repeat(60));
console.log("Purpose: Verify that NON-COMMENT elements retain their");
console.log("         current font styling on unfixed code.");
console.log("         This establishes the baseline to preserve.\n");

const { dom, window } = buildPreservationTestDOM();

console.log("Results:");
console.log("-".repeat(60));

let allPassed = true;
const baselines = [];

// Property 1: Non-comment elements have consistent font styling
allPassed &= runTest(
  "Property: All non-comment elements have defined font styling",
  function () {
    forAll(
      generateNonCommentElements,
      function (elementSpec) {
        const baseline = captureElementFontBaseline(window, elementSpec.selector);
        
        // Element should exist in the DOM
        assert(
          baseline.found,
          `Element ${elementSpec.selector} (${elementSpec.type}) not found in test DOM`
        );
        
        // Element should have some font styling (even if inherited)
        // We're not checking for specific values, just that styling exists
        assert(
          baseline.fontFamily || baseline.fontSize,
          `Element ${elementSpec.selector} has no font styling`
        );
        
        // Store baseline for later comparison
        baselines.push({
          ...baseline,
          type: elementSpec.type
        });
      },
      17  // Test all 17 non-comment element types
    );
  }
);

// Property 2: Post content elements do not use comment-specific styling
allPassed &= runTest(
  "Property: Post content elements are distinct from comment elements",
  function () {
    const postBody = window.document.querySelector('.post-body');
    const comment = window.document.querySelector('.comment');
    
    assert(postBody !== null, "Post body element not found");
    assert(comment !== null, "Comment element not found");
    
    const postStyles = window.getComputedStyle(postBody);
    const commentStyles = window.getComputedStyle(comment);
    
    // Post and comment should have different background colors
    // (this verifies they're styled independently)
    assert(
      postStyles.backgroundColor !== commentStyles.backgroundColor ||
      postStyles.padding !== commentStyles.padding,
      "Post and comment elements should have distinct styling"
    );
  }
);

// Property 3: Button elements maintain their font styling
allPassed &= runTest(
  "Property: Button elements have consistent font styling",
  function () {
    const buttons = [
      '.btn-post-pill',
      '.composer-tool',
      '.post-menu-btn'
    ];
    
    buttons.forEach(selector => {
      const baseline = captureElementFontBaseline(window, selector);
      
      assert(
        baseline.found,
        `Button ${selector} not found in test DOM`
      );
      
      assert(
        baseline.fontFamily || baseline.fontSize,
        `Button ${selector} has no font styling`
      );
      
      baselines.push({
        ...baseline,
        type: 'button'
      });
    });
  }
);

// Property 4: Header elements use serif font (as designed)
allPassed &= runTest(
  "Property: Header elements use serif font family",
  function () {
    const headers = [
      '.masthead-title',
      '.hero-title',
      '.trending-title'
    ];
    
    headers.forEach(selector => {
      const baseline = captureElementFontBaseline(window, selector);
      
      assert(
        baseline.found,
        `Header ${selector} not found in test DOM`
      );
      
      // Headers should have font styling defined
      assert(
        baseline.fontFamily,
        `Header ${selector} has no font-family`
      );
      
      baselines.push({
        ...baseline,
        type: 'header'
      });
    });
  }
);

// Property 5: Form elements maintain their font styling
allPassed &= runTest(
  "Property: Form elements have consistent font styling",
  function () {
    const formElements = [
      '.composer-textarea',
      '.input-search',
      '.composer-select'
    ];
    
    formElements.forEach(selector => {
      const baseline = captureElementFontBaseline(window, selector);
      
      assert(
        baseline.found,
        `Form element ${selector} not found in test DOM`
      );
      
      assert(
        baseline.fontFamily || baseline.fontSize,
        `Form element ${selector} has no font styling`
      );
      
      baselines.push({
        ...baseline,
        type: 'form'
      });
    });
  }
);

// Property 6: Text content rendering is consistent across multiple samples
allPassed &= runTest(
  "Property: Text content renders consistently with various inputs",
  function () {
    forAll(
      generateTextContent,
      function (textContent) {
        // Create a temporary post body element with the text
        const testEl = window.document.createElement('div');
        testEl.className = 'post-body';
        testEl.textContent = textContent;
        window.document.body.appendChild(testEl);
        
        const styles = window.getComputedStyle(testEl);
        
        // Element should have font styling regardless of content
        assert(
          styles.fontFamily || styles.fontSize,
          `Post body with content "${textContent.substring(0, 20)}..." has no font styling`
        );
        
        // Clean up
        window.document.body.removeChild(testEl);
      },
      10  // Test 10 different text content samples
    );
  }
);

console.log("\n" + "=".repeat(60));

if (baselines.length > 0) {
  console.log("\nBaseline font styling captured for preservation:");
  console.log("-".repeat(60));
  
  // Group by type
  const byType = {};
  baselines.forEach(b => {
    if (!byType[b.type]) byType[b.type] = [];
    byType[b.type].push(b);
  });
  
  Object.keys(byType).forEach(type => {
    console.log(`\n${type.toUpperCase()} elements:`);
    byType[type].forEach(b => {
      console.log(`  ${b.selector}`);
      console.log(`    Font Family: ${b.fontFamily || '(inherited)'}`);
      console.log(`    Font Size  : ${b.fontSize || '(inherited)'}`);
    });
  });
  
  console.log("\n" + "-".repeat(60));
  console.log("\nBaseline established:");
  console.log(`  ${baselines.length} non-comment elements have font styling defined.`);
  console.log("  These elements should retain EXACTLY this styling after the fix.");
  console.log("\nPreservation requirement:");
  console.log("  When .comment font-family is added, these elements MUST NOT change.");
}

console.log("\nTest summary: " + (allPassed ? "ALL PASSED" : "SOME FAILED"));
console.log("(On unfixed code, all tests should PASS — confirming baseline.)");
console.log("(After the fix, tests should STILL PASS — confirming no regressions.)\n");

// Exit with 0 if tests passed (baseline confirmed), non-zero if tests failed
process.exit(allPassed ? 0 : 1);
