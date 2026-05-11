# Implementation Plan

## Bug 1: Comments Font Issue

- [ ] 1. Write bug condition exploration test - Comments Font
  - **Property 1: Bug Condition** - Comments Display in Wrong Font
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate comments display in wrong font
  - **Scoped PBT Approach**: Scope the property to comment elements - test that any comment element uses application font (DM Sans or Times New Roman)
  - Test that comment elements have `font-family` set to `var(--font-sans)` or `var(--font-serif)` (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Property 1)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "comment displays in monospace font instead of DM Sans")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [ ] 2. Write preservation property tests - Comments Font (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Comment Font Styling Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-comment elements (posts, headers, buttons)
  - Write property-based tests capturing observed font styling for non-comment elements from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2_

- [ ] 3. Fix comments font issue

  - [ ] 3.1 Add font-family declaration to .comment CSS class
    - Open `static/css/style.css`
    - Locate `.comment` class definition (around line 827)
    - Add `font-family: var(--font-sans);` to ensure comments use DM Sans
    - Verify dark mode selector `[data-theme="dark"] .comment` inherits font correctly
    - _Bug_Condition: isBugCondition_CommentFont(element) where element.classList.contains('comment')_
    - _Expected_Behavior: Comments display in DM Sans font (Property 1 from design)_
    - _Preservation: Non-comment elements retain current fonts (Property 10 from design)_
    - _Requirements: 1.1, 2.1, 3.1, 3.2_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Comments Display in Application Font
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Comment Font Styling Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

## Bug 2: Trending Posts Display Bug

- [ ] 4. Write bug condition exploration test - Trending Posts
  - **Property 1: Bug Condition** - Trending Posts Disappear After Reaction
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate trending posts disappear
  - **Scoped PBT Approach**: Scope the property to scenarios where top post has 2x reactions of second post
  - Test that when top post receives reaction, other trending posts remain visible (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Property 2)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "second trending post disappears when top post gets reaction")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 2.2_

- [ ] 5. Write preservation property tests - Trending Posts (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Trending Post Reactions Work
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for reactions on non-trending posts
  - Write property-based tests capturing observed reaction behavior from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.3, 3.4_

- [ ] 6. Fix trending posts display bug

  - [ ] 6.1 Remove or adjust 2x ratio check in loadTrending function
    - Open `static/js/wall.js`
    - Locate `loadTrending` function (around line 398)
    - Find the ratio check logic (lines 410-415): `if (second > 0 && top >= second * 2) showCount = 1;`
    - Remove this check or increase threshold to 3x or 4x to be less aggressive
    - Alternative: Always show top 3 posts with reactions: `var display = withReactions.slice(0, 3);`
    - _Bug_Condition: isBugCondition_TrendingDisplay(state) where top post receives reaction_
    - _Expected_Behavior: All trending posts remain visible (Property 2 from design)_
    - _Preservation: Non-trending post reactions work correctly (Property 11 from design)_
    - _Requirements: 1.2, 2.2, 3.3, 3.4_

  - [ ] 6.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Trending Posts Display All Qualifying Posts
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2_

  - [ ] 6.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Trending Post Reactions Work
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run preservation property tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

## Bug 3: User Profile Missing

- [ ] 7. Write bug condition exploration test - Writers Hub Profile
  - **Property 1: Bug Condition** - Profile Missing on Writers Hub
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate profile is missing
  - **Scoped PBT Approach**: Scope the property to Writers Hub page navigation
  - Test that navigating to `/writers` displays header avatar and profile name (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Property 3)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "header avatar is blank on Writers Hub page")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 2.3_

- [ ] 8. Write bug condition exploration test - Freedom Wall Profile
  - **Property 1: Bug Condition** - Profile Missing on Freedom Wall
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate profile is missing
  - **Scoped PBT Approach**: Scope the property to Freedom Wall page navigation
  - Test that navigating to `/freedom-wall` displays header avatar and profile name (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Property 4)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "header avatar is blank on Freedom Wall page")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4, 2.4_

- [ ] 9. Write preservation property tests - User Profile (BEFORE implementing fix)
  - **Property 2: Preservation** - Home Wall Profile Display Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for Home Wall profile display
  - Write property-based tests capturing observed profile behavior from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.5, 3.6_

