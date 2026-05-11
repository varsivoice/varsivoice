# Requirements Document

## Introduction

This feature adds an Admin Panel to The Varsitarian / Freedom Wall web application. It introduces a two-tier administrative role system — a single Main Admin (owner) and any number of Co-admins — and provides a dedicated page at `/admin` for content moderation (writeup approvals and report reviews) and role management. Any existing user account can be promoted to admin status, exactly like a Facebook group admin model. The feature integrates with the existing Flask/SQLite backend and vanilla JS frontend without replacing any existing functionality.

## Glossary

- **Admin_Panel**: The dedicated web page at `/admin`, accessible only to users with the `main_admin` or `co_admin` role.
- **Main_Admin**: The single privileged user account with full administrative access, including the ability to grant/revoke the `co_admin` role and transfer the `main_admin` role to another user. Any existing user account can hold this role.
- **Co_Admin**: A user account that has been granted moderation access by the Main_Admin. Co_Admins can approve or reject writeup submissions and act on content reports, but cannot manage roles.
- **Regular_User**: Any authenticated user who does not hold the `main_admin` or `co_admin` role.
- **Role**: A permission level assigned to a user account. Valid roles are `main_admin`, `co_admin`, and `user` (default).
- **Submission**: A writeup entry in the `submissions` table with a `status` field (`Pending Review`, `Approved`, or `Rejected`).
- **Report**: An entry in the `reports` table representing a user-submitted complaint about a post or comment.
- **Role_Transfer**: The act of the Main_Admin assigning the `main_admin` role to another user, which simultaneously demotes the current Main_Admin to `co_admin`.
- **Hamburger_Menu**: The navigation dropdown accessible via the hamburger button in the site's masthead header.
- **System**: The Varsitarian / Freedom Wall web application (Flask backend + vanilla JS frontend).

---

## Requirements

### Requirement 1: Role Storage and Assignment

**User Story:** As a system operator, I want user roles to be stored persistently in the database and assignable to any existing user account, so that admin privileges survive server restarts and any user can be promoted without creating a separate admin account.

#### Acceptance Criteria

1. THE System SHALL store a `role` column on the `users` table with a default value of `user`.
2. THE System SHALL support exactly three valid role values: `user`, `co_admin`, and `main_admin`.
3. WHEN a new user account is created, THE System SHALL assign the `user` role by default.
4. THE System SHALL ensure that exactly one account holds the `main_admin` role at any given time.
5. WHEN the login API returns a user object, THE System SHALL include the `role` field in the response payload.
6. THE System SHALL allow any existing `user` or `co_admin` account to be promoted to `main_admin` or `co_admin` without requiring a separate admin account to be created.

---

### Requirement 2: Admin Panel Navigation Access

**User Story:** As an admin or co-admin, I want to see an "Admin Panel" option in the hamburger menu that takes me to a dedicated page at `/admin`, so that I can navigate to the admin interface without exposing it to regular users.

#### Acceptance Criteria

1. WHEN a user with the `main_admin` or `co_admin` role opens the Hamburger_Menu, THE System SHALL display an "Admin Panel" navigation item linking to `/admin`.
2. WHEN a user with the `user` role opens the Hamburger_Menu, THE System SHALL not display the "Admin Panel" navigation item.
3. WHEN an unauthenticated request is made to the `/admin` route, THE System SHALL redirect the requester to the login page.
4. WHEN a Regular_User navigates directly to `/admin`, THE System SHALL return a 403 Forbidden response.
5. THE System SHALL serve the Admin_Panel as a dedicated HTML page at the `/admin` route, not as a modal or overlay on existing pages.
6. THE System SHALL determine Admin_Panel visibility using the `role` value returned by the login API and stored in the client session.

---

### Requirement 3: Writeup Approval Workflow

**User Story:** As an admin or co-admin, I want to review writeup submissions and change their status (including re-reviewing previously rejected ones), so that content decisions are not permanent and can be corrected.

#### Acceptance Criteria

1. WHEN an admin or co-admin opens the Admin_Panel, THE System SHALL display all Submissions with `status = 'Pending Review'` in the writeup approvals section.
2. THE System SHALL display the following fields for each Submission in the approvals section: title, author name, category, submission date, current status, and a content preview.
3. WHEN an admin or co-admin approves a Submission, THE System SHALL update the Submission's `status` to `Approved` and record the `updated_at` timestamp.
4. WHEN an admin or co-admin rejects a Submission, THE System SHALL update the Submission's `status` to `Rejected` and record the `updated_at` timestamp.
5. WHEN an admin or co-admin sets a Submission's status to `Pending Review`, THE System SHALL update the Submission's `status` to `Pending Review` and record the `updated_at` timestamp.
6. THE System SHALL allow an admin or co-admin to change the status of a Submission with `status = 'Rejected'` back to `Pending Review` or `Approved`.
7. THE System SHALL allow an admin or co-admin to change the status of a Submission with `status = 'Approved'` back to `Pending Review` or `Rejected`.
8. WHEN a Submission's status is updated, THE System SHALL reflect the change in the Admin_Panel without requiring a full page reload.
9. IF a Submission with the requested ID does not exist, THEN THE System SHALL return a 404 error response.
10. IF a Regular_User calls the submission status update API, THEN THE System SHALL return a 403 Forbidden response.

