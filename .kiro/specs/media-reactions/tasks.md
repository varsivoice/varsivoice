# Implementation Plan: Media Reactions

## Overview

Implement two features on top of the existing Flask + SQLite + vanilla JS Freedom Wall app:

1. **Image uploads** — optional single-image attachment on posts and comments, stored under `static/uploads/posts/` and `static/uploads/comments/`, served via Flask's static file mechanism.
2. **Emoji reactions** — replace the existing heart-like button with a Facebook-style hover picker (❤️ 😂 😮 😢 😡) backed by a new `reactions` table, migrating existing `likes` data to `heart` reactions.

Each task builds on the previous one. All existing tests must continue to pass at every checkpoint.

---

## Tasks

- [x] 1. Database schema — add `reactions` table and migrate existing likes

  - In `app.py` `init_db()`, add a `CREATE TABLE IF NOT EXISTS reactions` statement with columns: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `target_type TEXT NOT NULL` (values `'post'` or `'comment'`), `target_id INTEGER NOT NULL`, `user_token TEXT NOT NULL`, `reaction_type TEXT NOT NULL`, `created_at TEXT NOT NULL DEFAULT (datetime('now'))`.
  - Add a `UNIQUE (target_type, target_id, user_token)` constraint so each user holds at most one reaction per target.
  - After creating the table, run a migration block (guarded by `IF NOT EXISTS` or a check for existing rows) that inserts all rows from `likes` as `heart` reactions into `reactions`: `INSERT OR IGNORE INTO reactions (target_type, target_id, user_token, reaction_type) SELECT 'post', post_id, user_token, 'heart' FROM likes`.
  - Keep the `likes` table intact for backward compatibility (existing `/api/posts/<id>/likes` endpoints remain unchanged for now).
  - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [x] 2. Backend — reaction API endpoints

  - [x] 2.1 Implement GET `/api/reactions` endpoint
    - Accept query params `target_type`, `target_id`, `token` (user token).
    - Return JSON `{ "counts": { "heart": N, "haha": N, "wow": N, "sad": N, "angry": N }, "total": N, "user_reaction": "<type> | null" }`.
    - Validate `target_type` is `'post'` or `'comment'`; return 400 otherwise.
    - _Requirements: 6.4_

  - [x] 2.2 Implement POST `/api/reactions` endpoint
    - Accept JSON body `{ "target_type": "post"|"comment", "target_id": N, "user_token": "...", "reaction_type": "heart"|"haha"|"wow"|"sad"|"angry" }`.
    - Apply add/remove/replace logic atomically using SQLite `INSERT OR REPLACE` / `DELETE`:
      - If the user has no reaction → insert the new reaction.
      - If the user has the same reaction → delete it (toggle off).
      - If the user has a different reaction → delete the old one, insert the new one.
    - Return the same shape as the GET endpoint after the mutation.
    - Validate `reaction_type` against the allowed set; return 400 for unknown types.
    - _Requirements: 6.2, 6.5, 4.4, 4.5, 4.6, 4.8, 5.2, 5.4_

  - [x] 2.3 Wire reaction CASCADE deletes
    - Confirm that `ON DELETE CASCADE` is set on `reactions` for both post and comment deletions. Because `reactions` references `target_id` without a direct FK (polymorphic), add explicit `DELETE FROM reactions WHERE target_type='post' AND target_id=?` inside `delete_post`, and `DELETE FROM reactions WHERE target_type='comment' AND target_id=?` inside `delete_comment` before the main delete, or rely on application-level cleanup.
    - _Requirements: 6.3_

- [x] 3. Backend — image upload endpoints

  - [x] 3.1 Add upload directories and shared helper
    - Define `POST_UPLOAD_DIR` and `COMMENT_UPLOAD_DIR` constants pointing to `static/uploads/posts/` and `static/uploads/comments/`.
    - Reuse the existing `allowed_file()` helper and the 5 MB size check pattern.
    - Add a `save_upload(file, directory)` helper that: calls `secure_filename`, generates a UUID-based filename (`uuid4().hex + ext`), calls `os.makedirs(directory, exist_ok=True)`, saves the file, and returns the relative static URL.
    - _Requirements: 3.1, 3.2, 1.5, 2.2_

  - [x] 3.2 Add `image_url` column to `posts` and `comments` tables
    - In `init_db()`, add `ALTER TABLE posts ADD COLUMN image_url TEXT NULL` and `ALTER TABLE comments ADD COLUMN image_url TEXT NULL`, each guarded with a try/except for `OperationalError` (column already exists).
    - _Requirements: 1.1, 2.1_

  - [x] 3.3 Update `POST /api/posts` to accept multipart form data with optional image
    - Change the endpoint to read `request.form` for text fields and `request.files.get('image')` for the optional file.
    - If a file is present: validate extension (400 if invalid), validate size ≤ 5 MB (400 if exceeded), call `save_upload`, store the returned URL in `image_url`.
    - If no file: `image_url = None`.
    - Include `image_url` in the returned post JSON.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 3.1, 3.2_

  - [x] 3.4 Update `POST /api/posts/<id>/comments` to accept multipart form data with optional image
    - Same pattern as 3.3 but for comments; store under `static/uploads/comments/`.
    - Include `image_url` in the returned comment JSON.
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 3.1, 3.2_

  - [x] 3.5 Include `image_url` in all existing GET responses for posts and comments
    - Update `list_posts`, `get_public_profile`, `list_comments`, and the single-row SELECTs in `create_post` / `create_comment` / `update_post` / `update_comment` to include `p.image_url` / `cm.image_url` in the SELECT list.
    - _Requirements: 1.6, 2.4, 3.3_

  - [x] 3.6 Delete image file on post/comment deletion
    - In `delete_post`, before executing the DELETE SQL, fetch `image_url` from the post row and call `os.remove(os.path.join(app.root_path, image_url.lstrip('/')))` if it exists on disk.
    - Apply the same pattern in `delete_comment`.
    - _Requirements: 3.4_

