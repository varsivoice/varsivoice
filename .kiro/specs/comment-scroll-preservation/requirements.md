# Requirements Document

## Introduction

This feature improves the comment interaction experience on the Freedom Wall feed page. Currently, submitting a new comment or saving an edited comment triggers a full `loadPosts()` call, which re-renders the entire feed and scrolls the page back to the top. The comment section also collapses after the reload. Users lose their place in the feed and must scroll back down to find the post they were interacting with.

The goal is to keep the user anchored to the post they just commented on: the comment section should remain open, the new or edited comment should be immediately visible, and the page scroll position should not jump.

## Glossary

- **Wall**: The main feed page (`/wall`) that displays all posts.
- **Post_Card**: An individual post article element rendered in the feed.
- **Comment_Section**: The collapsible `.comments-block` panel within a Post_Card that shows comments and the comment form.
- **Comment_Form**: The textarea and submit button inside a Comment_Section used to write a new top-level comment.
- **Reply_Form**: The inline textarea and submit button that appears under a top-level comment for writing a reply.
- **Comment_List**: The `.comments-tree` container inside a Comment_Section that renders all comments and replies for a post.
- **Action_Modal**: The overlay dialog (`#action-modal`) used for editing and deleting comments and posts.
- **Feed**: The `#feed` container that holds all Post_Cards.
- **Scroll_Position**: The vertical scroll offset of the browser viewport (`window.scrollY`).
- **Anchor_Post**: The Post_Card the user most recently submitted or edited a comment on.

---

## Requirements

### Requirement 1: Preserve Scroll Position After New Comment Submission

**User Story:** As a student posting a comment, I want the page to stay in place after I submit my comment, so that I do not lose my spot in the feed.

#### Acceptance Criteria

1. WHEN a user submits a new top-level comment via the Comment_Form, THE Wall SHALL not change the browser Scroll_Position.
2. WHEN a user submits a reply via the Reply_Form, THE Wall SHALL not change the browser Scroll_Position.
3. WHEN a new comment or reply is successfully saved, THE Wall SHALL refresh only the Comment_List of the Anchor_Post without re-rendering the entire Feed.

---

### Requirement 2: Keep Comment Section Open After Submission

**User Story:** As a student posting a comment, I want the comment section to stay open after I submit, so that I can immediately see my new comment without having to reopen the section.

#### Acceptance Criteria

1. WHEN a new top-level comment is successfully submitted, THE Comment_Section of the Anchor_Post SHALL remain visible (not collapse).
2. WHEN a reply is successfully submitted, THE Comment_Section of the Anchor_Post SHALL remain visible (not collapse).
3. WHEN the Comment_List is refreshed after a submission, THE Wall SHALL display the newly submitted comment or reply within the Comment_List.

---

### Requirement 3: Preserve Scroll Position After Comment Edit

**User Story:** As a student editing my comment, I want the page to stay in place after I save my edit, so that I do not lose my spot in the feed.

#### Acceptance Criteria

1. WHEN a user saves an edited comment via the Action_Modal, THE Wall SHALL not change the browser Scroll_Position.
2. WHEN a comment edit is successfully saved, THE Wall SHALL refresh only the Comment_List of the Anchor_Post without re-rendering the entire Feed.
3. WHEN the Comment_List is refreshed after an edit, THE Comment_Section of the Anchor_Post SHALL remain visible (not collapse).

---

### Requirement 4: Update Comment Count Without Full Feed Reload

**User Story:** As a student, I want the comment count badge on a post to reflect my new comment immediately, so that the feed stays accurate without a disruptive full reload.

#### Acceptance Criteria

1. WHEN a new comment or reply is successfully submitted, THE Wall SHALL increment the comment count displayed on the Anchor_Post's comment toggle button by 1.
2. WHEN a comment is successfully deleted, THE Wall SHALL decrement the comment count displayed on the Anchor_Post's comment toggle button by 1.
3. THE Wall SHALL update the comment count in-place on the Post_Card without re-rendering the entire Feed or changing the Scroll_Position.

---

### Requirement 5: Clear Comment Form After Successful Submission

**User Story:** As a student, I want the comment input to be cleared after I submit, so that I know my comment was sent and I can write another one if I want.

#### Acceptance Criteria

1. WHEN a new top-level comment is successfully submitted, THE Comment_Form textarea SHALL be cleared of its content.
2. WHEN a reply is successfully submitted, THE Reply_Form textarea SHALL be cleared and the Reply_Form SHALL be hidden.

---

### Requirement 6: Handle Comment Submission Errors Without Disruption

**User Story:** As a student, I want to see an error message in place if my comment fails to submit, so that I can correct it without losing what I typed.

#### Acceptance Criteria

1. IF a comment submission request fails, THEN THE Wall SHALL display an error message near the Comment_Form of the Anchor_Post.
2. IF a comment submission request fails, THEN THE Wall SHALL retain the user's typed text in the Comment_Form textarea.
3. IF a comment submission request fails, THEN THE Wall SHALL not change the browser Scroll_Position.
