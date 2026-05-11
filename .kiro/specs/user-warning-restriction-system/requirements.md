# Requirements Document

## Introduction

The User Warning and Restriction System extends the existing warning mechanism to automatically restrict users who accumulate multiple warned posts. This system implements progressive cooldown periods and prevents restricted users from interacting with the platform while maintaining their ability to view content. The system ensures that each post can only be warned once and coordinates between administrators to prevent duplicate warning actions. When users accumulate 5 posts that have been warned by administrators, they are automatically restricted with escalating cooldown periods for repeat offenses.

## Glossary

- **Warning_System**: The existing mechanism for issuing warnings to users for policy violations
- **Restriction_Engine**: The component that automatically applies restrictions when warning thresholds are reached
- **User_Account**: A registered user account with associated warning count and restriction status
- **Interaction_Capability**: The ability to upload content, comment, react, edit, or submit to the writers hub
- **Viewing_Capability**: The ability to read posts, view content, and browse the platform
- **Cooldown_Period**: The duration of time a user remains restricted before regaining interaction capabilities
- **Warning_Threshold**: The number of warned posts (5) that triggers an automatic restriction
- **Progressive_Suspension**: The escalating duration system for repeated restrictions
- **Reported_Post**: A post that has been reported by users and appears in the admin panel for review
- **Warned_Post**: A post that has been officially warned by an administrator and can no longer be warned again
- **Post_Warning_Status**: The state tracking whether a specific post has been warned by an administrator
- **Restriction_Icon**: The visual indicator displayed beside the hamburger menu for restricted users
- **Notification_System**: The mechanism that delivers warnings and restriction notices to users

## Requirements

### Requirement 1: Automatic Restriction Trigger

**User Story:** As a platform administrator, I want users to be automatically restricted when they accumulate 5 warned posts, so that repeat offenders face consequences for policy violations.

#### Acceptance Criteria

1. WHEN a user accumulates 5 posts that have been warned by administrators, THE Restriction_Engine SHALL automatically create an active restriction for that user
2. THE Restriction_Engine SHALL calculate the appropriate cooldown period based on the user's restriction history
3. THE Restriction_Engine SHALL set the restriction start time to the current timestamp
4. THE Restriction_Engine SHALL set the restriction end time based on the calculated cooldown period
5. THE Restriction_Engine SHALL mark the restriction as active in the system

### Requirement 2: Progressive Cooldown System

**User Story:** As a platform administrator, I want restriction durations to increase with each subsequent restriction, so that repeat offenders face escalating consequences.

#### Acceptance Criteria

1. WHEN a user receives their first restriction, THE Restriction_Engine SHALL set the cooldown period to 1 day
2. WHEN a user receives their second restriction, THE Restriction_Engine SHALL set the cooldown period to 1 week (7 days)
3. WHEN a user receives their third restriction, THE Restriction_Engine SHALL set the cooldown period to 2 weeks (14 days)
4. WHEN a user receives their fourth restriction, THE Restriction_Engine SHALL set the cooldown period to 1 month (30 days)
5. WHEN a user receives their fifth or subsequent restriction, THE Restriction_Engine SHALL set the cooldown period to 3 months (90 days)

### Requirement 3: Interaction Blocking

**User Story:** As a platform administrator, I want restricted users to be unable to interact with the platform, so that they cannot disrupt the community during their restriction period.

#### Acceptance Criteria

1. WHILE a user has an active restriction, THE Platform SHALL prevent the user from uploading any content
2. WHILE a user has an active restriction, THE Platform SHALL prevent the user from creating comments on posts
3. WHILE a user has an active restriction, THE Platform SHALL prevent the user from adding reactions to posts or comments
4. WHILE a user has an active restriction, THE Platform SHALL prevent the user from editing their existing posts or comments
5. WHILE a user has an active restriction, THE Platform SHALL prevent the user from submitting content to the writers hub
6. WHILE a user has an active restriction, THE Platform SHALL return appropriate error messages when interaction attempts are made

### Requirement 4: Viewing Capability Preservation

**User Story:** As a restricted user, I want to continue viewing content on the platform, so that I can stay informed while serving my restriction period.

#### Acceptance Criteria

1. WHILE a user has an active restriction, THE Platform SHALL allow the user to view all posts
2. WHILE a user has an active restriction, THE Platform SHALL allow the user to read all comments
3. WHILE a user has an active restriction, THE Platform SHALL allow the user to browse all public content
4. WHILE a user has an active restriction, THE Platform SHALL allow the user to view their own profile and posts
5. WHILE a user has an active restriction, THE Platform SHALL allow the user to navigate all public areas of the website

### Requirement 5: Restriction Status Management

**User Story:** As a platform user, I want to know when my restriction period ends, so that I understand when I can interact again.

#### Acceptance Criteria

1. THE Platform SHALL display restriction status information to restricted users
2. THE Platform SHALL show the restriction end date and time to restricted users
3. THE Platform SHALL show the remaining duration of the restriction period
4. WHEN a restriction period expires, THE Restriction_Engine SHALL automatically deactivate the restriction
5. WHEN a restriction is deactivated, THE Platform SHALL restore full interaction capabilities to the user

### Requirement 6: Warning Count Reset Logic

**User Story:** As a platform administrator, I want the warning accumulation system to work correctly with restrictions, so that users face appropriate consequences for continued violations.

#### Acceptance Criteria

