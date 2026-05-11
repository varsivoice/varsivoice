# Design Document: Initial-Based Profile Pictures

## Overview

This design specifies the implementation of auto-generated profile pictures with user initials and random background colors for new users during signup. The feature will create personalized avatars without requiring immediate photo uploads, improving the user onboarding experience.

## Design Approach

The implementation will add a Python-based image generation module that creates initial-based avatars during the signup process. The module will integrate with existing signup endpoints (`/api/auth/signup` and `/api/auth/verify-and-signup`) and reuse the color palette from the existing `avatar-color.js` module.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Signup Endpoints                         │
│  /api/auth/signup  |  /api/auth/verify-and-signup           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              generate_initial_avatar()                       │
│  • Extract initials from display_name                        │
│  • Select random color from palette                          │
│  • Generate PNG image with Pillow                            │
│  • Save to static/uploads/profiles/                          │
│  • Return file path or None on error                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Update                             │
│  UPDATE users SET photo_url = ? WHERE id = ?                │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User submits signup request** → Signup endpoint receives email, password, display_name
2. **User record created** → Database INSERT creates user with NULL photo_url
3. **Avatar generation triggered** → `generate_initial_avatar(user_id, display_name)` called
4. **Initials extracted** → First characters of first two words extracted and uppercased
5. **Color selected** → Random color chosen from 20-color palette
6. **Image generated** → 200x200 PNG created with Pillow library
7. **File saved** → Image saved as `user_{user_id}_{uuid}.png`
8. **Database updated** → photo_url field updated with file path
9. **Response returned** → User object with photo_url returned to client

## Detailed Design

### 1. Initial Extraction Logic

**Function:** `extract_initials(display_name: str) -> str`

**Algorithm:**
```python
def extract_initials(display_name):
    """
    Extract initials from display name.
    
    Rules:
    - Split by whitespace
    - Take first character of first two words
    - Convert to uppercase
    - Default to "U" if empty or invalid
    
    Examples:
    - "John Doe" → "JD"
    - "Alice" → "A"
    - "Mary Jane Watson" → "MJ"
    - "" → "U"
    - "123" → "1"
    """
    if not display_name or not display_name.strip():
        return "U"
    
    words = display_name.strip().split()
    if len(words) == 0:
        return "U"
    elif len(words) == 1:
        return words[0][0].upper()
    else:
        return (words[0][0] + words[1][0]).upper()
```

**Validates Requirements:** 1.3, 1.4, 1.5, 1.6

### 2. Color Selection Logic

**Function:** `select_random_color() -> str`

**Color Palette:**
```python
AVATAR_COLOR_PALETTE = [
    '#c0392b', '#e74c3c', '#8e44ad', '#9b59b6',
    '#2980b9', '#3498db', '#16a085', '#1abc9c',
    '#27ae60', '#2ecc71', '#d35400', '#e67e22',
    '#c0392b', '#7f8c8d', '#2c3e50', '#6d4c41',
    '#00838f', '#558b2f', '#6a1b9a', '#1565c0'
]
```

**Algorithm:**
```python
import random

def select_random_color():
    """
    Select a random color from the palette.
    Each color has equal probability (1/20).
    """
    return random.choice(AVATAR_COLOR_PALETTE)
```

**Validates Requirements:** 4.1, 4.2, 4.3, 4.4

### 3. Image Generation Logic

**Function:** `generate_initial_avatar(user_id: int, display_name: str) -> Optional[str]`

**Dependencies:**
- Pillow (PIL) library for image generation
- uuid for unique filename generation
- os for file system operations

**Algorithm:**
```python
from PIL import Image, ImageDraw, ImageFont
import uuid
import os

def generate_initial_avatar(user_id, display_name):
    """
    Generate an initial-based avatar image.
    
    Returns:
    - File path (relative URL) on success
    - None on failure
    
    Side effects:
    - Creates image file in static/uploads/profiles/
    - Logs errors if generation fails
    """
    try:
        # Extract initials
        initials = extract_initials(display_name)
        
        # Select random background color
        bg_color = select_random_color()
        
        # Image dimensions
        size = 200
        
        # Create image with colored background
        image = Image.new('RGB', (size, size), bg_color)
        draw = ImageDraw.Draw(image)
        
        # Load font (use default if custom font unavailable)
        try:
            font = ImageFont.truetype("arial.ttf", 80)
        except:
            font = ImageFont.load_default()
        
        # Calculate text position (centered)
        bbox = draw.textbbox((0, 0), initials, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) / 2
        y = (size - text_height) / 2
        
        # Draw white text
        draw.text((x, y), initials, fill='white', font=font)
        
        # Generate unique filename
        filename = f"user_{user_id}_{uuid.uuid4().hex}.png"
        
        # Ensure directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Save image
        filepath = os.path.join(UPLOAD_DIR, filename)
        image.save(filepath, 'PNG')
        
        # Return relative URL
        rel_path = os.path.relpath(filepath, app.root_path)
        return "/" + rel_path.replace(os.sep, "/")
        
    except Exception as e:
        # Log error and return None
        print(f"Error generating avatar for user {user_id}: {e}")
        return None
```

