# Design Document: Comment Scroll Preservation

## Overview

This feature modifies `static/js/wall.js` to eliminate the disruptive full-feed reload that currently occurs after every comment action (submit, reply, edit, delete). Instead of calling `loadPosts()` after comment operations, the code will perform targeted, in-place DOM updates: refresh only the affected post's comment list, update the comment count badge, and leave the scroll position and the rest of the feed untouched.

No backend changes are required. All existing API endpoints (`POST /api/posts/:id/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id`, `GET /api/posts/:id/comments`) already return the data needed.

---

## Architecture

The change is entirely client-side, confined to `static/js/wall.js`.

### Current Flow (problematic)

```
User submits comment
  → API call succeeds
  → loadPosts()          ← re-renders entire feed, resets scroll
  → Comment section collapses
```

### New Flow

```
User submits comment
  → API call succeeds
  → loadCommentsForCard(card)   ← refreshes only this post's comment list
  → updateCommentCount(card, +1) ← increments badge in-place
  → Comment section stays open
  → Scroll position unchanged
```

---

## Component Design

### 1. `updateCommentCount(card, delta)`

A new helper function that adjusts the comment count badge on a post card without touching the DOM outside that card.

```javascript
function updateCommentCount(card, delta) {
  var ccountEl = card.querySelector('.btn-comment-toggle .ccount');
  if (!ccountEl) return;
  var current = parseInt(ccountEl.textContent, 10) || 0;
  ccountEl.textContent = String(current + delta);
}
```

### 2. Modified `addBtn` click handler (new top-level comment)

**Before:**
```javascript
addBtn.addEventListener('click', function () {
  // ...
  api('/api/posts/' + p.id + '/comments', { ... })
    .then(function () {
      ta.value = '';
      loadCommentsForCard(card);
      loadPosts();           // ← REMOVE
    })
    .catch(function (e) {
      statusEl.textContent = e.message || 'Could not add comment.';
    });
});
```

**After:**
```javascript
addBtn.addEventListener('click', function () {
  var text = (ta.value || '').trim();
  if (!text) return;
  var errorEl = block.querySelector('.comment-form-error');
  if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
  api('/api/posts/' + p.id + '/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: currentUser.user_id, content: text, parent_id: null }),
  })
    .then(function () {
      ta.value = '';
      loadCommentsForCard(card);
      updateCommentCount(card, +1);
      // loadPosts() removed
    })
    .catch(function (e) {
      if (errorEl) {
        errorEl.textContent = e.message || 'Could not add comment.';
        errorEl.classList.remove('hidden');
      } else {
        statusEl.textContent = e.message || 'Could not add comment.';
      }
    });
});
```

### 3. Modified reply submit handler

Same pattern: remove `loadPosts()`, call `loadCommentsForCard(card)` and `updateCommentCount(card, +1)`.

### 4. Modified comment edit handler (inside `renderComment`)

**Before:**
```javascript
api('/api/comments/' + c.id, { method: 'PUT', ... })
  .then(function () {
    ctx.close();
    loadCommentsForCard(document.querySelector('[data-post-id="' + postId + '"]'));
    loadPosts();   // ← REMOVE
  })
```

**After:**
```javascript
api('/api/comments/' + c.id, { method: 'PUT', ... })
  .then(function () {
    ctx.close();
    var targetCard = document.querySelector('[data-post-id="' + postId + '"]');
    loadCommentsForCard(targetCard);
    // loadPosts() removed — comment count unchanged on edit
  })
```

### 5. Modified comment delete handler (inside `renderComment`)

**Before:**
```javascript
api('/api/comments/' + c.id, { method: 'DELETE', ... })
  .then(function () {
    ctx.close();
    loadCommentsForCard(document.querySelector('[data-post-id="' + postId + '"]'));
    loadPosts();   // ← REMOVE
  })
```