1. WHEN a user is restricted, THE Warning_System SHALL reset the user's warned post count to 0
2. WHEN a user receives new warnings after restriction, THE Warning_System SHALL accumulate warned posts normally
3. WHEN a user reaches 5 warned posts again after a previous restriction, THE Restriction_Engine SHALL apply the next level of progressive suspension
4. THE Warning_System SHALL maintain a history of all warnings issued to users
5. THE Restriction_Engine SHALL maintain a count of how many times each user has been restricted

### Requirement 7: Administrative Override Capabilities

**User Story:** As a platform administrator, I want to manually manage user restrictions, so that I can handle exceptional cases and appeals.

#### Acceptance Criteria

1. THE Platform SHALL allow administrators to manually create restrictions for users
2. THE Platform SHALL allow administrators to manually lift active restrictions
3. THE Platform SHALL allow administrators to modify restriction end dates
4. THE Platform SHALL allow administrators to view a user's complete restriction history
5. THE Platform SHALL log all administrative actions related to restrictions for audit purposes

### Requirement 8: API Integration Points

**User Story:** As a developer, I want clear API endpoints for restriction management, so that the frontend can properly handle restricted user interactions.

#### Acceptance Criteria

1. THE Platform SHALL provide an API endpoint to check if a user is currently restricted
2. THE Platform SHALL provide an API endpoint to retrieve restriction details for a user
3. THE Platform SHALL provide API endpoints for administrators to manage restrictions
4. THE Platform SHALL return appropriate HTTP status codes for restriction-related API calls
5. THE Platform SHALL include restriction information in user authentication responses

### Requirement 9: Database Schema Requirements

**User Story:** As a developer, I want a robust database schema for restrictions, so that the system can reliably track and manage user restrictions.

#### Acceptance Criteria

1. THE Platform SHALL store restriction records with user_id, start_time, end_time, and restriction_count
2. THE Platform SHALL maintain referential integrity between users and their restrictions
3. THE Platform SHALL support querying active restrictions efficiently
4. THE Platform SHALL support historical restriction data for reporting
5. THE Platform SHALL handle concurrent restriction operations safely

### Requirement 10: User Interface Feedback

**User Story:** As a restricted user, I want clear feedback when I attempt interactions, so that I understand why my actions are blocked.

#### Acceptance Criteria

1. WHEN a restricted user attempts to create content, THE Platform SHALL display a clear restriction message
2. WHEN a restricted user attempts to comment, THE Platform SHALL display the restriction end time
3. WHEN a restricted user attempts to react, THE Platform SHALL explain the restriction reason
4. THE Platform SHALL display restriction status prominently in the user interface for restricted users
5. THE Platform SHALL provide information about how to appeal restrictions (if applicable)

### Requirement 11: Warning Workflow and Notification System

**User Story:** As an administrator, I want to send warnings that appear in user notifications, so that users are properly informed of policy violations.

#### Acceptance Criteria

1. WHEN an administrator clicks "send warning" in the admin panel, THE Notification_System SHALL deliver the warning to the reported user's notifications
2. WHEN a warning is sent for a specific post, THE Warning_System SHALL mark that post as warned and remove it from the reported posts list
3. WHEN a post has been warned by any administrator, THE Platform SHALL prevent other administrators from warning the same post again
4. WHEN a post has been warned, THE Admin_Panel SHALL remove the "warn" button for that post and display warned status
5. THE Warning_System SHALL track warnings at the post level to prevent duplicate warnings for the same content

### Requirement 12: Post-Specific Warning Tracking

**User Story:** As a platform administrator, I want to ensure posts can only be warned once, so that users don't receive multiple warnings for the same violation.

#### Acceptance Criteria

1. THE Warning_System SHALL maintain a record of which specific posts have been warned
2. WHEN a post receives a warning, THE Warning_System SHALL mark that post as permanently warned
3. THE Platform SHALL prevent any administrator from issuing additional warnings for posts that have already been warned
4. THE Admin_Panel SHALL visually indicate which reported posts have already been warned
5. THE Warning_System SHALL count only unique warned posts toward the restriction threshold

### Requirement 13: Restriction Status UI Indicator

**User Story:** As a restricted user, I want to see my restriction status clearly in the interface, so that I understand my current account state.

#### Acceptance Criteria

1. WHEN a user is restricted, THE Platform SHALL display a restriction icon beside the hamburger menu on the right side
2. THE Restriction_Icon SHALL be visually distinct and clearly indicate restricted status
3. WHEN a user clicks the restriction icon, THE Platform SHALL show a popup message with restriction details
4. THE Restriction_Popup SHALL display the restriction reason in the format "you have been restricted for [reason]"
5. THE Restriction_Popup SHALL display remaining time in the format "time remaining: X day/s and Y hour/s" without minutes or seconds

### Requirement 14: Admin Coordination for Warning Actions

**User Story:** As an administrator, I want to coordinate with other administrators to prevent duplicate warning actions, so that the warning system operates efficiently.

#### Acceptance Criteria

1. WHEN any administrator warns a reported post, THE Platform SHALL immediately update the admin interface for all other administrators
2. THE Admin_Panel SHALL disable the "warn" button for posts that have already been warned by another administrator
3. THE Platform SHALL display the warning status and which administrator issued the warning for each post
4. WHEN a post is warned, THE Platform SHALL remove it from the active reported posts queue for all administrators
5. THE Admin_Panel SHALL provide clear visual feedback about which posts are available for warning actions