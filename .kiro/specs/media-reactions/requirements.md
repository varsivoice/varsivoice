# Requirements Document

## Introduction

This feature adds two capabilities to the Freedom Wall Flask app:

1. **Image uploads on posts and comments** — users can attach a single image when creating a post or writing a comment. The image is stored on the server and displayed inline beneath the text content.

2. **Emoji reactions on posts and comments** — replaces the single heart "like" with five distinct reaction types (❤️ Heart, 😂 Haha, 😮 Wow, 😢 Sad, 😡 Angry). Each reaction type is tracked separately per user per content item. A user may hold at most one active reaction at a time; switching to a different reaction replaces the previous one, and clicking the same reaction again removes it. Per-type counts are displayed on every post and comment.

The backend is Flask + SQLite. Uploaded images are stored under `static/uploads/` (mirroring the existing profile-photo pattern). The frontend is vanilla JS in `wall.js`.

---

## Glossary

- **Wall**: The Freedom Wall Flask application.
- **Post**: A top-level content item created by a user on the wall feed.
- **Comment**: A reply attached to a Post, optionally nested one level deep as a reply to another Comment.
- **Image_Uploader**: The server-side component that receives, validates, stores, and serves uploaded image files.
- **Reaction_Store**: The server-side component that persists and retrieves per-user, per-item reaction records.
- **Reaction_UI**: The client-side component that renders the reaction trigger button, the hover picker, and reaction counts, and sends reaction changes to the server.
- **Reaction_Trigger**: The single button displayed on a post or comment at all times. Shows the user's current active reaction emoji, or ❤️ by default if no reaction is active. Hovering it opens the Reaction_Picker.
- **Reaction_Picker**: The floating row of all five reaction emoji buttons that appears above the Reaction_Trigger on hover (or long-press on touch). Dismisses when the cursor leaves both the trigger and the picker.
- **Media_Renderer**: The client-side component that renders uploaded images inline within posts and comments.
- **Allowed_Types**: The set of accepted MIME/extension types for uploaded images: PNG, JPG/JPEG, GIF, WEBP.
- **Reaction_Type**: One of the five named reactions: `heart`, `haha`, `wow`, `sad`, `angry`.
- **User_Token**: The per-user identifier already used by the existing likes system (`user_<user_id>`), reused for reaction ownership.
- **Target**: A Post or Comment that can receive reactions or an attached image.

---

## Requirements

### Requirement 1: Image Upload for Posts

**User Story:** As a user, I want to attach an image to my post, so that I can share visual content alongside my text on the wall.

#### Acceptance Criteria

1. WHEN a user submits a new post with an image file attached, THE Image_Uploader SHALL accept the file, store it under `static/uploads/posts/`, and associate the resulting URL with the post record.
2. THE Image_Uploader SHALL accept only files whose extension is one of the Allowed_Types (png, jpg, jpeg, gif, webp).
3. IF a user submits a post with a file whose extension is not in Allowed_Types, THEN THE Image_Uploader SHALL return an error response with HTTP status 400 and a descriptive message.
4. THE Image_Uploader SHALL reject any uploaded file whose size exceeds 5 MB, returning HTTP status 400.
5. THE Image_Uploader SHALL generate a unique filename for each stored image to prevent collisions (using a UUID-based naming scheme consistent with the existing profile-photo pattern).
6. WHEN a post with an attached image is rendered in the feed, THE Media_Renderer SHALL display the image inline beneath the post text, constrained to the width of the post card.
7. WHEN a post has no attached image, THE Media_Renderer SHALL render the post without any image placeholder or empty space.
8. THE Wall SHALL allow a post to be submitted with text content only (image attachment is optional).

### Requirement 2: Image Upload for Comments

**User Story:** As a user, I want to attach an image to my comment or reply, so that I can respond visually to posts and other comments.

#### Acceptance Criteria

1. WHEN a user submits a new comment or reply with an image file attached, THE Image_Uploader SHALL accept the file, store it under `static/uploads/comments/`, and associate the resulting URL with the comment record.
2. THE Image_Uploader SHALL apply the same file-type and size validation rules to comment images as to post images (Allowed_Types, 5 MB maximum).
3. IF a user submits a comment with an invalid or oversized image, THEN THE Image_Uploader SHALL return an error response with HTTP status 400 and a descriptive message.
4. WHEN a comment with an attached image is rendered, THE Media_Renderer SHALL display the image inline beneath the comment text.
5. WHEN a comment has no attached image, THE Media_Renderer SHALL render the comment without any image placeholder or empty space.
6. THE Wall SHALL allow a comment to be submitted with text content only (image attachment is optional).

### Requirement 3: Image Storage and Serving

**User Story:** As a developer, I want uploaded images to be stored safely and served efficiently, so that the app remains secure and performant.

#### Acceptance Criteria

1. THE Image_Uploader SHALL sanitize all uploaded filenames using `werkzeug.utils.secure_filename` before saving to disk.
2. THE Image_Uploader SHALL store post images in `static/uploads/posts/` and comment images in `static/uploads/comments/`, creating those directories if they do not exist.
3. THE Wall SHALL serve uploaded post and comment images via the existing Flask static file mechanism so that stored URLs are directly accessible by the browser.
4. WHEN a post or comment is deleted, THE Wall SHALL delete the associated image file from disk if one exists.