---

### Requirement 4: Reports Review Workflow

**User Story:** As an admin or co-admin, I want to view all reported posts and comments and take action on them, so that harmful content can be removed and false reports can be dismissed.

#### Acceptance Criteria

1. WHEN an admin or co-admin opens the Admin_Panel, THE System SHALL display all Reports in the reports review section, grouped by target content item.
2. THE System SHALL display the following fields for each Report: reporter display name, report reason, report date, target type (post or comment), and a preview of the reported content.
3. WHEN an admin or co-admin dismisses a Report, THE System SHALL delete the Report record and retain the reported content.
4. WHEN an admin or co-admin deletes reported content, THE System SHALL delete the target post or comment and all associated Reports for that target.
5. WHEN a Report action is completed, THE System SHALL remove the affected Report entry from the Admin_Panel view without requiring a full page reload.
6. IF the target content of a Report has already been deleted, THEN THE System SHALL display the Report with a "Content already removed" indicator.
7. IF a Regular_User calls the report action API, THEN THE System SHALL return a 403 Forbidden response.

---

### Requirement 5: Co-Admin Management (Main Admin Only)

**User Story:** As the main admin, I want to view all user accounts and grant or revoke co-admin status on any existing user account, so that I can delegate moderation responsibilities without creating separate admin accounts.

#### Acceptance Criteria

1. WHEN the Main_Admin opens the Admin_Panel, THE System SHALL display a role management section listing all user accounts.
2. THE System SHALL display the following fields for each user in the management list: display name, email address, current role, and account creation date.
3. WHEN the Main_Admin grants the `co_admin` role to a Regular_User, THE System SHALL update that user's `role` to `co_admin`.
4. WHEN the Main_Admin revokes the `co_admin` role from a Co_Admin, THE System SHALL update that user's `role` to `user`.
5. WHEN a Co_Admin opens the Admin_Panel, THE System SHALL not display the role management section.
6. IF a Co_Admin calls the role management API, THEN THE System SHALL return a 403 Forbidden response.
7. IF the Main_Admin attempts to use the grant/revoke co-admin API on the Main_Admin's own account, THEN THE System SHALL return a 400 error response.
8. WHEN a user's role is updated, THE System SHALL reflect the change in the management list without requiring a full page reload.

---

### Requirement 6: Main Admin Role Transfer

**User Story:** As the main admin, I want to transfer my main admin role to another user, so that ownership of the admin panel can be handed off without losing continuity of moderation.

#### Acceptance Criteria

1. WHEN the Main_Admin initiates a Role_Transfer to a target user, THE System SHALL update the target user's `role` to `main_admin`.
2. WHEN a Role_Transfer is completed, THE System SHALL simultaneously update the former Main_Admin's `role` to `co_admin`, ensuring exactly one `main_admin` exists at all times.
3. THE System SHALL perform the Role_Transfer as an atomic database operation so that no intermediate state exists where zero or two accounts hold the `main_admin` role.
4. WHEN a Role_Transfer is completed, THE System SHALL reflect the updated roles in the management list without requiring a full page reload.
5. IF a Co_Admin or Regular_User calls the role transfer API, THEN THE System SHALL return a 403 Forbidden response.
6. IF the Main_Admin attempts to transfer the `main_admin` role to themselves, THEN THE System SHALL return a 400 error response.
7. IF the target user of a Role_Transfer does not exist, THEN THE System SHALL return a 404 error response.

---

### Requirement 7: Role Hierarchy Enforcement

**User Story:** As a system operator, I want all admin actions to be enforced server-side, so that role restrictions cannot be bypassed by manipulating the client.

#### Acceptance Criteria

1. THE System SHALL validate the requesting user's `role` on every admin API endpoint before executing any action.
2. WHEN a role check fails on any admin API endpoint, THE System SHALL return a 403 Forbidden response with a descriptive error message.
3. THE System SHALL enforce that only the Main_Admin can access the role management and role transfer endpoints.
4. THE System SHALL enforce that both Main_Admin and Co_Admin can access the writeup approval and report review endpoints.
5. IF an API request includes a `user_id` that does not correspond to an existing user, THEN THE System SHALL return a 404 error response.