**Validates Requirements:** 1.1, 1.8, 1.9, 1.10, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.3, 7.4, 7.5

### 4. Integration with Signup Endpoints

**Modification to `/api/auth/signup`:**

```python
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    # ... existing validation code ...
    
    password_hash = generate_password_hash(password)
    conn = get_conn()
    try:
        if conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
            return jsonify({"error": "This email is already registered."}), 409
        
        # Create user with NULL photo_url
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, display_name, photo_url) VALUES (?, ?, ?, ?)",
            (email, password_hash, display_name, None),
        )
        uid = cur.lastrowid
        
        # Generate user_id
        user_id = f"USR-{uid:05d}"
        conn.execute("UPDATE users SET user_id = ? WHERE id = ?", (user_id, uid))
        
        # Generate initial avatar
        photo_url = generate_initial_avatar(uid, display_name)
        if photo_url:
            conn.execute("UPDATE users SET photo_url = ? WHERE id = ?", (photo_url, uid))
        
        conn.commit()
        
        # Return user object
        user = conn.execute(
            "SELECT id, email, display_name, photo_url, created_at, role, user_id FROM users WHERE id = ?",
            (uid,),
        ).fetchone()
        return jsonify({"user": json_row(user)}), 201
    finally:
        conn.close()
```

**Modification to `/api/auth/verify-and-signup`:**

```python
@app.route("/api/auth/verify-and-signup", methods=["POST"])
def verify_and_signup():
    # ... existing validation and verification code ...
    
    # Code is valid — create the account
    _pending_verifications.pop(email, None)
    password_hash = generate_password_hash(pending["password"])
    conn = get_conn()
    try:
        if conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone():
            return jsonify({"error": "This email is already registered."}), 409
        
        # Create user with NULL photo_url
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, display_name, photo_url) VALUES (?, ?, ?, ?)",
            (email, password_hash, pending["display_name"], None),
        )
        uid = cur.lastrowid
        
        # Generate user_id
        user_id = f"USR-{uid:05d}"
        conn.execute("UPDATE users SET user_id = ? WHERE id = ?", (user_id, uid))
        
        # Generate initial avatar
        photo_url = generate_initial_avatar(uid, pending["display_name"])
        if photo_url:
            conn.execute("UPDATE users SET photo_url = ? WHERE id = ?", (photo_url, uid))
        
        conn.commit()
        
        # Return user object
        user = conn.execute(
            "SELECT id, email, display_name, photo_url, created_at, role, user_id FROM users WHERE id = ?",
            (uid,),
        ).fetchone()
        return jsonify({"user": json_row(user)}), 201
    finally:
        conn.close()
```

**Validates Requirements:** 1.1, 1.2, 5.1, 5.2, 5.3, 5.4, 5.5

### 5. Backward Compatibility

**No changes required for existing users:**
- Avatar generation only occurs during signup (new user creation)
- Existing users retain their current photo_url values
- Profile photo upload endpoint (`/api/users/<user_id>/profile`) remains unchanged
- Default profile image selection remains unchanged

**Validates Requirements:** 3.1, 3.2, 3.3, 3.4, 2.1, 2.2, 2.3, 2.4

### 6. Error Handling

**Failure scenarios:**

1. **Image generation fails** → photo_url set to NULL, signup continues
2. **Directory creation fails** → Error logged, photo_url set to NULL
3. **File write fails** → Error logged, photo_url set to NULL
4. **Font loading fails** → Fallback to default font
5. **Invalid display_name** → Default to "U" initial

**Error logging:**
```python
import logging

logger = logging.getLogger(__name__)

# In generate_initial_avatar():
except Exception as e:
    logger.error(f"Failed to generate avatar for user {user_id}: {e}", exc_info=True)
    return None
```

