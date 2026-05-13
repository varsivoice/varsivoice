# Implementation Plan: Admin Panel

## Overview

Implement a two-tier admin panel for The Varsitarian / Freedom Wall app using the existing Flask + SQLite + vanilla JS stack. The work proceeds in layers: database → backend API → frontend page → navigation injection → styles. Each task builds on the previous so there is no orphaned code.

## Tasks

- [x] 1. Database migration — add `role` column to `users`
  - In `init_db()` in `app.py`, add an idempotent `ALTER TABLE` migration inside the existing try/except migration block:
    ```python
    "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'"
    ```
  - Place it alongside the other `ALTER TABLE` statements so it is skipped silently if the column already exists.
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Update login API to expose `role` in response
  - In the `login()` route in `app.py`, update the `SELECT` query to also fetch `role`:
    ```sql
    SELECT id, email, password_hash, display_name, photo_url, created_at, role FROM users WHERE email = ?
    ```
  - Add `"role": row["role"]` to the `user` dict that is returned in the JSON response.
  - _Requirements: 1.5_

- [x] 3. Add shared admin helper and role constants to `app.py`
  - Define `ADMIN_ROLES = {"main_admin", "co_admin"}` and `MAIN_ADMIN_ROLE = "main_admin"` as module-level constants.
  - Implement the `get_requesting_user(user_id_raw)` helper that parses `user_id`, queries the DB, and returns `(row, None)` on success or `(None, error_response_tuple)` on failure — exactly as specified in the design.
  - This helper will be called by every admin endpoint added in tasks 4–10.
  - _Requirements: 7.1, 7.2, 7.5_

- [x] 4. Implement submission admin endpoints in `app.py`
  - [x] 4.1 `GET /api/admin/submissions` — list all submissions for admin review
    - Read `user_id` from query string; call `get_requesting_user`; return 403 if role not in `ADMIN_ROLES`.
    - Query all rows from `submissions` ordered by `created_at DESC`; include `content_preview` (first 200 chars of `content`).
    - Return JSON array matching the shape in the design.
    - _Requirements: 3.1, 3.2, 7.1, 7.4_

  - [x] 4.2 `PATCH /api/admin/submissions/<id>/status` — approve / reject / re-review a submission
    - Read `user_id` and `status` from JSON body; validate caller role (`ADMIN_ROLES`); validate `status` is one of `Pending Review`, `Approved`, `Rejected` (400 otherwise).
    - `UPDATE submissions SET status = ?, updated_at = datetime('now') WHERE id = ?`; return 404 if not found.
    - Return the updated submission object.
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 7.1, 7.4_

- [x] 5. Implement report admin endpoints in `app.py`
  - [x] 5.1 `GET /api/admin/reports` — list all reports grouped by target content
    - Read `user_id` from query string; validate caller role (`ADMIN_ROLES`).
    - Query all reports joined with reporter display name; group by `(target_type, target_id)` in Python.
    - For each group, attempt to fetch the target content preview; set `target_deleted: true` if the row no longer exists.
    - Return JSON array of groups as specified in the design.
    - _Requirements: 4.1, 4.2, 4.6, 7.1, 7.4_

  - [x] 5.2 `DELETE /api/admin/reports/<id>` — dismiss a single report
    - Read `user_id` from JSON body; validate caller role (`ADMIN_ROLES`).
    - `DELETE FROM reports WHERE id = ?`; return 404 if not found.
    - Return `{ "ok": true }`.
    - _Requirements: 4.3, 4.5, 7.1, 7.4_

  - [x] 5.3 `DELETE /api/admin/content` — delete reported content and all its reports
    - Read `user_id`, `target_type`, `target_id` from JSON body; validate caller role (`ADMIN_ROLES`).
    - Validate `target_type` is `"post"` or `"comment"`.
    - Delete the target row from `posts` or `comments`; then `DELETE FROM reports WHERE target_type = ? AND target_id = ?`.
    - Return `{ "ok": true }`.
    - _Requirements: 4.4, 4.5, 7.1, 7.4_

