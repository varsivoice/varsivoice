# Design Document

## Overview

The Admin Panel is a dedicated page at `/admin` that provides content moderation and role management for The Varsitarian / Freedom Wall application. It follows the existing Flask + SQLite + vanilla JS architecture — no new frameworks or libraries are introduced. The role model mirrors a Facebook group admin structure: any existing user account can be promoted to `co_admin` or `main_admin`, and the Main Admin can transfer ownership to another user.

---

## Architecture

### Technology Stack (unchanged)
- **Backend**: Python / Flask, SQLite via `sqlite3`, `werkzeug`
- **Frontend**: Vanilla JS, Jinja2 HTML templates, existing `style.css`
- **Auth**: Client-side session stored in `localStorage` (same pattern as existing pages)

### New Files
| File | Purpose |
|---|---|
| `templates/admin.html` | Admin Panel page template |
| `static/js/admin.js` | Admin Panel client-side logic |

### Modified Files
| File | Change |
|---|---|
| `app.py` | DB migration for `role` column; new `/admin` page route; new admin API endpoints |
| `templates/wall.html` | Inject "Admin Panel" menu item when role is `main_admin` or `co_admin` |
| `templates/freedom_wall.html` | Same hamburger menu injection |
| `templates/writers.html` | Same hamburger menu injection |
| `templates/profile.html` | Same hamburger menu injection |

---

## Database Changes

### Migration: Add `role` column to `users`

Added to `init_db()` in `app.py` as an idempotent `ALTER TABLE` (same pattern as existing migrations):

```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
```

Valid values: `'user'`, `'co_admin'`, `'main_admin'`.

No separate admin account table is needed — any existing user row can hold any role.

### Constraint: Single Main Admin

Enforced at the application layer (not a DB constraint) because SQLite partial unique indexes are less portable. The role transfer endpoint uses a single transaction to swap roles atomically.

---

## Backend Design

### Helper: `get_requesting_user(user_id)`

A shared helper that fetches a user row and returns `(user_row, error_response)`. Used by all admin endpoints to validate the caller's role without repeating boilerplate.

```python
def get_requesting_user(user_id_raw):
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        return None, (jsonify({"error": "Valid user_id is required."}), 400)
    conn = get_conn()
    row = conn.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return None, (jsonify({"error": "User not found."}), 404)
    return row, None
```

### Page Route

```
GET /admin
```
Returns `templates/admin.html`. The page itself performs a client-side role check on load (same pattern as other pages that read `localStorage`). The server-side route does not enforce auth — enforcement is on the API endpoints. This matches the existing pattern where `/wall`, `/writers`, etc. are open routes that redirect via JS if not logged in.

### Admin API Endpoints

All admin endpoints read `user_id` from the request body or query string and validate the caller's role before acting.

#### Role check helper (used in every admin endpoint)

```python
ADMIN_ROLES = {"main_admin", "co_admin"}
MAIN_ADMIN_ROLE = "main_admin"
```

---

#### `GET /api/admin/submissions`

Returns all submissions for admin review (all statuses, not just pending).

**Auth**: `main_admin` or `co_admin`

**Query params**: `user_id` (caller)

**Response**:
```json
[
  {
    "id": 1,
    "title": "...",
    "author_name": "...",
    "category": "...",
    "status": "Pending Review",
    "created_at": "...",
    "updated_at": null,
    "content_preview": "first 200 chars..."
  }
]
```

---

#### `PATCH /api/admin/submissions/<id>/status`

Updates a submission's status. Accepts any transition between `Pending Review`, `Approved`, and `Rejected`.

**Auth**: `main_admin` or `co_admin`

**Request body**:
```json
{ "user_id": 5, "status": "Approved" }
```

**Validation**:
- `status` must be one of `Pending Review`, `Approved`, `Rejected`
- Submission must exist (404 if not)

**Response**: Updated submission object.

---

#### `GET /api/admin/reports`

Returns all reports grouped by target content item.

**Auth**: `main_admin` or `co_admin`

**Query params**: `user_id` (caller)

