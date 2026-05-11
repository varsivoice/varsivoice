# Posts Not Loading — Tasks

## Task List

- [x] 1. Write exploratory test to confirm the bug
  - [x] 1.1 Set up a test file for `wall.js` initialization (e.g., `static/js/wall.test.js` or a test runner entry point)
  - [x] 1.2 Write a test that initializes the wall page script in a minimal DOM (with `#feed`, `#search-q`, `#filter-btn`, `#filter-menu`, session storage set, but no `<select>` sort element) and asserts that `loadPosts()` is called — this test MUST fail on unfixed code with `ReferenceError: sortEl is not defined`
  - [x] 1.3 Run the test against the unfixed code and record the `ReferenceError` counterexample to confirm the root cause

- [x] 2. Apply the fix
  - [x] 2.1 In `static/js/wall.js`, delete line 1149: `sortEl.addEventListener("change", loadPosts);`

- [x] 3. Write fix-checking tests (Property 1)
  - [x] 3.1 Write a unit test asserting that `wall.js` initialization completes without throwing when no sort `<select>` element is present
  - [x] 3.2 Write a unit test asserting that `loadPosts()` is invoked during initialization
  - [x] 3.3 Write a unit test asserting that `#feed` is populated after initialization when the API returns posts
  - [x] 3.4 Run all fix-checking tests against the fixed code and confirm they pass

- [x] 4. Write preservation-checking tests (Property 2)
  - [x] 4.1 Write a test asserting that filter menu option clicks update `currentSort` and call `loadPosts()` (sort-change behavior is preserved via the existing filter menu handlers)
  - [x] 4.2 Write a test asserting that post submission calls the API and triggers a feed refresh
  - [x] 4.3 Write a property-based test that generates random valid session objects and asserts initialization always completes and calls `loadPosts()` without throwing
  - [x] 4.4 Run all preservation-checking tests against the fixed code and confirm they pass

- [x] 5. Verify end-to-end behavior
  - [x] 5.1 Manually load the wall page as an authenticated user and confirm posts appear in `#feed` on page load
  - [x] 5.2 Confirm that selecting each filter option reloads the feed with the correct sort order
  - [x] 5.3 Confirm that submitting a post, searching, reacting, and commenting all continue to work as before
