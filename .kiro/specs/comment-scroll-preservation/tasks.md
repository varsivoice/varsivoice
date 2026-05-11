# Implementation Plan: Comment Scroll Preservation

## Overview

All changes are confined to `static/js/wall.js`. The work removes `loadPosts()` calls from every comment handler and replaces them with targeted in-place DOM updates: `loadCommentsForCard(card)` to refresh the comment list and a new `updateCommentCount(card, delta)` helper to adjust the badge. An inline error element is added to the comment form so submission failures are shown near the form without touching the global status bar.

## Tasks

- [x] 1. Add `updateCommentCount` helper and inline error element to comment form
  - [x] 1.1 Implement `updateCommentCount(card, delta)` helper function
    - Add the function after the existing `loadCommentsForCard` function in `wall.js`
    - It should locate `.btn-comment-toggle .ccount` inside the given card, parse its text as an integer, add `delta`, and write the result back
    - If the element is not found, return silently
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.2 Add inline error paragraph to the comment form HTML in `renderPostShell`
    - Inside the `'<div class="comment-form">'` string in `renderPostShell`, insert `'<p class="comment-form-error hidden" aria-live="polite"></p>'` between the textarea and the submit button
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Fix new top-level comment submission handler
  - [x] 2.1 Update `addBtn` click handler in `hydratePost` to remove `loadPosts()` and use targeted updates
    - Remove the `loadPosts()` call from the `.then()` callback of the add-comment API call
    - After `loadCommentsForCard(card)`, call `updateCommentCount(card, +1)`
    - In the `.catch()` handler, read the `.comment-form-error` element from `block` and display the error message there instead of writing to `statusEl`; do not clear the textarea on error
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 4.1, 5.1, 6.1, 6.2, 6.3_

  - [ ]* 2.2 Write property test for scroll position after new comment submission
    - **Property 1: Scroll position is unchanged after comment operations**
    - **Validates: Requirements 1.1, 6.3**

  - [ ]* 2.3 Write unit tests for `updateCommentCount`
    - Test increment by 1 from a known starting value
    - Test decrement by 1
    - Test graceful no-op when `.ccount` element is absent
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Fix reply submission handler
  - [x] 3.1 Update the `send-reply` button click handler inside `renderComment` to remove `loadPosts()` and use targeted updates
    - Remove the `loadPosts()` call from the `.then()` callback of the reply API call
    - After `loadCommentsForCard(...)`, call `updateCommentCount(card, +1)` — obtain `card` via `document.querySelector('[data-post-id="' + postId + '"]')`
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 4.1, 5.2_

  - [ ]* 3.2 Write property test for scroll position after reply submission
    - **Property 1: Scroll position is unchanged after comment operations**
    - **Validates: Requirements 1.2**

- [x] 4. Checkpoint — verify comment submission no longer triggers full reload
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Fix comment edit handler
  - [x] 5.1 Update the `btn-comment-edit` confirm handler inside `renderComment` to remove `loadPosts()`
    - Remove the `loadPosts()` call from the `.then()` callback of the edit API call
    - The `loadCommentsForCard(targetCard)` call should remain; the comment section stays open because the `.comments-block` is not touched
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 5.2 Write property test for comment section visibility after edit
    - **Property 2: Comment section visibility is preserved after comment operations**
    - **Validates: Requirements 3.3**

- [x] 6. Fix comment delete handler
  - [x] 6.1 Update the `btn-comment-delete` confirm handler inside `renderComment` to remove `loadPosts()` and decrement the badge
    - Remove the `loadPosts()` call from the `.then()` callback of the delete API call
    - After `loadCommentsForCard(targetCard)`, call `updateCommentCount(targetCard, -1)`
    - _Requirements: 3.1, 3.2, 4.2, 4.3_

  - [ ]* 6.2 Write property test for comment count badge after delete
    - **Property 3: Comment count badge reflects delta correctly**
    - **Validates: Requirements 4.2, 4.3**

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All changes are in `static/js/wall.js` only — no backend or HTML template changes needed
- The existing `loadCommentsForCard` function is reused as-is; only the callers change
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