**Response**:
```json
[
  {
    "target_type": "post",
    "target_id": 12,
    "target_content_preview": "...",
    "target_deleted": false,
    "reports": [
      {
        "id": 3,
        "reporter_name": "...",
        "reason": "spam",
        "created_at": "..."
      }
    ]
  }
]
```

---

#### `DELETE /api/admin/reports/<id>`

Dismisses a single report (deletes the report record, keeps the content).

**Auth**: `main_admin` or `co_admin`

**Request body**: `{ "user_id": 5 }`

**Response**: `{ "ok": true }`

---

#### `DELETE /api/admin/content`

Deletes reported content (post or comment) and all associated reports for that target.

**Auth**: `main_admin` or `co_admin`

**Request body**:
```json
{ "user_id": 5, "target_type": "post", "target_id": 12 }
```

**Response**: `{ "ok": true }`

---

#### `GET /api/admin/users`

Returns all user accounts for the role management section.

**Auth**: `main_admin` only

**Query params**: `user_id` (caller)

**Response**:
```json
[
  {
    "id": 1,
    "display_name": "...",
    "email": "...",
    "role": "user",
    "created_at": "..."
  }
]
```

---

#### `PATCH /api/admin/users/<id>/role`

Grants or revokes `co_admin` on a target user.

**Auth**: `main_admin` only

**Request body**:
```json
{ "user_id": 5, "role": "co_admin" }
```

**Validation**:
- `role` must be `"co_admin"` or `"user"` (this endpoint cannot set `main_admin`)
- Caller cannot target themselves (400)
- Target user must exist (404)

**Response**: Updated user object.

---

#### `POST /api/admin/transfer-ownership`

Transfers the `main_admin` role to another user. The current Main Admin becomes `co_admin`. Executed as a single atomic transaction.

**Auth**: `main_admin` only

**Request body**:
```json
{ "user_id": 5, "target_user_id": 9 }
```

**Validation**:
- `target_user_id` must differ from `user_id` (400 if same)
- Target user must exist (404)
- Caller must be `main_admin` (403 if not)

**Atomic transaction**:
```sql
BEGIN;
UPDATE users SET role = 'co_admin' WHERE id = :caller_id;
UPDATE users SET role = 'main_admin' WHERE id = :target_id;
COMMIT;
```

**Response**: `{ "ok": true, "new_main_admin_id": 9 }`

---

## Frontend Design

### Auth Guard (`admin.js` on page load)

```js
const user = JSON.parse(localStorage.getItem('vw_user') || 'null');
if (!user) { location.href = '/'; }
if (user.role !== 'main_admin' && user.role !== 'co_admin') {
  document.body.innerHTML = '<p class="error-msg">Access denied.</p>';
}
```

The `role` field is stored in `localStorage` when the login API returns it (requires the login response to include `role` — see backend change to `/api/auth/login`).

### Login API Change

The existing `/api/auth/login` response must include `role`:

```python
user = {
    "id": row["id"],
    "email": row["email"],
    "display_name": row["display_name"],
    "photo_url": row["photo_url"],
    "created_at": row["created_at"],
    "role": row["role"],   # ← added
}
```

### Hamburger Menu Injection (all existing pages)

Each page's JS already reads `localStorage` for the current user. A small addition injects the Admin Panel link when `user.role` is `main_admin` or `co_admin`:

```js
if (user && (user.role === 'main_admin' || user.role === 'co_admin')) {
  const adminItem = document.createElement('a');
  adminItem.href = '/admin';
  adminItem.className = 'hamburger-menu-item';
  adminItem.textContent = '🛡️ Admin Panel';
  hamburgerMenu.insertBefore(adminItem, hamburgerMenu.firstChild);
}
```

This is added to the existing JS files (`wall.js`, `freedom_wall.js`, `writers.js`, `profile.js`) in the section that already handles hamburger menu setup.

### Admin Page Layout (`admin.html`)

The page uses the same masthead and CSS classes as existing pages. It has three tab sections, conditionally shown based on role.

#### Desktop Layout

```
┌─────────────────────────────────────────────┐
│  Masthead (same as wall.html)               │
├─────────────────────────────────────────────┤
│  [Sidebar]  │  Tab bar: [Submissions] [Reports] [Users*]  │
│  - Submissions  │  (* only visible to main_admin)    │
│  - Reports      │  Active tab content                 │
│  - Users*       │                                     │
│  - Admins       │                                     │
└─────────────────────────────────────────────┘
```

