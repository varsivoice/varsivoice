# Comments Font Issue - Test Documentation

## Overview

This directory contains property-based tests for Bug 1: Comments Font Issue from the ui-and-functionality-fixes bugfix spec.

## Test Files

### 1. `comments-font.test.js` (Task 1 - Bug Condition Exploration)
**Purpose**: Confirms the bug exists on unfixed code by verifying that `.comment` elements do NOT have `font-family` set to the application font.

**Expected Behavior**:
- **On UNFIXED code**: Tests PASS (confirming bug exists)
- **After fix**: Tests FAIL (confirming fix works)

**What it tests**:
- CSS rule for `.comment` class lacks `font-family` declaration
- Comment elements would inherit wrong font (monospace or system default)
- Non-comment elements are present and styled (baseline check)

**Counterexamples found**:
- `.comment` class has no `font-family` declaration in CSS
- This causes comments to display in wrong font instead of DM Sans

### 2. `comments-font-preservation.test.js` (Task 2 - Preservation Tests)
**Purpose**: Verifies that NON-COMMENT elements retain their current font styling, establishing the baseline behavior that must be preserved after the fix.

**Expected Behavior**:
- **On UNFIXED code**: Tests PASS (confirming baseline)
- **After fix**: Tests STILL PASS (confirming no regressions)

**What it tests**:
- All non-comment elements have defined font styling
- Post content elements are distinct from comment elements
- Button elements maintain consistent font styling
- Header elements use serif font family (as designed)
- Form elements maintain consistent font styling
- Text content renders consistently with various inputs

**Baseline established**:
- 26 non-comment elements have font styling defined
- Elements tested include:
  - Post content (`.post-body`, `.post-anon-name`, `.post-time`, `.post-cat-pill`)
  - Buttons (`.btn-post-pill`, `.composer-tool`, `.post-menu-btn`)
  - Headers (`.masthead-title`, `.hero-title`, `.trending-title`)
  - Form elements (`.composer-textarea`, `.input-search`, `.composer-select`)
  - Labels and text (`.composer-name`, `.composer-hint`, `.status-msg`)

## Property-Based Testing Approach

Both tests use a property-based testing approach with manual generators:

1. **Multiple test cases**: Each property is tested with 10-20 generated inputs
2. **Stronger guarantees**: More comprehensive than single example tests
3. **Edge case coverage**: Tests various text content, element types, and scenarios

## Running the Tests

```bash
# Run both tests
npm test

# Run bug condition exploration test only
npm run test:bug-condition

# Run preservation test only
npm run test:preservation

# Or run directly with Node.js
node static/js/comments-font.test.js
node static/js/comments-font-preservation.test.js
```

## Test Results on Unfixed Code

### Bug Condition Exploration Test
✅ **ALL PASSED** - Bug confirmed to exist
- CSS rule for `.comment` does NOT define font-family
- Counterexample: `.comment` class has no font-family declaration

### Preservation Test
✅ **ALL PASSED** - Baseline established
- 26 non-comment elements have font styling defined
- All elements use either `var(--font-sans)` or `var(--font-serif)`
- Headers correctly use serif font
- Buttons and form elements correctly use sans-serif font

## Next Steps

**Task 3**: Implement the fix by adding `font-family: var(--font-sans);` to the `.comment` CSS class in `static/css/style.css` (around line 827).

After the fix:
1. Bug condition exploration test should FAIL (confirming fix works)
2. Preservation test should STILL PASS (confirming no regressions)

## Requirements Validated

- **Requirement 1.1**: Comments display in wrong font (bug confirmed)
- **Requirement 2.1**: Comments should display in application font (test ready)
- **Requirement 3.1**: Post content font styling unchanged (baseline captured)
- **Requirement 3.2**: Other UI elements font styling unchanged (baseline captured)

## Design Properties Validated

- **Property 1**: Bug Condition - Comments Display in Application Font
- **Property 2**: Preservation - Non-Comment Font Styling Unchanged
