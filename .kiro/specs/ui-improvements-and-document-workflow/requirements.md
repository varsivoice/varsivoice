# Requirements Document

## Introduction

This document specifies the requirements for UI improvements and a document upload workflow for The Varsitarian publication system. The system is a Flask-based web application with vanilla JavaScript that allows students to submit literary pieces and interact through a Freedom Wall feature. This feature addresses several UI issues and introduces a streamlined document submission workflow for writers who prefer to upload pre-written documents rather than using the rich text editor.

## Glossary

- **Freedom_Wall**: The anonymous posting feature where users can share thoughts and interact with posts
- **Writers_Hub**: The page where users submit literary pieces for publication consideration
- **Admin_Panel**: The administrative interface for managing submissions, reports, and user permissions
- **Document_Submission**: A submission that includes an uploaded file (PDF, Word, etc.) instead of or in addition to editor content
- **Rich_Text_Editor**: The contenteditable HTML editor with formatting toolbar for writing content
- **Submission_Form**: The form on Writers Hub for creating new literary submissions
- **Admin_Sidebar**: The navigation menu in the Admin Panel for switching between sections
- **Background_Styling**: The CSS rules that control the visual appearance of page backgrounds

## Requirements

### Requirement 1: Fix Freedom Wall Background Display

**User Story:** As a user viewing the Freedom Wall, I want the background to display correctly, so that the page has the intended visual appearance.

#### Acceptance Criteria

1. WHEN a user navigates to the Freedom Wall page, THE Freedom_Wall SHALL display the background styling as defined in the CSS
2. THE Background_Styling SHALL be visible and render correctly in both light and dark theme modes
3. THE Freedom_Wall SHALL maintain consistent background appearance across different browser viewport sizes

### Requirement 2: Remove End of Feed Message from Freedom Wall

**User Story:** As a user browsing the Freedom Wall, I want to see only relevant content without unnecessary end-of-feed messages, so that the experience is cleaner and less cluttered.

#### Acceptance Criteria

1. WHEN a user scrolls to the end of posts on the Freedom Wall page, THE Freedom_Wall SHALL NOT display an "end of feed" message
2. WHEN a user scrolls to the end of posts on the Home page, THE Home_Page SHALL display an "end of feed" message
3. THE Freedom_Wall SHALL distinguish itself from the Home page in terms of end-of-feed behavior

### Requirement 3: Implement Document-Only Submission Workflow

**User Story:** As a writer, I want to upload a pre-written document without using the rich text editor, so that I can submit my work more efficiently when I already have it prepared.

#### Acceptance Criteria

1. WHEN a writer uploads a document file, THE Submission_Form SHALL NOT require content in the Rich_Text_Editor
2. WHEN a writer uploads a document file, THE Submission_Form SHALL require only Title, Category, Author Name, and Author Bio fields
3. WHEN a writer submits with a document file, THE System SHALL accept the submission without Rich_Text_Editor content
4. WHEN a document-only submission is created, THE System SHALL store a flag indicating the submission type
5. THE Submission_Form SHALL validate that either Rich_Text_Editor content OR a document file is provided

### Requirement 4: Display Document Submission Indicator

**User Story:** As a writer reviewing my submissions, I want to see a clear indication when I submitted via document upload, so that I understand why the content area appears empty.

#### Acceptance Criteria

1. WHEN a writer views a document-only submission in their submission list, THE Writers_Hub SHALL display a message indicating "Content submitted via document" instead of empty content
2. WHEN a writer opens a document-only submission in the edit modal, THE System SHALL display the document indicator message instead of showing an empty Rich_Text_Editor
3. THE Document_Submission SHALL display the attached document filename and provide a download link
4. WHEN a submission has both editor content and a document, THE System SHALL display both the content and the document link

### Requirement 5: Display Document Submissions in Admin Panel

**User Story:** As an admin reviewing submissions, I want to see a clear indication when a submission was uploaded as a document, so that I understand the submission format without confusion.

#### Acceptance Criteria

1. WHEN an admin views a document-only submission in the Admin Panel, THE Admin_Panel SHALL display "Content submitted via document" instead of empty content
2. WHEN an admin views a document-only submission, THE Admin_Panel SHALL display the document filename with a download link
3. THE Admin_Panel SHALL allow admins to download the submitted document file
4. WHEN a submission has both editor content and a document, THE Admin_Panel SHALL display both the content preview and the document link

### Requirement 6: Redesign Admin Panel Sidebar as Fixed Left Navigation

**User Story:** As an admin using the Admin Panel, I want a fixed left sidebar navigation similar to Facebook's layout, so that I can easily access different sections without the navigation moving.

#### Acceptance Criteria

1. THE Admin_Sidebar SHALL be positioned as a fixed element on the leftmost part of the screen
2. THE Admin_Sidebar SHALL remain visible when the user scrolls the main content area
3. THE Admin_Sidebar SHALL NOT use a floating container style
4. THE Admin_Sidebar SHALL maintain its position at the left edge of the viewport
5. WHEN the viewport width is below 680px, THE Admin_Sidebar SHALL adapt to a responsive layout
6. THE Admin_Panel SHALL display the main content area to the right of the fixed sidebar

### Requirement 7: Display Notifications in Admin Panel

**User Story:** As an admin, I want to see notifications in the Admin Panel, so that I can stay informed about new submissions, reports, and other important events.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a notification bell icon in the header
2. WHEN an admin clicks the notification bell, THE Admin_Panel SHALL display a notification panel
3. THE Notification_Panel SHALL show unread notifications with a visual indicator
4. THE Admin_Panel SHALL display the notification badge count when unread notifications exist
5. THE Notification_Panel SHALL allow admins to mark notifications as read
6. THE Admin_Panel SHALL use the existing notification system from the main application