#### Mobile Layout

On mobile devices (max-width: 900px), the layout transforms to a responsive design:

```
┌─────────────────────────────────────────────┐
│  Masthead (same as wall.html)               │
├─────────────────────────────────────────────┤
│  [⋮] (three-dot menu button)                │
│  Positioned below left side of banner       │
├─────────────────────────────────────────────┤
│  Active tab content (full width)            │
│  Default: Submissions tab                   │
└─────────────────────────────────────────────┘
```

**Mobile Menu Behavior**:
- The three-dot menu button (kebab menu) is positioned below the left side of the banner
- Default view shows Submissions tab content
- When the three-dot menu is clicked, it expands to show all sidebar options in a drawer
- The drawer slides in from the left with an overlay
- Menu items: Submissions, Reports, Users (if main_admin), Admins
- Clicking a menu item navigates to that tab and closes the drawer
- The same content is displayed on both mobile and desktop — only the navigation changes

#### Submissions Tab

- Lists all submissions (all statuses) in a card list
- Each card shows: title, author, category, status badge, date, content preview
- Status badge is color-coded: yellow (Pending), green (Approved), red (Rejected)
- Three action buttons per card: **Approve**, **Reject**, **Set Pending**
  - The button matching the current status is disabled
- On action: calls `PATCH /api/admin/submissions/<id>/status`, updates the card in-place

#### Reports Tab

- Groups reports by target content item
- Each group shows the content preview (or "Content already removed" if deleted)
- Each report row shows: reporter name, reason, date
- Two action buttons per group: **Dismiss All Reports** (keeps content), **Delete Content** (removes content + all reports)
- On action: calls the appropriate DELETE endpoint, removes the group from the DOM

#### Users Tab (Main Admin only)

- Lists all users in a table: name, email, role badge, joined date, action button
- Role badge: grey (user), blue (co_admin), gold (main_admin)
- Action buttons:
  - For `user`: "Make Co-Admin" → calls `PATCH /api/admin/users/<id>/role` with `role: "co_admin"`
  - For `co_admin`: "Remove Co-Admin" → calls `PATCH /api/admin/users/<id>/role` with `role: "user"`
  - For `main_admin`: "Transfer Ownership" → opens a confirmation modal, then calls `POST /api/admin/transfer-ownership`
  - The caller's own row shows no action button

#### Confirmation Modal

Reuses the existing `.action-modal` pattern from `wall.html` for destructive actions (Delete Content, Transfer Ownership).

---

## Mobile Responsiveness

### Responsive Breakpoints

| Breakpoint | Device Type | Layout |
|---|---|---|
| ≥ 901px | Desktop | Sidebar + Main content (flex layout) |
| ≤ 900px | Tablet/Mobile | Full-width content with three-dot menu |

### Mobile Menu (Three-Dot/Kebab Menu)

**Placement**: Below the left side of the banner, positioned at `0.75rem` padding from the left edge

**Button Styling**:
- Icon: Three vertical dots (kebab menu icon)
- Size: 24×24px
- Background: Transparent
- Hover state: Light red background (`rgba(163, 29, 29, 0.1)`)
- Accessibility: `aria-label="Toggle sidebar menu"`, `aria-expanded` attribute

**HTML Structure**:
```html
<div class="admin-mobile-sidebar-toggle">
  <button type="button" id="admin-sidebar-toggle-btn" 
          class="admin-sidebar-toggle-btn" 
          aria-label="Toggle sidebar menu" 
          aria-expanded="false">
    <!-- Three-dot menu icon SVG -->
  </button>
</div>
```

### Mobile Drawer (Expanded Menu)

**Behavior**:
- Slides in from the left when the three-dot menu is clicked
- Covers the full viewport height
- Includes an overlay behind the drawer (semi-transparent dark background)
- Can be closed by:
  - Clicking the close button (✕) in the drawer header
  - Clicking the overlay
  - Selecting a menu item

