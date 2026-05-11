# Posts Not Loading — Bugfix Design

## Overview

The Freedom Wall feed fails to populate on page load because `wall.js` crashes during initialization. A stale reference to `sortEl` — a `<select>` element that was removed from the HTML when the UI was updated to use a filter button/menu — causes a `ReferenceError` at line 1149. This halts the IIFE before the `loadPosts()` call at line 1220 ever runs, leaving the feed empty.

The fix is minimal: remove the single dead line `sortEl.addEventListener("change", loadPosts)`. Sort-change events are already handled by the filter menu's `click` listeners (lines 1113–1145), so no replacement listener is needed.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — the wall page script initializing (or any filter-change code path executing) while `sortEl` is not defined in scope
- **Property (P)**: The desired behavior when the bug condition holds — the script SHALL complete initialization without a `ReferenceError` and SHALL call `loadPosts()` to populate the feed
- **Preservation**: All existing behaviors unrelated to the stale `sortEl` reference that must remain unchanged after the fix
- **`sortEl`**: A variable that was intended to reference a `<select>` sort element; that element no longer exists in `wall.html`, making `sortEl` undefined at runtime
- **`loadPosts()`**: The function in `static/js/wall.js` that fetches posts from `/api/posts` and renders them into `#feed`
- **`currentSort`**: The module-level variable in `wall.js` that tracks the active sort option; updated by the filter menu click handlers
- **IIFE**: The immediately-invoked function expression wrapping all of `wall.js`; a `ReferenceError` inside it aborts the entire script

## Bug Details

### Bug Condition

The bug manifests on every wall page load. During IIFE execution, line 1149 attempts to call `.addEventListener` on `sortEl`, which is never assigned. JavaScript throws `ReferenceError: sortEl is not defined`, unwinding the call stack and aborting all remaining initialization code — including the `loadPosts()` call at line 1220.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type PageLoadEvent or FilterChangeEvent
  OUTPUT: boolean

  // Returns true when the wall page initializes, triggering the code path
  // that references the undefined `sortEl` variable
  RETURN X is a wall page load
         AND typeof sortEl === "undefined"
         AND line `sortEl.addEventListener("change", loadPosts)` is reached
END FUNCTION
```

### Examples

- **Page load (primary case)**: User navigates to `/wall`. Script runs, reaches line 1149, throws `ReferenceError: sortEl is not defined`. Feed stays empty. Expected: feed loads with existing posts.
- **After login redirect**: User logs in and is redirected to `/wall`. Same crash occurs immediately. Expected: feed populates automatically.
- **Hard refresh**: User presses F5 on the wall page. Script re-executes, crashes again. Expected: feed reloads with current posts.
- **Filter menu click (secondary case)**: Even if the page somehow loaded, any code path that reaches line 1149 would crash. In practice the crash happens before any user interaction is possible.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Submitting a new post via the composer must continue to save the post and refresh the feed
- Searching posts via the search input must continue to filter and display matching posts
- Selecting a sort option from the filter button/menu must continue to reload the feed with the chosen sort order
- Reacting to a post or comment must continue to record the reaction and update the display
- Adding or deleting a comment must continue to update the comment count and comment list
- Unauthenticated users must continue to be redirected to the login page
- All other keyboard, mouse, and UI interactions on the wall page must remain unaffected

**Scope:**
All behaviors that do NOT involve the stale `sortEl.addEventListener` line should be completely unaffected by this fix. The change is a single-line deletion with no logic replacement required.

## Hypothesized Root Cause

Based on the bug description and code inspection, the root cause is confirmed:

1. **Stale variable reference**: `sortEl` was declared and used when the sort UI was a `<select>` element. When the UI was refactored to use a filter button/menu (`#filter-btn` / `#filter-menu`), the `<select>` element was removed from `wall.html` and the corresponding `var sortEl = document.getElementById(...)` assignment was removed from `wall.js`. However, the event listener registration `sortEl.addEventListener("change", loadPosts)` on line 1149 was not removed, leaving a reference to an undeclared variable.

2. **No fallback / guard**: Unlike other DOM lookups in `wall.js` (e.g., `if (filterBtn) { ... }`), the `sortEl` line has no null/undefined guard. Even if `sortEl` were `null` (element not found), `.addEventListener` on `null` would throw a `TypeError`. Since `sortEl` is not even declared, it throws a `ReferenceError` instead.

3. **Crash location is before initialization**: The `sortEl` line (1149) sits after the filter menu wiring but before `refreshProfileUI()`, `loadDefaultProfileImages()`, and `loadPosts()` (lines 1219–1220). Any crash at line 1149 prevents all three from running.