**Validates Requirements:** 5.4, 5.5, 7.2, 7.4, 7.5

### 7. Performance Considerations

**Expected performance:**
- Image generation: ~50-100ms (Pillow is fast for simple operations)
- File I/O: ~10-50ms (depends on disk speed)
- Total overhead: ~100-200ms per signup

**Optimization strategies:**
- Use default font to avoid font file loading overhead
- Generate small images (200x200) for fast processing
- Synchronous generation is acceptable (< 500ms requirement)

**Validates Requirements:** 8.1, 8.2, 8.3, 8.4

## Dependencies

### New Dependencies

**Python packages (add to requirements.txt):**
```
Pillow>=10.0.0
```

### Existing Dependencies

- Flask (web framework)
- sqlite3 (database)
- uuid (filename generation)
- os (file system operations)
- random (color selection)

## Testing Strategy

### Unit Tests

1. **Test `extract_initials()`:**
   - Two-word names → "JD"
   - Single-word names → "J"
   - Empty names → "U"
   - Names with special characters
   - Names with extra whitespace

2. **Test `select_random_color()`:**
   - Returns valid hex color
   - Returns color from palette
   - Distribution is roughly uniform (statistical test)

3. **Test `generate_initial_avatar()`:**
   - Successful generation returns file path
   - File exists after generation
   - File is valid PNG
   - Image dimensions are 200x200
   - Failure returns None

### Integration Tests

1. **Test signup with avatar generation:**
   - POST to `/api/auth/signup` creates user with photo_url
   - photo_url points to valid image file
   - Image file contains correct initials

2. **Test signup with avatar generation failure:**
   - Simulate file system error
   - Verify signup completes with photo_url = NULL

3. **Test backward compatibility:**
   - Existing users retain photo_url values
   - Profile photo upload still works

### Manual Testing

1. Sign up with various display names
2. Verify avatar appears in profile
3. Upload custom photo and verify it replaces avatar
4. Check avatar colors are varied across multiple signups

## Deployment Considerations

### File System Requirements

- Write permissions on `static/uploads/profiles/` directory
- Sufficient disk space for avatar images (~10KB per image)

### Dependency Installation

```bash
pip install Pillow>=10.0.0
```

### Database Migration

No database schema changes required. The `photo_url` field already exists in the `users` table.

### Rollback Plan

If issues arise:
1. Remove `generate_initial_avatar()` calls from signup endpoints
2. Users will have NULL photo_url (existing behavior)
3. No data loss or corruption risk

## Security Considerations

1. **Input validation:** Display names are already validated (max 120 chars)
2. **File system safety:** Use `os.makedirs(exist_ok=True)` to prevent race conditions
3. **Filename safety:** Use UUID for unique, unpredictable filenames
4. **No user-controlled paths:** File paths are generated by system, not user input
5. **Error disclosure:** Errors logged server-side, not exposed to client

## Future Enhancements

1. **Async generation:** Move avatar generation to background task for faster response
2. **Custom fonts:** Use custom font for better typography
3. **SVG generation:** Generate SVG instead of PNG for scalability
4. **Color consistency:** Use name-based hashing (like avatar-color.js) instead of random
5. **Avatar regeneration:** Allow users to regenerate avatar with different color

## Correctness Properties

### Property 1: Initials Extraction Consistency
**For all valid display names, the extracted initials must be deterministic and follow the extraction rules.**

```
∀ display_name ∈ ValidDisplayNames:
  extract_initials(display_name) = extract_initials(display_name)
  
Where ValidDisplayNames = {s | s is string, 0 ≤ len(s) ≤ 120}
```

**Validates Requirements:** 1.3, 1.4, 1.5, 1.6

### Property 2: Color Palette Membership
**For all generated avatars, the background color must be a member of the predefined color palette.**

```
∀ avatar ∈ GeneratedAvatars:
  avatar.background_color ∈ AVATAR_COLOR_PALETTE
  
Where AVATAR_COLOR_PALETTE has exactly 20 hex color values
```

**Validates Requirements:** 4.1, 4.3

### Property 3: File Path Validity
**For all successful avatar generations, the returned file path must point to an existing, valid PNG file.**

```
∀ result ∈ SuccessfulGenerations:
  result ≠ None ⟹ 
    (file_exists(result) ∧ 
     is_valid_png(result) ∧
     image_dimensions(result) = (200, 200))
```

**Validates Requirements:** 1.8, 1.10, 6.1, 6.7