**Drawer Structure**:
```html
<div id="admin-mobile-drawer" class="admin-mobile-drawer hidden" 
     role="dialog" aria-label="Admin menu">
  <div class="admin-mobile-drawer-header">
    <span class="admin-mobile-drawer-title">🛡️ Admin Panel</span>
    <button type="button" id="admin-mobile-drawer-close" 
            class="admin-mobile-drawer-close" 
            aria-label="Close menu">✕</button>
  </div>
  <nav class="admin-mobile-nav" role="navigation" aria-label="Admin sections">
    <button type="button" class="admin-mobile-nav-item active" 
            id="mobile-nav-submissions" data-tab="tab-submissions">
      <span class="admin-mobile-nav-icon">📝</span>
      <span>Submissions</span>
    </button>
    <button type="button" class="admin-mobile-nav-item" 
            id="mobile-nav-reports" data-tab="tab-reports">
      <span class="admin-mobile-nav-icon">🚩</span>
      <span>Reports</span>
    </button>
    <button type="button" class="admin-mobile-nav-item" 
            id="mobile-nav-users" data-tab="tab-users">
      <span class="admin-mobile-nav-icon">👥</span>
      <span>Users</span>
    </button>
    <button type="button" class="admin-mobile-nav-item" 
            id="mobile-nav-admins" data-tab="tab-admins">
      <span class="admin-mobile-nav-icon">🛡️</span>
      <span>Admins</span>
    </button>
  </nav>
  <div class="admin-mobile-drawer-footer">
    <button type="button" id="admin-mobile-logout" class="admin-mobile-logout-btn">
      <svg><!-- logout icon --></svg>
      Sign out
    </button>
  </div>
</div>
<div id="admin-mobile-drawer-overlay" class="admin-mobile-drawer-overlay hidden"></div>
```

**Drawer Styling**:
- Width: 280px (fixed)
- Position: Fixed, left side of viewport
- Z-index: High (above content)
- Background: Light mode: `rgba(255, 255, 255, 0.82)` with backdrop blur; Dark mode: `rgba(30, 28, 27, 0.82)`
- Transform: `translateX(-100%)` when hidden, `translateX(0)` when visible
- Transition: Smooth slide animation (0.3s)
- Box shadow: `8px 0 32px rgba(0,0,0,0.18)` when open

**Overlay Styling**:
- Position: Fixed, covers entire viewport
- Background: `rgba(0, 0, 0, 0.5)` when visible
- Pointer events: Auto when visible, none when hidden
- Z-index: Below drawer, above content

### Mobile Content Display

**Default State**:
- Submissions tab is displayed by default
- Desktop sidebar is hidden (`display: none`)
- Three-dot menu button is visible

**Tab Switching**:
- Clicking a menu item in the drawer updates the active tab
- The drawer closes automatically after selection
- Content updates in-place without page reload
- Active menu item is highlighted with red background and text color

**Content Visibility**:
- Only one tab section is visible at a time
- Tab sections use `display: none` / `display: block` for visibility
- All content is the same as desktop — no content is hidden or simplified

### CSS Media Query

```css
@media (max-width: 900px) {
  /* Show mobile menu button */
  .admin-mobile-sidebar-toggle {
    display: block;
    padding: 0.75rem 0.625rem;
  }

  /* Hide desktop sidebar */
  .admin-sidebar {
    display: none !important;
  }

  /* Full-width layout */
  .admin-layout {
    display: grid;
    grid-template-columns: 1fr !important;
  }

  /* Show drawer when not hidden */
  .admin-mobile-drawer:not(.hidden) {
    transform: translateX(0);
    box-shadow: 8px 0 32px rgba(0,0,0,0.18);
  }

  /* Show overlay when not hidden */
  .admin-mobile-drawer-overlay:not(.hidden) {
    background: rgba(0,0,0,0.5);
    pointer-events: auto;
  }
}
```

### JavaScript Behavior

**Menu Toggle**:
```javascript
// When three-dot menu is clicked
if (drawer is hidden) {
  - Show drawer
  - Show overlay
  - Set aria-expanded="true"
  - Prevent body scroll
} else {
  - Hide drawer
  - Hide overlay
  - Set aria-expanded="false"
  - Restore body scroll
}
```

