# Implementation Plan: User Warning and Restriction System

## Overview

This implementation plan creates a comprehensive User Warning and Restriction System that automatically restricts users who accumulate 5 warned posts, implements post-specific warning tracking, admin coordination features, progressive cooldown periods, and provides administrative management capabilities while preserving users' viewing capabilities during restrictions. The system ensures each post can only be warned once and coordinates between administrators to prevent duplicate warning actions.

## Tasks

- [x] 1. Set up database schema and core data structures
  - Create user_restrictions table with proper indexes and constraints
  - Create post_warnings table with unique post constraint and foreign keys
  - Add database migration logic to existing init_db() function
  - Define Python data classes for RestrictionRecord, RestrictionStatus, and PostWarningRecord
  - Add is_warned column to posts table for quick lookup
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2_

- [ ]* 1.1 Write property test for database schema integrity
  - **Property 11: Database Schema Integrity**
  - **Validates: Requirements 9.1, 9.2, 9.4**

- [x] 2. Implement PostWarningTracker component
  - [x] 2.1 Create PostWarningTracker class for post-specific warning management
    - Implement is_post_warned() method to check if post has been warned
    - Implement warn_post() method to issue warnings for specific posts
    - Implement get_user_warned_post_count() method to count warned posts per user
    - Implement get_post_warning_info() method to retrieve warning details
    - _Requirements: 11.1, 11.2, 11.5, 12.1, 12.2, 12.5_
  
  - [x] 2.2 Integrate PostWarningTracker with notification system
    - Implement notification delivery when posts are warned
    - Track notification delivery status in post_warnings table
    - Integrate with existing notification system for warning messages
    - _Requirements: 11.1, 11.2_
  
  - [ ]* 2.3 Write property test for post-specific warning tracking
    - **Property 13: Post-Specific Warning Tracking**
    - **Validates: Requirements 11.1, 11.2, 11.5, 12.1, 12.2, 12.5**
  
  - [ ]* 2.4 Write property test for duplicate warning prevention
    - **Property 14: Duplicate Warning Prevention**
    - **Validates: Requirements 11.3, 12.3**

- [x] 3. Implement core RestrictionEngine class
  - [x] 3.1 Create RestrictionEngine class with warned post threshold detection
    - Implement check_warning_threshold() method to detect when users reach 5 warned posts
    - Implement calculate_cooldown_period() method with progressive schedule
    - Update logic to count warned posts instead of warnings
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 12.5_
  
  - [ ]* 3.2 Write property test for warning threshold triggers
    - **Property 1: Warning Threshold Triggers Restriction**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
  
  - [ ]* 3.3 Write property test for progressive cooldown calculation
    - **Property 2: Progressive Cooldown Calculation**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 4. Implement restriction lifecycle management
  - [x] 4.1 Create restriction creation and activation logic
    - Implement create_restriction() method with automatic warned post count reset
    - Implement is_user_restricted() method for real-time restriction checking
    - Implement get_restriction_details() method for status information
    - _Requirements: 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 6.1_
  
  - [x] 4.2 Implement automatic restriction expiration
    - Create deactivate_expired_restrictions() method with scheduled execution
    - Implement automatic capability restoration when restrictions expire
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 4.3 Write property test for restriction lifecycle
    - **Property 6: Automatic Restriction Lifecycle**
    - **Validates: Requirements 5.4, 5.5**
  
  - [ ]* 4.4 Write property test for warning count reset and accumulation
    - **Property 7: Warning Count Reset and Accumulation**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 5. Checkpoint - Ensure core restriction engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement AdminCoordination system
  - [x] 6.1 Create AdminCoordination class for real-time coordination
    - Implement update_admin_interfaces() method for broadcasting warning updates
    - Implement disable_warning_buttons() method for warned posts
    - Implement get_available_warning_actions() method for admin interface
    - _Requirements: 14.1, 14.2, 14.5_
  
  - [x] 6.2 Integrate AdminCoordination with reported posts management
    - Remove warned posts from reported posts queue for all administrators
    - Display warning attribution (which admin issued the warning)
    - Provide visual feedback for available warning actions
    - _Requirements: 14.3, 14.4_
  
  - [ ]* 6.3 Write property test for admin interface coordination
    - **Property 15: Admin Interface Coordination**
    - **Validates: Requirements 11.4, 12.4, 14.1, 14.2, 14.5**
  
  - [ ]* 6.4 Write property test for warning attribution and status display
    - **Property 16: Warning Attribution and Status Display**
    - **Validates: Requirements 14.3, 14.4**

