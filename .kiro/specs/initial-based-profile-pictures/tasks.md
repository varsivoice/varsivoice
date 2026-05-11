# Implementation Plan: Initial-Based Profile Pictures

## Overview

This implementation plan breaks down the initial-based profile pictures feature into discrete coding tasks. The approach follows a bottom-up strategy: first implementing core utility functions, then integrating with signup endpoints, and finally adding tests to validate correctness.

## Tasks

- [x] 1. Add Pillow dependency and verify installation
  - Add `Pillow>=10.0.0` to requirements.txt
  - Verify the dependency can be imported in Python
  - _Requirements: 8.3_

- [x] 2. Implement color palette and selection logic
  - [x] 2.1 Define AVATAR_COLOR_PALETTE constant in app.py
    - Create a list with exactly 20 hex color values matching avatar-color.js
    - Place the constant near the top of app.py with other configuration constants
    - _Requirements: 4.1, 4.3_
  
  - [x] 2.2 Implement select_random_color() function
    - Write function that returns a random color from AVATAR_COLOR_PALETTE
    - Use random.choice() for equal probability selection
    - _Requirements: 4.2, 4.4_
  
  - [ ]* 2.3 Write unit tests for color selection
    - Test that select_random_color() returns valid hex colors
    - Test that returned colors are members of the palette
    - _Requirements: 4.1, 4.3_

- [x] 3. Implement initial extraction logic
  - [x] 3.1 Implement extract_initials() function
    - Write function that takes display_name and returns initials string
    - Handle two-word names (return first char of each word)
    - Handle single-word names (return first char only)
    - Handle empty/invalid names (return "U" as default)
    - Convert all initials to uppercase
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  
  - [ ]* 3.2 Write property test for initial extraction
    - **Property 1: Initials Extraction Consistency**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**
    - Test that extract_initials() is deterministic (same input → same output)
    - Test edge cases: empty strings, single words, multiple words, special characters
  
  - [ ]* 3.3 Write unit tests for initial extraction
    - Test "John Doe" → "JD"
    - Test "Alice" → "A"
    - Test "Mary Jane Watson" → "MJ"
    - Test "" → "U"
    - Test names with extra whitespace
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [x] 4. Implement image generation logic
  - [x] 4.1 Implement generate_initial_avatar() function
    - Write function that takes user_id and display_name as parameters
    - Call extract_initials() to get initials
    - Call select_random_color() to get background color
    - Create 200x200 RGB image using Pillow with colored background
    - Load font (try arial.ttf, fallback to default font)
    - Calculate centered text position using textbbox()
    - Draw white text on colored background
    - Generate unique filename: user_{user_id}_{uuid}.png
    - Ensure static/uploads/profiles/ directory exists
    - Save image as PNG
    - Return relative URL path (e.g., "/static/uploads/profiles/user_1_abc123.png")
    - Return None on any error and log the exception
    - _Requirements: 1.8, 1.9, 1.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 4.2 Write property test for file path validity
    - **Property 3: File Path Validity**
    - **Validates: Requirements 1.8, 1.10, 6.1, 6.7**
    - Test that successful generations return valid file paths
    - Test that returned paths point to existing PNG files
    - Test that generated images have 200x200 dimensions
  
  - [ ]* 4.3 Write property test for filename uniqueness
    - **Property 6: Filename Uniqueness**
    - **Validates: Requirements 6.7, 6.8**
    - Test that multiple calls generate unique filenames
    - Test that UUID ensures no collisions
  
  - [ ]* 4.4 Write unit tests for image generation
    - Test successful generation returns file path
    - Test file exists after generation
    - Test file is valid PNG format
    - Test image dimensions are 200x200
    - Test failure returns None
    - Test directory creation when directory doesn't exist
    - _Requirements: 1.8, 1.10, 6.1, 6.7, 7.1_

- [x] 5. Checkpoint - Ensure core functions work correctly
  - Run all unit tests and property tests for core functions
  - Manually test generate_initial_avatar() with sample inputs
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate avatar generation with /api/auth/signup endpoint
  - [x] 6.1 Modify signup() function to call generate_initial_avatar()
    - After user record is created and user_id is generated, call generate_initial_avatar(uid, display_name)
    - If photo_url is returned (not None), update users table: UPDATE users SET photo_url = ? WHERE id = ?
    - Ensure avatar generation happens before conn.commit()
    - Ensure signup completes even if avatar generation fails (photo_url remains NULL)
    - _Requirements: 1.1, 5.1, 5.3, 5.4, 5.5_
  
  - [ ]* 6.2 Write property test for signup atomicity
    - **Property 4: Signup Atomicity**
    - **Validates: Requirements 5.3, 5.4, 7.5**
    - Test that user creation and avatar generation are atomic
    - Test that signup succeeds with photo_url when generation succeeds
    - Test that signup succeeds with NULL photo_url when generation fails
  
  - [ ]* 6.3 Write integration test for signup with avatar
    - Test POST to /api/auth/signup creates user with photo_url
    - Test photo_url points to valid image file
    - Test image file contains correct initials
    - _Requirements: 1.1, 5.1_

- [x] 7. Integrate avatar generation with /api/auth/verify-and-signup endpoint
  - [x] 7.1 Modify verify_and_signup() function to call generate_initial_avatar()
    - After user record is created and user_id is generated, call generate_initial_avatar(uid, pending["display_name"])
    - If photo_url is returned (not None), update users table: UPDATE users SET photo_url = ? WHERE id = ?
    - Ensure avatar generation happens before conn.commit()
    - Ensure signup completes even if avatar generation fails (photo_url remains NULL)
    - _Requirements: 1.2, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 7.2 Write integration test for verify-and-signup with avatar
    - Test POST to /api/auth/verify-and-signup creates user with photo_url
    - Test photo_url points to valid image file
    - Test image file contains correct initials
    - _Requirements: 1.2, 5.2_

- [x] 8. Checkpoint - Ensure signup integration works correctly
  - Test both signup endpoints manually with various display names
  - Verify avatars are generated and saved correctly
  - Verify signup completes even when avatar generation fails (simulate by removing write permissions temporarily)
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 9. Add property test for backward compatibility
  - **Property 5: Backward Compatibility Preservation**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - Test that existing users' photo_url values are not modified
  - Test that avatar generation only occurs during new user signup
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 10. Add property test for error resilience
  - **Property 7: Error Resilience**
  - **Validates: Requirements 5.4, 5.5, 7.2, 7.5**
  - Test that avatar generation failures don't prevent signup
  - Test that errors are logged when generation fails
  - Test that photo_url is NULL when generation fails
  - _Requirements: 5.4, 5.5, 7.2, 7.5_

- [ ]* 11. Add property test for color palette membership
  - **Property 2: Color Palette Membership**
  - **Validates: Requirements 4.1, 4.3**
  - Test that all generated avatars use colors from AVATAR_COLOR_PALETTE
  - Test that palette contains exactly 20 colors
  - _Requirements: 4.1, 4.3_

- [x] 12. Final checkpoint - End-to-end validation
  - Sign up multiple test users with various display names
  - Verify avatars appear correctly in profile pages
  - Test profile photo upload still works (upload custom photo and verify it replaces avatar)
  - Verify existing users' profiles are unchanged
  - Check that avatar colors vary across multiple signups
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows through the API endpoints
- Core implementation tasks (1-8) must be completed; testing tasks (marked with `*`) are optional
- The implementation follows a bottom-up approach: utilities first, then integration, then testing