### Property 4: Signup Atomicity
**For all signup operations, either both user creation and avatar generation succeed, or the user is created with NULL photo_url.**

```
∀ signup_request ∈ SignupRequests:
  (user_created(signup_request) ∧ avatar_generated(signup_request)) ∨
  (user_created(signup_request) ∧ photo_url(signup_request) = NULL)
```

**Validates Requirements:** 5.3, 5.4, 7.5

### Property 5: Backward Compatibility Preservation
**For all existing users before feature deployment, their photo_url values remain unchanged after deployment.**

```
∀ user ∈ ExistingUsers:
  photo_url_before(user) = photo_url_after(user)
  
Where ExistingUsers = {u | u.created_at < deployment_time}
```

**Validates Requirements:** 3.1, 3.2, 3.3, 3.4

### Property 6: Filename Uniqueness
**For all generated avatar files, the filename must be unique across all users and time.**

```
∀ avatar1, avatar2 ∈ GeneratedAvatars:
  avatar1 ≠ avatar2 ⟹ filename(avatar1) ≠ filename(avatar2)
```

**Validates Requirements:** 6.7, 6.8

### Property 7: Error Resilience
**For all avatar generation failures, the signup process must complete successfully with photo_url set to NULL.**

```
∀ signup_request ∈ SignupRequests:
  avatar_generation_failed(signup_request) ⟹
    (user_created(signup_request) ∧ 
     photo_url(signup_request) = NULL ∧
     error_logged(signup_request))
```

**Validates Requirements:** 5.4, 5.5, 7.2, 7.5

## Requirements Coverage

| Requirement | Design Section | Validated By |
|-------------|----------------|--------------|
| 1.1 | Integration with Signup Endpoints | Property 4 |
| 1.2 | Integration with Signup Endpoints | Property 4 |
| 1.3 | Initial Extraction Logic | Property 1 |
| 1.4 | Initial Extraction Logic | Property 1 |
| 1.5 | Initial Extraction Logic | Property 1 |
| 1.6 | Initial Extraction Logic | Property 1 |
| 1.7 | Color Selection Logic | Property 2 |
| 1.8 | Image Generation Logic | Property 3 |
| 1.9 | Image Generation Logic | Property 3 |
| 1.10 | Image Generation Logic | Property 3 |
| 2.1 | Backward Compatibility | Manual Testing |
| 2.2 | Backward Compatibility | Manual Testing |
| 2.3 | Backward Compatibility | Manual Testing |
| 2.4 | Backward Compatibility | Manual Testing |
| 3.1 | Backward Compatibility | Property 5 |
| 3.2 | Backward Compatibility | Property 5 |
| 3.3 | Backward Compatibility | Property 5 |
| 3.4 | Backward Compatibility | Property 5 |
| 4.1 | Color Selection Logic | Property 2 |
| 4.2 | Color Selection Logic | Unit Tests |
| 4.3 | Color Selection Logic | Property 2 |
| 4.4 | Color Selection Logic | Unit Tests |
| 5.1 | Integration with Signup Endpoints | Integration Tests |
| 5.2 | Integration with Signup Endpoints | Integration Tests |
| 5.3 | Integration with Signup Endpoints | Property 4 |
| 5.4 | Error Handling | Property 7 |
| 5.5 | Error Handling | Property 7 |
| 6.1 | Image Generation Logic | Property 3 |
| 6.2 | Image Generation Logic | Property 3 |
| 6.3 | Image Generation Logic | Property 3 |
| 6.4 | Image Generation Logic | Property 3 |
| 6.5 | Image Generation Logic | Property 3 |
| 6.6 | Image Generation Logic | Property 3 |
| 6.7 | Image Generation Logic | Property 6 |
| 6.8 | Image Generation Logic | Property 6 |
| 7.1 | Image Generation Logic | Property 3 |
| 7.2 | Error Handling | Property 7 |
| 7.3 | Image Generation Logic | Property 3 |
| 7.4 | Error Handling | Property 7 |
| 7.5 | Error Handling | Property 7 |
| 8.1 | Performance Considerations | Manual Testing |
| 8.2 | Performance Considerations | Manual Testing |
| 8.3 | Performance Considerations | Manual Testing |
| 8.4 | Performance Considerations | Integration Tests |

## Conclusion

This design provides a complete, production-ready implementation of initial-based profile pictures. The approach is simple, performant, and maintains backward compatibility with existing functionality. The use of Pillow for image generation is well-established and reliable, and the error handling ensures that signup failures due to avatar generation are prevented.