4. **Sort functionality is already covered**: The filter menu's `click` handlers (lines 1113–1145) already update `currentSort` and call `loadPosts()`. The `sortEl.addEventListener` line is entirely redundant — removing it loses no functionality.

## Correctness Properties

Property 1: Bug Condition — Script Initialization Completes and Feed Loads

_For any_ wall page load event where `sortEl` is not defined in scope, the fixed `wall.js` SHALL complete IIFE execution without throwing a `ReferenceError`, SHALL call `loadPosts()` during initialization, and SHALL populate `#feed` with posts from the API.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation — Existing Wall Page Behaviors Unchanged

_For any_ user interaction that does NOT involve the removed `sortEl.addEventListener` line (post submission, search, filter menu sort selection, reactions, comments, logout, profile update, notifications), the fixed `wall.js` SHALL produce exactly the same behavior as the original `wall.js` would produce if the `ReferenceError` were not present, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `static/js/wall.js`

**Line**: 1149

**Specific Changes**:

1. **Remove the stale event listener registration**: Delete the line:
   ```js
   sortEl.addEventListener("change", loadPosts);
   ```
   This is the only change needed. No replacement is required because sort-change events are already handled by the filter menu click listeners.

2. **No other changes**: The `currentSort` variable, `loadPosts()` function, filter menu wiring, and all other logic remain untouched.

**Before:**
```js
  document.addEventListener("click", function () { closeFilterMenu(); });
  sortEl.addEventListener("change", loadPosts);   // ← DELETE THIS LINE

  var saveProfileBtn = document.getElementById("save-profile");
```

**After:**
```js
  document.addEventListener("click", function () { closeFilterMenu(); });

  var saveProfileBtn = document.getElementById("save-profile");
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis (stale `sortEl` reference causing `ReferenceError` that aborts initialization).

**Test Plan**: Write a test that simulates wall page script initialization in a DOM environment without a `<select>` sort element and asserts that `loadPosts()` is called. Run this test on the UNFIXED code to observe the `ReferenceError` and confirm the root cause.

**Test Cases**:
1. **Page load without sort select**: Initialize `wall.js` in a test DOM that has `#feed`, `#search-q`, `#filter-btn`, `#filter-menu` but no `<select>` sort element — assert `loadPosts()` is called (will fail on unfixed code with `ReferenceError`)
2. **Feed population on load**: After initialization, assert that `#feed` contains at least one post element (will fail on unfixed code because `loadPosts()` never runs)
3. **No ReferenceError thrown**: Assert that script initialization completes without throwing (will fail on unfixed code)

**Expected Counterexamples**:
- `ReferenceError: sortEl is not defined` thrown during IIFE execution
- `loadPosts()` is never invoked; `#feed` remains empty
- All event listeners registered after line 1149 (profile save, notifications, etc.) are also not attached

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed script produces the expected behavior.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result := initializeWallPage_fixed(X)
  ASSERT no_reference_error(result)
    AND loadPosts_was_called(result)
    AND feed_is_populated(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed script produces the same result as the original script.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT wall_js_original(X) = wall_js_fixed(X)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for post submission, search, filter menu, reactions, and comments, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Post submission preservation**: Verify that submitting a post calls the API and triggers `loadPosts()` — behavior must be identical before and after fix
2. **Search preservation**: Verify that typing in `#search-q` triggers a filtered `loadPosts()` call — behavior must be identical before and after fix
3. **Filter menu sort preservation**: Verify that clicking a `.filter-option` updates `currentSort` and calls `loadPosts()` — behavior must be identical before and after fix
4. **Reaction preservation**: Verify that reaction toggle calls `/api/reactions` and updates the UI — behavior must be identical before and after fix
5. **Comment preservation**: Verify that adding a comment calls the comments API and updates the count — behavior must be identical before and after fix

### Unit Tests

- Test that `wall.js` initialization completes without throwing when no `<select>` sort element is present in the DOM
- Test that `loadPosts()` is invoked during initialization
- Test that `#feed` is populated after initialization when the API returns posts
- Test that the filter menu click handlers correctly update `currentSort` and call `loadPosts()`
- Test edge case: `#feed` is empty when the API returns zero posts (not a crash, just an empty state message)

### Property-Based Tests

- Generate random session states (valid user objects) and verify that initialization always completes and calls `loadPosts()` without throwing
- Generate random filter option selections and verify that `currentSort` is updated correctly and `loadPosts()` is called each time
- Generate random post content strings and verify that post submission always calls the API and refreshes the feed

### Integration Tests

- Full page load test: navigate to `/wall` as an authenticated user and assert that posts appear in `#feed` within a reasonable timeout
- Filter sort test: click each filter option and assert that the feed reloads with posts in the expected order
- Post submission test: submit a new post and assert it appears at the top of the feed
- Search test: enter a search query and assert only matching posts are shown