- [x] 4. Checkpoint — backend complete
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify with `curl` or a REST client:
    - `POST /api/posts` with a multipart form returns `image_url`.
    - `GET /api/reactions?target_type=post&target_id=1&token=user_1` returns the expected shape.
    - `POST /api/reactions` toggles correctly.

- [x] 5. Frontend — reaction UI (wall.js)

  - [x] 5.1 Add `REACTION_TYPES` constant and helper functions
    - At the top of `wall.js`, define `var REACTION_TYPES = ['heart','haha','wow','sad','angry']` and `var REACTION_EMOJI = { heart:'❤️', haha:'😂', wow:'😮', sad:'😢', angry:'😡' }`.
    - Add `getReactionToken()` as an alias for the existing `getLikeToken()` (or rename the call sites).
    - _Requirements: 4.1, 5.1_

  - [x] 5.2 Replace the like button HTML in `renderPostShell` with a reaction trigger
    - Remove the `<button class="btn-like">` markup.
    - Insert a reaction trigger + picker structure:
      ```html
      <div class="reaction-wrap" data-post-id="...">
        <button type="button" class="btn-reaction-trigger" aria-label="React">
          <span class="reaction-emoji">❤️</span>
          <span class="reaction-count"></span>
        </button>
        <div class="reaction-picker hidden" role="toolbar" aria-label="Pick a reaction">
          <!-- five emoji buttons injected by JS -->
        </div>
      </div>
      ```
    - Build the five picker buttons from `REACTION_TYPES` in a loop, each with `aria-label` equal to the capitalised type name.
    - _Requirements: 4.1, 4.2, 7.2, 7.3_

  - [x] 5.3 Add the same reaction trigger structure inside `renderComment`
    - Mirror the structure from 5.2 for comments, using `data-comment-id` instead of `data-post-id`.
    - _Requirements: 5.1, 5.3_

  - [x] 5.4 Implement `bindReactionWidget(wrap, targetType, targetId)` function
    - `wrap` is the `.reaction-wrap` element.
    - On `mouseenter` of the trigger: show the picker (remove `hidden`) after a ~300 ms delay (use `setTimeout`; cancel on `mouseleave`).
    - On `mouseleave` of both trigger and picker: hide the picker after a ~200 ms delay (cancel if cursor re-enters either).
    - On **direct click** of the trigger (not via picker): call `toggleReaction(targetType, targetId, null)` — null means "toggle heart or remove current".
    - On click of a picker emoji button: call `toggleReaction(targetType, targetId, reactionType)`, then hide the picker.
    - _Requirements: 4.2, 4.3, 4.7, 5.1_

  - [x] 5.5 Implement `toggleReaction(targetType, targetId, reactionType)` and `applyReactionVisual(wrap, data)`
    - `toggleReaction`: POST to `/api/reactions` with `{ target_type, target_id, user_token, reaction_type }`. If `reactionType` is null, derive it: if user has an active reaction send the same type (to toggle off), else send `'heart'`.
    - On success, call `applyReactionVisual(wrap, data)`.
    - `applyReactionVisual(wrap, data)`: update `.reaction-emoji` to `REACTION_EMOJI[data.user_reaction] || '❤️'`, update `.reaction-count` to `data.total > 0 ? data.total : ''`, update `aria-label` on the trigger, add/remove `active` class on the matching picker button.
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 7.1, 7.2, 7.4, 7.5_

  - [x] 5.6 Hydrate reaction state on page load
    - In `hydratePost`, replace the existing `fetch('/api/posts/<id>/likes…')` call with `fetch('/api/reactions?target_type=post&target_id=<id>&token=<token>')` and call `applyReactionVisual` with the result.
    - In `loadCommentsForCard`, after rendering each comment, call `fetch('/api/reactions?target_type=comment&target_id=<id>&token=<token>')` and call `applyReactionVisual` on the comment's `.reaction-wrap`.
    - _Requirements: 4.9, 5.3_

  - [x] 5.7 Remove old like-related code
    - Delete `applyLikeVisual`, the `likeBtn` variable, and the `likeBtn.addEventListener('click', …)` block from `hydratePost`.
    - Remove the `btn-like` selector references.
    - Update `loadTrending` to use `p.reaction_count || p.like_count || 0` for the count display (the backend still returns `like_count` from the `likes` table; update once reactions are fully wired, or keep both for now).
    - _Requirements: 4.10_