**Menu Item Selection**:
```javascript
// When a menu item is clicked
- Update active tab
- Hide drawer
- Hide overlay
- Set aria-expanded="false"
- Restore body scroll
- Load content for selected tab
```

**Overlay Click**:
```javascript
// When overlay is clicked
- Hide drawer
- Hide overlay
- Set aria-expanded="false"
- Restore body scroll
```

**Close Button Click**:
```javascript
// When close button (✕) is clicked
- Hide drawer
- Hide overlay
- Set aria-expanded="false"
- Restore body scroll
```

### Accessibility

- Menu button has `aria-label="Toggle sidebar menu"`
- Menu button has `aria-expanded` attribute (true/false)
- Drawer has `role="dialog"` and `aria-label="Admin menu"`
- Navigation has `role="navigation"` and `aria-label="Admin sections"`
- Menu items have `role="menuitem"` (implicit via button)
- Overlay is not focusable (no tab index)
- Focus is managed: when drawer opens, focus moves to close button; when drawer closes, focus returns to menu button
- Keyboard support: ESC key closes the drawer

### Content Parity

**Desktop and Mobile Display the Same Content**:
- Submissions tab: Same card layout, same action buttons, same sorting/filtering
- Reports tab: Same grouped layout, same action buttons, same filtering/sorting
- Users tab: Same table layout (or card layout on mobile), same action buttons
- Admins tab: Same list layout, same action buttons

**No Content Simplification**:
- All features available on mobile
- All action buttons present
- All filtering and sorting options available
- Modals and dialogs work the same way

---

## Correctness Properties

### 1. Role Invariant: Exactly One Main Admin

At all times, the `users` table contains exactly one row where `role = 'main_admin'`. This holds after:
- Initial DB setup (seeded via a one-time script or first-run check)
- Role transfer (atomic transaction swaps both rows)
- Co-admin grant/revoke (never touches `main_admin` rows)

**Test type**: Example-based integration test — verify count before and after transfer.

### 2. Role Transfer Atomicity

After `POST /api/admin/transfer-ownership`, the former Main Admin's role is `co_admin` and the target user's role is `main_admin`. No intermediate state with 0 or 2 main admins is observable.

**Test type**: Example-based unit test — mock DB, verify both UPDATE statements execute in one transaction.

### 3. Submission Status Re-review (Non-permanence)

A Submission with `status = 'Rejected'` can be transitioned to `Pending Review` or `Approved`. A Submission with `status = 'Approved'` can be transitioned to `Pending Review` or `Rejected`. The status field is not a one-way ratchet.

**Test type**: Example-based — test each valid transition from each starting state.

### 4. Role Hierarchy Enforcement

For every admin API endpoint, a request from a `Regular_User` returns 403. For role management and transfer endpoints, a request from a `Co_Admin` returns 403.

**Test type**: Example-based — one test per endpoint per unauthorized role.

### 5. Content Deletion Cascade

When `DELETE /api/admin/content` is called for a post, all reports targeting that post are also deleted. When called for a comment, all reports targeting that comment are also deleted.

**Test type**: Example-based — verify `reports` table count after deletion.

---

## Error Handling

| Condition | HTTP Status | Message |
|---|---|---|
| Caller not found | 404 | "User not found." |
| Caller is Regular_User on admin endpoint | 403 | "Admin access required." |
| Caller is Co_Admin on main-admin-only endpoint | 403 | "Main admin access required." |
| Target resource not found | 404 | "Not found." |
| Invalid status value | 400 | "Invalid status." |
| Self-targeting on role change | 400 | "Cannot change your own role." |
| Self-targeting on transfer | 400 | "Cannot transfer ownership to yourself." |
| Invalid role value | 400 | "Invalid role." |

---

## Security Considerations

- All role checks are server-side. The client-side role check in `admin.js` is UX-only (prevents the page from rendering for non-admins) but is not a security boundary.
- The `user_id` in every request is validated against the DB — it cannot be spoofed to gain elevated access because the role is read from the DB row, not from the request body.
- The role transfer transaction uses SQLite's WAL mode (already enabled via `PRAGMA journal_mode=WAL`) to ensure atomicity.
- No new dependencies are introduced.
