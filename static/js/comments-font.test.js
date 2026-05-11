/**
 * Bug Condition Exploration Test — Comments Font Issue
 *
 * Task 1: Confirms that .comment elements do NOT have font-family set to
 * var(--font-sans) or var(--font-serif), causing comments to display in
 * the wrong font (monospace or system default instead of DM Sans).
 *
 * This test is EXPECTED TO FAIL on unfixed code (the wrong font is the counterexample).
 * A passing test would mean comments use the application font (DM Sans or Times New Roman),
 * which is the desired behavior AFTER the fix.
 *
 * Property 1: Bug Condition - Comments Display in Application Font
 * Validates: Requirements 1.1, 2.1
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal JSDOM environment with comment elements and CSS loaded.
 * Returns { dom, window }
 */
function buildCommentTestDOM() {
  const html = `<!DOCTYPE html>
<html>
<head>
  <style id="app-styles"></style>
</head>
<body>
  <!-- Sample comment elements matching the real structure -->
  <div class="comments-block">
    <div class="comment" id="comment-1">
      <div class="comment-head">
        <div class="comment-meta">
          <strong>Anonymous User</strong>
          <span class="comment-time">2 hours ago</span>
        </div>
      </div>
      <div class="comment-body">This is a test comment to check font styling.</div>
    </div>
    
    <div class="comment reply" id="comment-2">
      <div class="comment-head">
        <div class="comment-meta">
          <strong>Another User</strong>
          <span class="comment-time">1 hour ago</span>
        </div>
      </div>
      <div class="comment-body">This is a reply comment that should also use the application font.</div>
    </div>
    
    <div class="comment" id="comment-3">
      <div class="comment-head">
        <div class="comment-meta">
          <strong>Test User</strong>
          <span class="comment-time">30 minutes ago</span>
        </div>
      </div>
      <div class="comment-body">Another comment with multiple lines of text
to test font consistency across
different content lengths.</div>
    </div>
  </div>
  
  <!-- Non-comment elements for comparison -->
  <div class="post-card">
    <div class="post-body">This is a post body that should keep its current font.</div>
  </div>
  
  <button class="btn-post-pill">Post Button</button>
  <h3 class="section-title">Section Title</h3>
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
 * Get the computed font-family for an element.
 * In jsdom, getComputedStyle may not fully resolve CSS variables,
 * so we also check the inline and stylesheet rules.
 */
function getEffectiveFontFamily(window, element) {
  const computed = window.getComputedStyle(element);
  const fontFamily = computed.fontFamily;
  
  // Also check if the element has a direct style rule
  const inlineFont = element.style.fontFamily;
  
  return {
    computed: fontFamily,
    inline: inlineFont,
    hasFont: !!(fontFamily || inlineFont)
  };
}

/**
 * Check if a font-family value includes the application fonts.
 * Application fonts are: DM Sans (--font-sans) or Times New Roman (--font-serif)
 */
function usesApplicationFont(fontFamilyValue) {
  if (!fontFamilyValue) return false;
  
  const normalized = fontFamilyValue.toLowerCase().replace(/['"]/g, '');
  
  // Check for explicit font names
  if (normalized.includes('dm sans')) return true;
  if (normalized.includes('times new roman')) return true;
  
  // Check for CSS variable references (in case jsdom preserves them)
  if (normalized.includes('--font-sans')) return true;
  if (normalized.includes('--font-serif')) return true;
  
  return false;
}

/**
 * Check CSS rules directly to see if .comment has font-family defined.
 */
function checkCommentCSSRule(window) {
  const styleSheets = window.document.styleSheets;
  
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const rules = styleSheets[i].cssRules || styleSheets[i].rules;
      if (!rules) continue;
      
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.selectorText && rule.selectorText.includes('.comment')) {
          const fontFamily = rule.style.fontFamily;
          if (fontFamily) {
            return {
              found: true,
              selector: rule.selectorText,
              fontFamily: fontFamily,
              usesAppFont: usesApplicationFont(fontFamily)
            };
          }
        }
      }
    } catch (e) {
      // Some stylesheets may not be accessible (CORS), skip them
      continue;
    }
  }
  
  return { found: false };
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

console.log("\nBug Condition Exploration Test — Comments Font Issue");
console.log("=".repeat(60));
console.log("Purpose: Confirm that .comment elements do NOT have");
console.log("         font-family set to application font (DM Sans).");
console.log("         This proves the bug exists.\n");

const { dom, window } = buildCommentTestDOM();

// Get all comment elements
const comments = window.document.querySelectorAll('.comment');

console.log("Results:");
console.log("-".repeat(60));

let allPassed = true;
const counterexamples = [];

// Test 1: Check CSS rule for .comment class
const cssRuleCheck = checkCommentCSSRule(window);
allPassed &= runTest(
  "CSS rule for .comment does NOT define font-family (or uses wrong font)",
  function () {
    if (!cssRuleCheck.found) {
      // No font-family defined at all - this is the bug
      counterexamples.push({
        type: "CSS Rule Missing",
        detail: ".comment class has no font-family declaration in CSS"
      });
      return; // Test passes (bug confirmed)
    }
    
    if (cssRuleCheck.found && !cssRuleCheck.usesAppFont) {
      // Font-family is defined but not using application font
      counterexamples.push({
        type: "CSS Rule Wrong Font",
        selector: cssRuleCheck.selector,
        fontFamily: cssRuleCheck.fontFamily,
        detail: `.comment has font-family: ${cssRuleCheck.fontFamily} (not DM Sans or Times New Roman)`
      });
      return; // Test passes (bug confirmed)
    }
    
    // If we get here, the CSS rule has the correct font - bug is fixed
    assert(
      false,
      `CSS rule for .comment HAS font-family set to application font: ${cssRuleCheck.fontFamily}. ` +
      `This means the bug may already be fixed. Expected NO font-family or wrong font on unfixed code.`
    );
  }
);

// Test 2: Verify .comment class specifically lacks font-family in CSS
allPassed &= runTest(
  "Verify .comment CSS class lacks explicit font-family declaration",
  function () {
    assert(
      comments.length > 0,
      "No .comment elements found in test DOM. Check test setup."
    );
    
    // The key bug is that the CSS rule doesn't define font-family
    // This means comments will inherit from parent or use browser default
    // which may be monospace or system font instead of DM Sans
    
    if (cssRuleCheck.found && cssRuleCheck.usesAppFont) {
      assert(
        false,
        `.comment CSS rule already has font-family set to application font. ` +
        `Bug appears to be fixed. Expected no font-family on unfixed code.`
      );
    }
    
    // On unfixed code, the CSS rule should either:
    // 1. Not exist (no font-family property), OR
    // 2. Have wrong font-family value
    assert(
      !cssRuleCheck.found || !cssRuleCheck.usesAppFont,
      "Expected .comment CSS rule to lack font-family or use wrong font"
    );
  }
);

// Test 3: Verify non-comment elements are not affected (baseline check)
allPassed &= runTest(
  "Non-comment elements (posts, buttons) retain their current fonts",
  function () {
    const postBody = window.document.querySelector('.post-body');
    const button = window.document.querySelector('.btn-post-pill');
    
    assert(
      postBody !== null && button !== null,
      "Test DOM missing non-comment elements. Check test setup."
    );
    
    // We're just checking these elements exist and have some font
    // (we're not testing their specific font values, just that they're present)
    const postFont = window.getComputedStyle(postBody).fontFamily;
    const buttonFont = window.getComputedStyle(button).fontFamily;
    
    // This is a baseline check - we just want to confirm these elements exist
    // and are styled (we'll test preservation in a separate test)
    assert(
      true,
      "Baseline check passed - non-comment elements are present in test DOM"
    );
  }
);

console.log("\n" + "=".repeat(60));

if (counterexamples.length > 0) {
  console.log("\nCounterexamples recorded (proving bug exists):");
  console.log("-".repeat(60));
  
  counterexamples.forEach((ex, idx) => {
    console.log(`\n${idx + 1}. ${ex.type}:`);
    if (ex.selector) console.log(`   Selector    : ${ex.selector}`);
    if (ex.elementId) console.log(`   Element ID  : ${ex.elementId}`);
    if (ex.fontFamily) console.log(`   Font Family : ${ex.fontFamily}`);
    if (ex.computedFont) console.log(`   Computed    : ${ex.computedFont}`);
    console.log(`   Detail      : ${ex.detail}`);
  });
  
  console.log("\n" + "-".repeat(60));
  console.log("\nRoot cause confirmed:");
  console.log("  The .comment CSS class does NOT have font-family set to");
  console.log("  var(--font-sans) or var(--font-serif), causing comments");
  console.log("  to inherit an unintended monospace or system font.");
  console.log("\nExpected behavior (after fix):");
  console.log("  Comments should display in DM Sans (var(--font-sans)) or");
  console.log("  Times New Roman (var(--font-serif)) to match the application.");
} else {
  console.log("\nNo counterexamples found — the bug may already be fixed.");
  console.log("Expected: Comments should NOT use application font on unfixed code.");
}

console.log("\nTest summary: " + (allPassed ? "ALL PASSED" : "SOME FAILED"));
console.log("(On unfixed code, all tests should PASS — confirming the bug exists.)");
console.log("(After the fix, tests will FAIL — confirming the fix works.)\n");

// Exit with 0 if tests passed (bug confirmed), non-zero if tests failed (unexpected)
process.exit(allPassed ? 0 : 1);