- [ ] 10. Fix user profile missing on Writers Hub

  - [ ] 10.1 Add profile initialization to writers.js
    - Open `static/js/writers.js`
    - Locate end of initialization code (after line 600)
    - Add profile initialization code to set header avatar and profile link
    - Set `#header-avatar` src to `currentUser.photo_url`
    - Set `#header-avatar-link` href to `/profile/{user_id}`
    - Handle case where photo_url is missing (add `no-image` class)
    - _Bug_Condition: isBugCondition_ProfileMissing(page) where page.url === '/writers'_
    - _Expected_Behavior: Profile displays on Writers Hub (Property 3 from design)_
    - _Preservation: Home Wall profile continues to work (Property 12 from design)_
    - _Requirements: 1.3, 2.3, 3.5, 3.6_

  - [ ] 10.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Profile Displays on Writers Hub
    - **IMPORTANT**: Re-run the SAME test from task 7 - do NOT write a new test
    - The test from task 7 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 7
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.3_

  - [ ] 10.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Home Wall Profile Display Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 9 - do NOT write new tests
    - Run preservation property tests from step 9
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 11. Fix user profile missing on Freedom Wall

  - [ ] 11.1 Add profile initialization to freedom_wall.js
    - Open `static/js/freedom_wall.js`
    - Locate end of initialization code (after line 900)
    - Add profile initialization code to set header avatar and profile link
    - Set `#header-avatar` src to `currentUser.photo_url`
    - Set `#header-avatar-link` href to `/profile/{user_id}`
    - Handle case where photo_url is missing (add `no-image` class)
    - _Bug_Condition: isBugCondition_ProfileMissing(page) where page.url === '/freedom-wall'_
    - _Expected_Behavior: Profile displays on Freedom Wall (Property 4 from design)_
    - _Preservation: Home Wall profile continues to work (Property 12 from design)_
    - _Requirements: 1.4, 2.4, 3.5, 3.6_

  - [ ] 11.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Profile Displays on Freedom Wall
    - **IMPORTANT**: Re-run the SAME test from task 8 - do NOT write a new test
    - The test from task 8 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 8
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.4_

  - [ ] 11.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Home Wall Profile Display Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 9 - do NOT write new tests
    - Run preservation property tests from step 9
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

## Bug 4: Add Image Button Positioning

- [ ] 12. Write bug condition exploration test - Button Positioning
  - **Property 1: Bug Condition** - Image Button Centered Instead of Inline
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate button is mispositioned
  - **Scoped PBT Approach**: Scope the property to post composer interface
  - Test that image button is horizontally aligned with category dropdown (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Property 5)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "image button appears centered below category dropdown")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.5, 1.6, 2.5, 2.6_

- [ ] 13. Write preservation property tests - Button Functionality (BEFORE implementing fix)
  - **Property 2: Preservation** - Image Button Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for image button click and file attachment
  - Write property-based tests capturing observed button functionality from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.7, 3.8_

- [ ] 14. Fix add image button positioning

  - [ ] 14.1 Adjust CSS for button positioning
    - Open `static/css/style.css`
    - Locate `.composer-meta-row` class (around line 697)
    - Ensure flexbox layout with `display: flex` and `align-items: center`
    - Add or adjust `gap` property for consistent spacing (e.g., `gap: 0.5rem`)
    - Ensure `#post-image-btn` or `.btn-sm` uses `display: inline-flex` or `inline-block`
    - Remove any `text-align: center` or `display: block` that causes centering
    - _Bug_Condition: isBugCondition_ButtonPosition(composerUI) where button is centered_
    - _Expected_Behavior: Button positioned next to category dropdown (Property 5 from design)_
    - _Preservation: Button functionality unchanged (Property 13 from design)_
    - _Requirements: 1.5, 1.6, 2.5, 2.6, 3.7, 3.8_

  - [ ] 14.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Image Button Positioned Next to Category
    - **IMPORTANT**: Re-run the SAME test from task 12 - do NOT write a new test
    - The test from task 12 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 12
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.5, 2.6_

  - [ ] 14.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Image Button Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 13 - do NOT write new tests
    - Run preservation property tests from step 13
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

## Bug 5: Home Button Refresh Behavior

- [ ] 15. Write bug condition exploration test - Home Refresh
  - **Property 1: Bug Condition** - Home Button Does Not Refresh Posts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate posts do not refresh
  - **Scoped PBT Approach**: Scope the property to same-page home link clicks
  - Test that clicking home link while on `/wall` refreshes and randomizes posts (from Bug Condition in design)
  - Test that end-of-content indicator displays at end of feed (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Properties 6, 7)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "posts remain in same order after clicking home link")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.7, 1.8, 1.9, 2.7, 2.8, 2.9_

- [ ] 16. Write preservation property tests - Home Navigation (BEFORE implementing fix)
  - **Property 2: Preservation** - Navigation and Filtering Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for navigation from other pages, filters, search
  - Write property-based tests capturing observed navigation behavior from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.9, 3.10_