- [x] 7. Implement InteractionBlocker middleware
  - [x] 7.1 Create InteractionBlocker class with validation methods
    - Implement check_user_can_interact() method for general interaction validation
    - Implement specific validation methods for posts, comments, reactions, and edits
    - Create decorator functions for protecting API endpoints
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 7.2 Write property test for comprehensive interaction blocking
    - **Property 3: Comprehensive Interaction Blocking**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
  
  - [ ]* 7.3 Write property test for viewing capability preservation
    - **Property 4: Viewing Capability Preservation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 8. Integrate restriction checks with existing API endpoints
  - [x] 8.1 Modify content creation endpoints with restriction validation
    - Update create_post() and create_fw_post() endpoints to check restrictions
    - Update create_comment() endpoint to validate user restrictions
    - Update post_reaction() endpoint to block restricted users
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  
  - [x] 8.2 Modify content editing endpoints with restriction validation
    - Update update_post() and update_comment() endpoints to check restrictions
    - Update create_submission() and update_submission() endpoints
    - Ensure appropriate error messages are returned for blocked actions
    - _Requirements: 3.4, 3.5, 3.6_
  
  - [ ]* 8.3 Write property test for comprehensive user feedback
    - **Property 12: Comprehensive User Feedback**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 9. Enhance warning system integration with post-specific tracking
  - [x] 9.1 Modify admin_issue_warning() endpoint to use PostWarningTracker
    - Update warning issuance to use post-specific warning tracking
    - Integrate with notification system for warning delivery
    - Automatically check for 5 warned posts threshold after each warning
    - Automatically create restrictions when threshold is reached
    - _Requirements: 1.1, 6.1, 6.2, 11.1, 11.2, 12.1_
  
  - [x] 9.2 Update admin interface to show post warning status
    - Display which posts have been warned and by which administrator
    - Remove warned posts from reported posts queue
    - Disable warning buttons for posts that have already been warned
    - _Requirements: 11.3, 11.4, 12.3, 12.4, 14.1, 14.2_
  
  - [ ]* 9.3 Write property test for historical data preservation
    - **Property 8: Historical Data Preservation**
    - **Validates: Requirements 6.4, 6.5**

- [x] 10. Create new API endpoints for post warning and restriction management
  - [x] 10.1 Implement post warning management endpoints
    - Create POST /api/admin/warn-post/<post_id> endpoint for post-specific warnings
    - Create GET /api/admin/post-warnings endpoint for listing all post warnings
    - Create GET /api/posts/<post_id>/warning-status endpoint for checking warning status
    - Create GET /api/user/warned-posts endpoint for user's warned posts
    - _Requirements: 11.1, 11.2, 12.1, 12.2_
  
  - [x] 10.2 Implement user restriction status endpoints
    - Create GET /api/restrictions/status/<user_id> endpoint
    - Create GET /api/user/restriction-status endpoint for current user
    - Return comprehensive restriction information including end times
    - _Requirements: 8.1, 8.2, 5.1, 5.2, 5.3_
  
  - [x] 10.3 Implement admin restriction management endpoints
    - Create GET /api/admin/restrictions endpoint for listing all restrictions
    - Create POST /api/admin/restrictions endpoint for manual restriction creation
    - Create PUT /api/admin/restrictions/<restriction_id> endpoint for modifications
    - Create DELETE /api/admin/restrictions/<restriction_id> endpoint for removal
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.3_
  
  - [x] 10.4 Implement admin coordination endpoints
    - Create GET /api/admin/available-warnings endpoint for available warning actions
    - Create POST /api/admin/warning-coordination endpoint for real-time updates
    - Provide endpoints for admin interface synchronization
    - _Requirements: 14.1, 14.2, 14.5_
  
  - [ ]* 10.5 Write property test for administrative override capabilities
    - **Property 9: Administrative Override Capabilities**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  
  - [ ]* 10.6 Write property test for comprehensive API functionality
    - **Property 10: Comprehensive API Functionality**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 11. Checkpoint - Ensure API integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement frontend restriction status display with UI components
  - [x] 12.1 Create RestrictionStatusDisplay JavaScript component
    - Implement restriction banner display for restricted users
    - Create countdown timer showing remaining restriction time
    - Add restriction status information to user interface
    - _Requirements: 5.1, 5.2, 5.3, 10.4_
  
  - [x] 12.2 Implement restriction icon and popup components
    - Add restriction icon beside hamburger menu on the right side
    - Create restriction popup with formatted time display (days and hours only)
    - Display restriction reason in format "you have been restricted for [reason]"
    - Display remaining time in format "time remaining: X day/s and Y hour/s"
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [x] 12.3 Modify existing UI components to show restriction feedback
    - Update interaction buttons to show disabled state for restricted users
    - Add tooltips explaining why actions are blocked
    - Create modal dialogs for restriction explanations when actions are attempted
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [ ]* 12.4 Write property test for comprehensive status information
    - **Property 5: Comprehensive Status Information**
    - **Validates: Requirements 5.1, 5.2, 5.3, 13.1, 13.2, 13.3, 13.4, 13.5**