- [x] 6. Implement user management endpoints in `app.py`
  - [x] 6.1 `GET /api/admin/users` — list all user accounts
    - Read `user_id` from query string; validate caller role is `main_admin` (403 otherwise).
    - `SELECT id, display_name, email, role, created_at FROM users ORDER BY created_at ASC`.
    - Return JSON array.
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 7.1, 7.3_

  - [x] 6.2 `PATCH /api/admin/users/<id>/role` — grant or revoke `co_admin`
    - Read `user_id` and `role` from JSON body; validate caller is `main_admin`.
    - Validate `role` is `"co_admin"` or `"user"` (400 for any other value, including `"main_admin"`).
    - Return 400 if caller is targeting themselves; return 404 if target user not found.
    - `UPDATE users SET role = ? WHERE id = ?`; return updated user object.
    - _Requirements: 5.3, 5.4, 5.6, 5.7, 5.8, 7.1, 7.3_

  - [x] 6.3 `POST /api/admin/transfer-ownership` — atomically transfer `main_admin` role
    - Read `user_id` and `target_user_id` from JSON body; validate caller is `main_admin`.
    - Return 400 if `target_user_id == user_id`; return 404 if target not found.
    - Execute both `UPDATE` statements inside a single transaction (BEGIN / COMMIT) so no intermediate state exists.
    - Return `{ "ok": true, "new_main_admin_id": target_user_id }`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.3_

- [x] 7. Add `/admin` page route in `app.py`
  - Add `@app.route("/admin")` that returns `render_template("admin.html")`.
  - No server-side auth on the route itself (matches existing pattern; enforcement is on the API endpoints).
  - _Requirements: 2.3, 2.5_

- [x] 8. Checkpoint — verify backend before building frontend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create `templates/admin.html`
  - Copy the masthead structure from `templates/wall.html` (hamburger, brand, nav, avatar, notification bell) so the admin page looks consistent.
  - Add a tab bar with three tabs: **Submissions**, **Reports**, **Users** (Users tab hidden via JS for co-admins).
  - Add three `<section>` content areas (one per tab), each initially hidden except the first.
  - Include the `#action-modal` markup (same as `wall.html`) for the confirmation modal used by Delete Content and Transfer Ownership.
  - Link `static/js/admin.js` at the bottom of `<body>`.
  - _Requirements: 2.5, 3.2, 4.2, 5.2_

- [x] 10. Create `static/js/admin.js`
  - [x] 10.1 Auth guard and session bootstrap
    - On page load, read `vw_user` from `localStorage`; redirect to `/` if absent.
    - If `user.role` is not `main_admin` or `co_admin`, replace `document.body` with an "Access denied." message and stop.
    - Hide the Users tab and its content section if `user.role === 'co_admin'`.
    - _Requirements: 2.3, 2.4, 5.5_

  - [x] 10.2 Tab switching logic
    - Wire click handlers on the three tab buttons to show/hide the corresponding content sections.
    - Mark the active tab with an `active` CSS class.
    - _Requirements: 2.5_

  - [x] 10.3 Submissions tab — load and render
    - On tab activation (and on page load for the default tab), call `GET /api/admin/submissions?user_id=<id>`.
    - Render each submission as a card: title, author, category, status badge (yellow/green/red), date, content preview.
    - Render three action buttons per card: **Approve**, **Reject**, **Set Pending**; disable the button matching the current status.
    - _Requirements: 3.1, 3.2_

  - [x] 10.4 Submissions tab — status update actions
    - On button click, call `PATCH /api/admin/submissions/<id>/status` with the new status.
    - On success, update the card's status badge and button states in-place (no full reload).
    - On error, display the error message near the card.
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 10.5 Reports tab — load and render
    - On tab activation, call `GET /api/admin/reports?user_id=<id>`.
    - Render each group: content preview (or "Content already removed"), then a list of report rows (reporter name, reason, date).
    - Render two action buttons per group: **Dismiss All Reports** and **Delete Content**.
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 10.6 Reports tab — dismiss and delete actions
    - **Dismiss All Reports**: call `DELETE /api/admin/reports/<id>` for each report in the group; on success, remove the group from the DOM.
    - **Delete Content**: open the confirmation modal; on confirm, call `DELETE /api/admin/content`; on success, remove the group from the DOM.
    - On error, display the error message near the group.
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 10.7 Users tab — load and render (main_admin only)
    - On tab activation, call `GET /api/admin/users?user_id=<id>`.
    - Render a table: display name, email, role badge (grey/blue/gold), joined date, action button.
    - Action button logic per row:
      - `user` → "Make Co-Admin"
      - `co_admin` → "Remove Co-Admin"
      - `main_admin` → "Transfer Ownership"
      - Caller's own row → no button
    - _Requirements: 5.1, 5.2_

  - [x] 10.8 Users tab — role change and transfer actions
    - **Make / Remove Co-Admin**: call `PATCH /api/admin/users/<id>/role`; on success, update the row's role badge and action button in-place.
    - **Transfer Ownership**: open the confirmation modal; on confirm, call `POST /api/admin/transfer-ownership`; on success, reload the users list to reflect the new roles.
    - On error, display the error message near the row.
    - _Requirements: 5.3, 5.4, 5.8, 6.1, 6.2, 6.3, 6.4_