### Requirement 4: Emoji Reactions on Posts

**User Story:** As a user, I want to react to posts using a Facebook-style hover picker, so that I can express a nuanced response without cluttering the post card.

#### Acceptance Criteria

1. THE Reaction_UI SHALL display a single Reaction_Trigger button per post. The button SHALL show the user's current active reaction emoji, or ❤️ by default if no reaction is active, along with the total reaction count across all types.
2. WHEN a user hovers over the Reaction_Trigger, THE Reaction_UI SHALL display the Reaction_Picker — a floating row of all five reaction emoji buttons (❤️ Heart, 😂 Haha, 😮 Wow, 😢 Sad, 😡 Angry) — positioned above the trigger.
3. THE Reaction_Picker SHALL remain visible while the cursor is over either the Reaction_Trigger or the Reaction_Picker itself, and SHALL dismiss when the cursor leaves both.
4. WHEN a user clicks a reaction in the Reaction_Picker for a Reaction_Type they have not yet applied to that post, THE Reaction_Store SHALL record that reaction, THE Reaction_Picker SHALL dismiss, and THE Reaction_Trigger SHALL update to show the selected emoji and the new total count.
5. WHEN a user clicks a reaction in the Reaction_Picker for a Reaction_Type they have already applied to that post, THE Reaction_Store SHALL remove that reaction, THE Reaction_Picker SHALL dismiss, and THE Reaction_Trigger SHALL revert to the default ❤️ and update the total count.
6. WHEN a user clicks a reaction in the Reaction_Picker while they already have a different Reaction_Type active on the same post, THE Reaction_Store SHALL replace the previous reaction with the new one, THE Reaction_Picker SHALL dismiss, and THE Reaction_Trigger SHALL update to show the new emoji.
7. WHEN a user clicks the Reaction_Trigger directly (without hovering to open the picker), THE Wall SHALL toggle the user's current active reaction off if one exists, or apply a ❤️ Heart reaction if none is active — matching the behaviour of a simple like button.
8. THE Reaction_Store SHALL enforce that each user (identified by User_Token) holds at most one active Reaction_Type per post at any given time.
9. WHEN the feed is loaded, THE Reaction_UI SHALL fetch and display the current total reaction count and the current user's active reaction (if any) for each post.
10. THE Wall SHALL remove the existing single heart "like" button from posts and replace it with the Reaction_Trigger.

### Requirement 5: Emoji Reactions on Comments

**User Story:** As a user, I want to react to comments using the same hover-picker interaction as posts, so that I can respond to individual comments expressively.

#### Acceptance Criteria

1. THE Reaction_UI SHALL display a single Reaction_Trigger button per comment, using the same hover-picker pattern as posts (Requirements 4.1–4.3).
2. WHEN a user interacts with the Reaction_Picker on a comment, THE Reaction_Store SHALL apply the same add/remove/replace logic as for post reactions (Requirement 4.4–4.8).
3. WHEN comments are loaded for a post, THE Reaction_UI SHALL fetch and display the current total reaction count and the current user's active reaction (if any) for each comment.
4. THE Reaction_Store SHALL enforce that each user holds at most one active Reaction_Type per comment at any given time.

### Requirement 6: Reaction Data Persistence

**User Story:** As a developer, I want reactions to be stored reliably in the database, so that counts are accurate and consistent across sessions.

#### Acceptance Criteria

1. THE Reaction_Store SHALL persist reactions in a dedicated `reactions` table with columns: `id`, `target_type` (values: `post` or `comment`), `target_id`, `user_token`, `reaction_type`, `created_at`.
2. THE Reaction_Store SHALL enforce a UNIQUE constraint on `(target_type, target_id, user_token)` so that each user can hold at most one reaction per Target.
3. WHEN a post or comment is deleted, THE Reaction_Store SHALL delete all associated reaction records via CASCADE.
4. THE Reaction_Store SHALL expose a GET endpoint that returns per-type counts and the requesting user's current reaction for a given Target.
5. THE Reaction_Store SHALL expose a POST endpoint that accepts a `reaction_type` and `user_token` and applies the add/remove/replace logic atomically.
6. THE Wall SHALL migrate the existing `likes` table data: existing likes SHALL be treated as `heart` reactions and inserted into the `reactions` table during database initialisation, after which the `likes` table MAY be retained for backward compatibility or removed.

### Requirement 7: Reaction Count Display and Accessibility

**User Story:** As a user, I want reaction counts to be clearly visible and accessible, so that I can understand community sentiment at a glance.

#### Acceptance Criteria

1. THE Reaction_Trigger SHALL display the total count of all reactions across all types. If the total is zero, no count number is shown.
2. THE Reaction_UI SHALL provide an `aria-label` on the Reaction_Trigger that includes the user's current reaction name and total count (e.g., "React — Heart, 3 total" or "React — 0").
3. Each button inside the Reaction_Picker SHALL have an `aria-label` with the Reaction_Type name (e.g., "Heart", "Haha").
4. THE Reaction_UI SHALL visually distinguish the user's currently active reaction in the Reaction_Picker (e.g., scaled up or highlighted) so the user can see which reaction they have applied.
5. WHEN a user's active reaction changes, THE Reaction_Trigger SHALL update its emoji and count immediately without a full page reload.