- [x] 13. Enhance admin interface with restriction and warning management
  - [x] 13.1 Add restriction management section to admin panel
    - Create admin UI for viewing all user restrictions
    - Add controls for manually creating, modifying, and removing restrictions
    - Display restriction history and statistics for users
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 13.2 Integrate post warning management with admin workflows
    - Add post-specific warning interface with duplicate prevention
    - Display warning status and attribution for each reported post
    - Implement real-time coordination between administrator interfaces
    - Remove warned posts from reported queue for all administrators
    - _Requirements: 11.3, 11.4, 12.3, 12.4, 14.1, 14.2, 14.3, 14.4_
  
  - [x] 13.3 Integrate restriction management with existing admin workflows
    - Add restriction creation option to warning issuance workflow
    - Display user restriction status in admin user management
    - Add audit logging for all administrative restriction actions
    - _Requirements: 7.5, 8.3_

- [x] 14. Implement background task for restriction expiration and notifications
  - [x] 14.1 Create scheduled task for automatic restriction cleanup
    - Implement periodic execution of deactivate_expired_restrictions()
    - Add logging for restriction expiration events
    - Ensure proper error handling for cleanup operations
    - _Requirements: 5.4, 5.5_
  
  - [x] 14.2 Add notification system integration for restriction and warning events
    - Send notifications when users receive post warnings
    - Send notifications when users are restricted
    - Send notifications when restrictions expire
    - Integrate with existing notification system
    - _Requirements: 5.1, 10.4, 11.1, 11.2_

- [x] 15. Add comprehensive error handling and logging
  - [x] 15.1 Implement robust error handling for restriction and warning operations
    - Add proper exception handling for database operations
    - Implement graceful degradation when restriction system is unavailable
    - Add comprehensive logging for all restriction and warning-related events
    - _Requirements: 9.5, 8.4_
  
  - [x] 15.2 Add input validation and security measures
    - Validate all restriction and warning-related API inputs
    - Implement proper authorization checks for admin operations
    - Add rate limiting for restriction-related API calls
    - Prevent duplicate post warnings through database constraints
    - _Requirements: 8.4, 7.5, 12.3_

- [x] 16. Integration testing and performance optimization
  - [x] 16.1 Implement comprehensive integration tests
    - Test end-to-end restriction workflows from warning to expiration
    - Test post-specific warning workflows with admin coordination
    - Test admin interface integration with restriction and warning management
    - Test frontend integration with restriction status display and UI components
    - Test notification system integration for warnings and restrictions
    - _Requirements: All requirements integration_
  
  - [ ]* 16.2 Write integration tests for restriction and warning system
    - Test database integration with realistic data volumes including post warnings
    - Test API integration with authentication and authorization
    - Test frontend integration with restriction status updates and admin coordination
    - Test real-time admin interface coordination and warning management

- [x] 17. Final checkpoint - Ensure all tests pass and system is ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The system integrates with existing Flask application components and database schema
- Progressive cooldown periods: 1 day → 1 week → 2 weeks → 1 month → 3 months
- Restriction system preserves viewing capabilities while blocking interactions
- Administrative override capabilities allow manual restriction management
- Post-specific warning tracking ensures each post can only be warned once
- Admin coordination prevents duplicate warning actions between administrators
- Restriction UI provides clear visual feedback with icon and popup components
- Notification system integration delivers warnings and restriction notices to users
- Real-time admin interface updates coordinate warning actions across administrators