- [ ] 17. Fix home button refresh behavior

  - [ ] 17.1 Add click handler for same-page home navigation
    - Open `static/js/wall.js`
    - Locate initialization code (after DOMContentLoaded)
    - Add event listener to home link (`a[href="/wall"]`)
    - Check if `window.location.pathname === '/wall'`
    - If true, prevent default and call `loadPosts(true)` to refresh with randomization
    - _Bug_Condition: isBugCondition_HomeRefresh(navigation) where currentPage === '/wall'_
    - _Expected_Behavior: Posts refresh and randomize (Property 6 from design)_
    - _Preservation: Navigation from other pages unchanged (Property 14 from design)_
    - _Requirements: 1.7, 1.8, 2.7, 2.8, 3.9, 3.10_

  - [ ] 17.2 Add randomization logic to loadPosts function
    - Modify `loadPosts` function to accept `randomize` parameter
    - If `randomize` is true, shuffle posts array using Fisher-Yates algorithm
    - Ensure posts are shuffled before rendering
    - _Bug_Condition: isBugCondition_HomeRefresh(navigation) where posts not randomized_
    - _Expected_Behavior: Posts display in random order (Property 6 from design)_
    - _Preservation: Default post loading unchanged (Property 14 from design)_
    - _Requirements: 1.7, 2.7, 3.9_

  - [ ] 17.3 Add end-of-content indicator
    - After rendering posts in `loadPosts`, check if posts exist
    - If posts.length > 0, append end message element
    - Create paragraph with class `status-msg` and text "that's the only posts"
    - Append to feed element
    - _Bug_Condition: isBugCondition_HomeRefresh(navigation) where no end indicator_
    - _Expected_Behavior: End indicator displays (Property 7 from design)_
    - _Preservation: Post rendering unchanged (Property 14 from design)_
    - _Requirements: 1.9, 2.9, 3.9_

  - [ ] 17.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Home Button Refreshes Posts
    - **IMPORTANT**: Re-run the SAME test from task 15 - do NOT write a new test
    - The test from task 15 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 15
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.7, 2.8, 2.9_

  - [ ] 17.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Navigation and Filtering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 16 - do NOT write new tests
    - Run preservation property tests from step 16
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

## Bug 6: Freedom Wall Refresh Behavior

- [ ] 18. Write bug condition exploration test - Freedom Wall Refresh
  - **Property 1: Bug Condition** - Freedom Wall Button Does Not Refresh Posts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate posts do not refresh
  - **Scoped PBT Approach**: Scope the property to same-page Freedom Wall link clicks
  - Test that clicking Freedom Wall link while on `/freedom-wall` refreshes and randomizes posts (from Bug Condition in design)
  - Test that end-of-content indicator displays at end of feed (from Bug Condition in design)
  - The test assertions should match the Expected Behavior Properties from design (Properties 8, 9)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "posts remain in same order after clicking Freedom Wall link")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.10, 1.11, 1.12, 2.10, 2.11, 2.12_

- [ ] 19. Write preservation property tests - Freedom Wall Navigation (BEFORE implementing fix)
  - **Property 2: Preservation** - Navigation and Filtering Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for navigation from other pages, filters, search
  - Write property-based tests capturing observed navigation behavior from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.11, 3.12, 3.13_

- [ ] 20. Fix Freedom Wall refresh behavior

  - [ ] 20.1 Add click handler for same-page Freedom Wall navigation
    - Open `static/js/freedom_wall.js`
    - Locate initialization code (after DOMContentLoaded)
    - Add event listener to Freedom Wall link (`a[href="/freedom-wall"]`)
    - Check if `window.location.pathname === '/freedom-wall'`
    - If true, prevent default and call `loadPosts(searchEl.value.trim(), true)` to refresh with randomization
    - _Bug_Condition: isBugCondition_FreedomWallRefresh(navigation) where currentPage === '/freedom-wall'_
    - _Expected_Behavior: Posts refresh and randomize (Property 8 from design)_
    - _Preservation: Navigation from other pages unchanged (Property 14 from design)_
    - _Requirements: 1.10, 1.11, 2.10, 2.11, 3.11, 3.12_

  - [ ] 20.2 Add randomization logic to loadPosts function
    - Modify `loadPosts` function to accept `randomize` parameter (second parameter after `q`)
    - If `randomize` is true, shuffle posts array using Fisher-Yates algorithm
    - Ensure posts are shuffled before rendering
    - _Bug_Condition: isBugCondition_FreedomWallRefresh(navigation) where posts not randomized_
    - _Expected_Behavior: Posts display in random order (Property 8 from design)_
    - _Preservation: Default post loading unchanged (Property 14 from design)_
    - _Requirements: 1.10, 2.10, 3.11_

  - [ ] 20.3 Add end-of-content indicator
    - After rendering posts in `loadPosts`, check if posts exist
    - If posts.length > 0, append end message element
    - Create paragraph with class `fw-status-msg` and text "that's the only posts"
    - Append to grid element
    - _Bug_Condition: isBugCondition_FreedomWallRefresh(navigation) where no end indicator_
    - _Expected_Behavior: End indicator displays (Property 9 from design)_
    - _Preservation: Post rendering unchanged (Property 14 from design)_
    - _Requirements: 1.12, 2.12, 3.13_

  - [ ] 20.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Freedom Wall Button Refreshes Posts
    - **IMPORTANT**: Re-run the SAME test from task 18 - do NOT write a new test
    - The test from task 18 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 18
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.10, 2.11, 2.12_

  - [ ] 20.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Navigation and Filtering Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 19 - do NOT write new tests
    - Run preservation property tests from step 19
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass for all 6 bugs, ask the user if questions arise.