**After:**
```javascript
api('/api/comments/' + c.id, { method: 'DELETE', ... })
  .then(function () {
    ctx.close();
    var targetCard = document.querySelector('[data-post-id="' + postId + '"]');
    loadCommentsForCard(targetCard);
    updateCommentCount(targetCard, -1);
    // loadPosts() removed
  })
```

### 6. Inline error display for Comment_Form

Add a `<p class="comment-form-error hidden">` element inside the `.comment-form` HTML generated in `renderPostShell`. This allows per-post error messages without touching the global `#feed-status` element.

**Modified section of `renderPostShell`:**
```javascript
'<div class="comment-form">' +
'<textarea placeholder="Write a comment…" aria-label="New comment"></textarea>' +
'<p class="comment-form-error hidden" aria-live="polite"></p>' +
'<button type="button" class="btn-sm add-comment">Comment</button>' +
'</div>'
```

---

## Data Flow

### New Comment Submission

```
addBtn.click
  ↓
validate text (non-empty)
  ↓
POST /api/posts/:id/comments
  ↓ success
clear textarea
loadCommentsForCard(card)   → GET /api/posts/:id/comments → re-render .comments-tree
updateCommentCount(card, +1) → mutate .ccount text in-place
  ↓ error
show error in .comment-form-error (text preserved in textarea)
```

### Reply Submission

```
sendReplyBtn.click
  ↓
POST /api/posts/:id/comments  (parent_id set)
  ↓ success
clear reply textarea
hide reply form
loadCommentsForCard(card)
updateCommentCount(card, +1)
  ↓ error
statusEl.textContent (existing behaviour, reply form stays open)
```

### Comment Edit

```
Action_Modal confirm
  ↓
PUT /api/comments/:id
  ↓ success
close modal
loadCommentsForCard(targetCard)   (comment section stays open)
  ↓ error
modal error message (existing behaviour)
```

### Comment Delete

```
Action_Modal confirm
  ↓
DELETE /api/comments/:id
  ↓ success
close modal
loadCommentsForCard(targetCard)
updateCommentCount(targetCard, -1)
  ↓ error
modal error message (existing behaviour)
```

---

## Key Invariants

1. `loadPosts()` is never called as a side-effect of any comment operation.
2. `window.scrollY` is never modified by any comment operation.
3. The `.comments-block` element is never toggled hidden by a comment operation.
4. After a successful comment submission, the `.comments-tree` is refreshed via `loadCommentsForCard`.
5. The `.ccount` badge reflects the true count after every add/delete without a full feed reload.
6. On submission failure, the textarea retains its content and an error is shown near the form.

---

## Correctness Properties

### Property 1: Scroll position is unchanged after comment operations

For any comment operation (submit, reply, edit, delete), `window.scrollY` before the operation equals `window.scrollY` after the operation completes.

**Validates:** Requirements 1.1, 1.2, 3.1, 6.3

### Property 2: Comment section visibility is preserved after comment operations

For any comment operation on a post whose `.comments-block` is visible (does not have class `hidden`), the `.comments-block` remains visible after the operation completes.

**Validates:** Requirements 2.1, 2.2, 3.3

### Property 3: Comment count badge reflects delta correctly

After N successful comment submissions on a post, the `.ccount` value equals the initial count plus N. After M successful comment deletions, the `.ccount` value equals the count before deletions minus M.

**Validates:** Requirements 4.1, 4.2, 4.3

### Property 4: Comment form textarea is cleared after successful submission

After a successful top-level comment submission, the Comment_Form textarea value is the empty string.

**Validates:** Requirement 5.1

### Property 5: Comment form textarea retains content after failed submission

After a failed comment submission, the Comment_Form textarea value equals the value it had before the submission attempt.

**Validates:** Requirement 6.2

---

## Files Changed

| File | Change |
|------|--------|
| `static/js/wall.js` | Remove `loadPosts()` calls from comment handlers; add `updateCommentCount()`; add inline error element to comment form |

No HTML template changes are required. No backend changes are required.