- [x] 11. Inject "Admin Panel" link into hamburger menus
  - In `static/js/wall.js`, after the hamburger menu is set up, add:
    ```js
    if (currentUser && (currentUser.role === 'main_admin' || currentUser.role === 'co_admin')) {
      const adminItem = document.createElement('a');
      adminItem.href = '/admin';
      adminItem.className = 'hamburger-menu-item';
      adminItem.textContent = '🛡️ Admin Panel';
      hamburgerMenu.insertBefore(adminItem, hamburgerMenu.firstChild);
    }
    ```
  - Apply the same injection to `static/js/freedom_wall.js`, `static/js/writers.js`, and `static/js/profile.js` in their respective hamburger setup sections.
  - The link must appear only when `role` is `main_admin` or `co_admin`; regular users must not see it.
  - _Requirements: 2.1, 2.2, 2.6_

- [x] 12. Add admin panel CSS to `static/css/style.css`
  - Add styles for:
    - `.admin-tabs` tab bar and `.admin-tab` / `.admin-tab.active` buttons
    - `.admin-section` content areas (hidden by default; `.admin-section.active` visible)
    - `.submission-card` with status badge variants: `.badge-pending` (yellow), `.badge-approved` (green), `.badge-rejected` (red)
    - `.report-group` and `.report-row` for the grouped reports layout
    - `.users-table` with `.role-badge`, `.role-badge--user` (grey), `.role-badge--co-admin` (blue), `.role-badge--main-admin` (gold)
    - Admin action buttons consistent with existing `.btn-sm` sizing
  - Follow the existing CSS variable conventions (`--color-*`, `--radius-*`) already in `style.css`.
  - _Requirements: 2.5_

- [x] 13. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Add mobile responsiveness CSS to `static/css/style.css`
  - Add responsive breakpoint at `max-width: 900px` for mobile/tablet layout.
  - Hide desktop sidebar (`.admin-sidebar { display: none !important; }`).
  - Show mobile menu button (`.admin-mobile-sidebar-toggle { display: block; }`).
  - Update `.admin-layout` to full-width grid: `grid-template-columns: 1fr !important;`.
  - Add styles for `.admin-mobile-sidebar-toggle` button: 24×24px, transparent background, hover state with light red.
  - Add styles for `.admin-mobile-drawer`: 280px fixed width, left side, `translateX(-100%)` hidden, `translateX(0)` visible, smooth 0.3s transition.
  - Add styles for `.admin-mobile-drawer-overlay`: fixed full viewport, `rgba(0, 0, 0, 0.5)` background, pointer events managed.
  - Add styles for `.admin-mobile-drawer-header`, `.admin-mobile-drawer-close`, `.admin-mobile-nav`, `.admin-mobile-nav-item`, `.admin-mobile-drawer-footer`.
  - Ensure drawer and overlay are hidden by default with `.hidden` class.
  - _Design: Mobile Responsiveness section_