- [x] 6. Frontend — image upload UI (wall.js + wall.html)

  - [x] 6.1 Enable the "Upload image" composer button in `wall.html`
    - Remove the `is-disabled` class and `disabled` attribute from the upload button.
    - Add a hidden `<input type="file" id="post-image-file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" />` inside the composer section.
    - Wire the button click to trigger `post-image-file.click()`.
    - Show a small filename preview label next to the button when a file is selected.
    - _Requirements: 1.8_

  - [x] 6.2 Update the composer submit handler to send multipart form data
    - Change `api('/api/posts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({…}) })` to use `FormData`: append `user_id`, `content`, `category`, and optionally the image file.
    - Clear the file input and filename preview after a successful post.
    - _Requirements: 1.1_

  - [x] 6.3 Add image file input to the comment form in `hydratePost`
    - In the comment form HTML (inside `renderPostShell`), add a small file input and a label below the textarea.
    - Update the `add-comment` click handler to use `FormData` instead of JSON when submitting.
    - _Requirements: 2.1, 2.6_

  - [x] 6.4 Add image file input to the reply form in `renderComment`
    - When the reply form is built (inside the `btn-reply` click handler), add a file input.
    - Update the `send-reply` click handler to use `FormData`.
    - _Requirements: 2.1, 2.6_

  - [x] 6.5 Implement `renderMediaAttachment(imageUrl)` and call it in post/comment renderers
    - Returns `''` if `imageUrl` is falsy (no placeholder).
    - Returns `'<img class="post-media" src="' + escapeHtml(imageUrl) + '" alt="Attached image" />'` otherwise.
    - Call it in `renderPostShell` after `.post-body` and in `renderComment` after `.comment-body`.
    - _Requirements: 1.6, 1.7, 2.4, 2.5_

- [x] 7. Styles — reaction picker and media attachment (style.css)

  - [x] 7.1 Add reaction widget styles
    - `.reaction-wrap` — `position: relative; display: inline-flex; align-items: center;`
    - `.btn-reaction-trigger` — same base styles as the existing `.btn-like` (pill shape, border, hover state); add `transition: transform 0.1s` for the active-reaction scale effect.
    - `.reaction-picker` — `position: absolute; bottom: calc(100% + 6px); left: 0; display: flex; gap: 4px; background: #fff; border: 1px solid var(--border-soft); border-radius: var(--radius-pill); padding: 4px 8px; box-shadow: var(--shadow-card); z-index: 10;`
    - `.reaction-picker button` — `background: none; border: none; font-size: 1.4rem; cursor: pointer; padding: 2px 4px; border-radius: 50%; transition: transform 0.15s;`
    - `.reaction-picker button:hover, .reaction-picker button.active` — `transform: scale(1.35);`
    - _Requirements: 4.2, 7.4_

  - [x] 7.2 Add media attachment styles
    - `.post-media` — `display: block; max-width: 100%; border-radius: var(--radius-md); margin-top: 0.65rem; object-fit: contain;`
    - `.comment-media` — same as `.post-media` but `max-width: 240px;`
    - _Requirements: 1.6, 2.4_

  - [ ]* 7.3 Write unit tests for `save_upload` helper (Python)
    - Test that a valid file is saved with a UUID-based name under the correct directory.
    - Test that the returned URL starts with `/static/uploads/`.
    - _Requirements: 3.1, 3.2_

- [x] 8. Checkpoint — full feature complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify end-to-end in the browser:
    - Post with image shows the image inline.
    - Comment with image shows the image inline.
    - Hovering the reaction trigger opens the picker.
    - Clicking a reaction updates the trigger emoji and count without reload.
    - Clicking the same reaction again removes it.
    - Clicking the trigger directly toggles ❤️.
    - Existing posts migrated from `likes` show the correct heart reaction count.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- The `likes` table and its endpoints are kept intact throughout; the migration in task 1 seeds `reactions` from `likes` so both systems coexist during the transition.
- Property-based tests are not included because the design document contains no Correctness Properties section — unit and integration tests are used instead.