- [ ] 15. Update `templates/admin.html` to include mobile drawer markup
  - Add mobile menu button below the masthead: `<div class="admin-mobile-sidebar-toggle">` with toggle button.
  - Add mobile drawer structure: `<div id="admin-mobile-drawer" class="admin-mobile-drawer hidden">` with header, nav items, and footer.
  - Add mobile overlay: `<div id="admin-mobile-drawer-overlay" class="admin-mobile-drawer-overlay hidden">`.
  - Drawer nav items: Submissions, Reports, Users (if main_admin), Admins.
  - Include close button (✕) in drawer header.
  - Include logout button in drawer footer.
  - Ensure drawer is positioned after masthead but before main content.
  - _Design: Mobile Responsiveness section_

- [ ] 16. Implement mobile menu toggle logic in `static/js/admin.js`
  - Add event listener to `.admin-sidebar-toggle-btn` to toggle drawer visibility.
  - When menu button is clicked:
    - If drawer is hidden: show drawer, show overlay, set `aria-expanded="true"`, prevent body scroll.
    - If drawer is visible: hide drawer, hide overlay, set `aria-expanded="false"`, restore body scroll.
  - Add event listener to `.admin-mobile-drawer-overlay` to close drawer on overlay click.
  - Add event listener to `.admin-mobile-drawer-close` button to close drawer.
  - Add ESC key listener to close drawer when ESC is pressed.
  - _Design: Mobile Responsiveness section_

- [ ] 17. Implement mobile menu item selection in `static/js/admin.js`
  - Add event listeners to all `.admin-mobile-nav-item` buttons.
  - When a menu item is clicked:
    - Extract `data-tab` attribute to determine which tab to activate.
    - Update active tab (same logic as desktop tab switching).
    - Hide drawer, hide overlay, set `aria-expanded="false"`, restore body scroll.
    - Load content for selected tab (call appropriate API endpoint).
  - Ensure active menu item is highlighted with red background and text color.
  - _Design: Mobile Responsiveness section_

- [ ] 18. Implement mobile logout button in `static/js/admin.js`
  - Add event listener to `#admin-mobile-logout` button.
  - On click: clear `localStorage`, redirect to `/`.
  - _Design: Mobile Responsiveness section_

- [ ] 19. Update desktop layout to use sidebar + main content flex layout
  - Ensure `.admin-layout` uses `display: flex` on desktop (≥901px).
  - Sidebar (`.admin-sidebar`) should be visible on desktop.
  - Main content area should flex to fill remaining space.
  - Ensure tab bar and content sections are properly positioned in main content area.
  - _Design: Mobile Responsiveness section_

- [ ] 20. Test mobile responsiveness across breakpoints
  - Test at 900px and below: verify three-dot menu appears, sidebar hidden, drawer slides in/out smoothly.
  - Test at 901px and above: verify sidebar visible, three-dot menu hidden, tab bar visible.
  - Test drawer open/close: verify overlay appears, body scroll prevented, drawer slides smoothly.
  - Test menu item selection: verify tab switches, drawer closes, content loads.
  - Test ESC key: verify drawer closes.
  - Test overlay click: verify drawer closes.
  - Verify all content is accessible on mobile (no features hidden or simplified).
  - _Design: Mobile Responsiveness section_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design has no Correctness Properties requiring property-based tests; all properties are example-based integration/unit tests and are not included as coding tasks per the workflow rules
- The `role` field must be present in `localStorage` (written by `login.js` after a successful login) for the hamburger injection and admin auth guard to work — task 2 (login API change) is a prerequisite for tasks 10 and 11
- Mobile responsiveness tasks (14-20) build on the existing admin panel implementation and add responsive design for mobile/tablet devices
