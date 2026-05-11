# UI and Functionality Fixes Bugfix Design

## Overview

This design addresses six distinct UI and functionality bugs in the Freedom Wall application. The bugs span comment styling, trending posts display logic, user profile initialization, button positioning, and page refresh behavior. The fixes are targeted and minimal, ensuring that existing functionality remains unchanged while correcting the identified defects.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each specific bug
- **Property (P)**: The desired behavior when the bug condition is met
- **Preservation**: Existing functionality that must remain unchanged by the fixes
- **comment**: A user-generated reply to a post, displayed in `.comment` elements
- **trending posts**: Posts sorted by reaction count, displayed in the sidebar `#trending-list`
- **refreshProfileUI**: Function in `wall.js` that updates header avatar and profile display
- **loadPosts**: Function that fetches and renders posts from the API
- **loadTrending**: Function that fetches and renders trending posts in the sidebar

## Bug Details

### Bug 1: Comments Font Issue

#### Bug Condition

The bug manifests when a user views comments on any post. The `.comment` CSS class does not explicitly set a font-family, causing comments to inherit an unintended monospace or system font instead of the application's main font.

**Formal Specification:**
```
FUNCTION isBugCondition_CommentFont(element)
  INPUT: element of type HTMLElement
  OUTPUT: boolean
  
  RETURN element.classList.contains('comment')
         AND element.style.fontFamily NOT IN ['var(--font-serif)', 'var(--font-sans)', 'Times New Roman', 'DM Sans']
         AND commentDisplaysInWrongFont(element)
END FUNCTION
```

**Examples:**
- User views a comment on a post → Comment text displays in monospace font instead of DM Sans
- User views a reply to a comment → Reply text displays in monospace font instead of Times New Roman/DM Sans
- User views comments in dark mode → Comments still display in wrong font

### Bug 2: Trending Posts Display Bug

#### Bug Condition

The bug manifests when a user reacts to the most trending post AND another reaction is added to that same post. The `loadTrending` function re-renders the trending list, but a logic error causes other trending posts to disappear from the sidebar.

**Formal Specification:**
```
FUNCTION isBugCondition_TrendingDisplay(state)
  INPUT: state of type { topPost: Post, otherPosts: Post[], reactionAdded: boolean }
  OUTPUT: boolean
  
  RETURN state.reactionAdded === true
         AND state.topPost.like_count > state.otherPosts[0].like_count
         AND trendingListShowsOnlyTopPost()
         AND state.otherPosts.length > 0
END FUNCTION
```

**Examples:**
- Top post has 10 reactions, second post has 5 reactions → User adds reaction to top post → Second post disappears from trending list
- Top post has 20 reactions, posts 2-3 have 8 reactions → User adds reaction to top post → Posts 2-3 disappear
- Top post has 4 reactions, second post has 2 reactions (2x ratio) → Trending list shows only top post instead of top 3

### Bug 3: User Profile Missing

#### Bug Condition

The bug manifests when a user navigates to the Writers Hub page OR the Freedom Wall page. The `writers.js` and `freedom_wall.js` files do not call `refreshProfileUI()` or equivalent profile initialization logic, causing the header avatar and profile information to not display.

**Formal Specification:**
```
FUNCTION isBugCondition_ProfileMissing(page)
  INPUT: page of type { url: string, jsFile: string }
  OUTPUT: boolean
  
  RETURN (page.url === '/writers' OR page.url === '/freedom-wall')
         AND NOT profileInitializationCalled(page.jsFile)
         AND headerAvatarNotDisplayed()
END FUNCTION
```

**Examples:**
- User navigates to `/writers` → Header avatar is blank/missing, no profile name displayed
- User navigates to `/freedom-wall` → Header avatar is blank/missing, no profile name displayed
- User navigates to `/wall` → Profile displays correctly (baseline comparison)

### Bug 4: Add Image Button Positioning

#### Bug Condition

The bug manifests when a user views the post composer interface on the `/wall` page. The "add image" button (`#post-image-btn`) is styled with `text-align: center` or lacks proper inline/flex positioning, causing it to appear centered instead of positioned next to the "rant" button with minimal spacing.

**Formal Specification:**
```
FUNCTION isBugCondition_ButtonPosition(composerUI)
  INPUT: composerUI of type { imageButton: HTMLElement, categorySelect: HTMLElement }
  OUTPUT: boolean
  
  RETURN composerUI.imageButton.style.textAlign === 'center'
         OR composerUI.imageButton.style.display === 'block'
         OR NOT isHorizontallyAlignedWith(composerUI.imageButton, composerUI.categorySelect)
         OR hasExcessiveSpacing(composerUI.imageButton, composerUI.categorySelect)
END FUNCTION
```

**Examples:**
- User opens post composer → "📎 Image" button appears centered below category dropdown instead of next to it
- User opens post composer → Large gap exists between category dropdown and image button
- User opens post composer in mobile view → Button positioning may be acceptable (responsive design)

### Bug 5: Home Button Refresh Behavior

#### Bug Condition

The bug manifests when a user clicks the home button (`/wall` link) while already on the home wall page. The page does not refresh or randomize posts, and no end-of-content indicator is displayed when the user reaches the end of the feed.

**Formal Specification:**
```
FUNCTION isBugCondition_HomeRefresh(navigation)
  INPUT: navigation of type { currentPage: string, targetPage: string, clickEvent: Event }
  OUTPUT: boolean
  
  RETURN navigation.currentPage === '/wall'
         AND navigation.targetPage === '/wall'
         AND NOT postsRefreshedOnClick()
         AND NOT endOfContentIndicatorDisplayed()
END FUNCTION
```

**Examples:**
- User is on `/wall` → Clicks "🏠 Home" link → Page does not refresh, posts remain in same order
- User scrolls to end of posts on `/wall` → No "that's the only posts" message displayed
- User is on `/wall` → New posts exist → Clicks home → New posts not mixed with existing posts

### Bug 6: Freedom Wall Refresh Behavior

#### Bug Condition

The bug manifests when a user clicks the Freedom Wall button (`/freedom-wall` link) while already on the Freedom Wall page. The page does not refresh or randomize posts, and no end-of-content indicator is displayed when the user reaches the end of the feed.

**Formal Specification:**
```
FUNCTION isBugCondition_FreedomWallRefresh(navigation)
  INPUT: navigation of type { currentPage: string, targetPage: string, clickEvent: Event }
  OUTPUT: boolean
  
  RETURN navigation.currentPage === '/freedom-wall'
         AND navigation.targetPage === '/freedom-wall'
         AND NOT postsRefreshedOnClick()
         AND NOT endOfContentIndicatorDisplayed()
END FUNCTION
```

**Examples:**
- User is on `/freedom-wall` → Clicks "🗒️ Freedom Wall" link → Page does not refresh, posts remain in same order
- User scrolls to end of posts on `/freedom-wall` → No "that's the only posts" message displayed
- User is on `/freedom-wall` → New posts exist → Clicks Freedom Wall → New posts not mixed with existing posts

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

**Bug 1 - Comments Font:**
- Post content font styling must remain unchanged
- Other UI elements (headers, buttons, labels) must retain their current fonts
- Comment background colors and borders must remain unchanged

**Bug 2 - Trending Posts:**
- Reaction functionality on non-trending posts must continue to work
- Initial trending posts load must display correct posts based on reaction counts
- Trending post click behavior must remain unchanged

**Bug 3 - User Profile:**
- Home Wall (`/wall`) profile display must continue to work as it currently does
- Profile updates must continue to reflect across all pages where profile is displayed
- Avatar click behavior (navigation to profile page) must remain unchanged

**Bug 4 - Button Positioning:**
- Image button click functionality (opening file picker) must remain unchanged
- Image attachment to posts must continue to work
- Other composer UI elements must retain their current positioning

**Bug 5 - Home Button:**
- Navigation to home from other pages must continue to load posts in default order
- Filter and search functionality must continue to work correctly
- Post creation must continue to add posts to the feed

**Bug 6 - Freedom Wall Button:**
- Navigation to Freedom Wall from other pages must continue to load posts in default order
- Filter and search functionality must continue to work correctly
- Post creation must continue to add posts to the feed

**Scope:**
All inputs and interactions that do NOT involve the specific bug conditions should be completely unaffected by these fixes.

## Hypothesized Root Cause

Based on the bug descriptions and code analysis, the most likely issues are:

### Bug 1: Comments Font Issue
1. **Missing Font Declaration**: The `.comment` CSS class does not explicitly set `font-family`, causing inheritance from parent or browser default
2. **CSS Specificity Issue**: A more specific selector may be overriding the intended font
3. **Dark Mode Override**: The `[data-theme="dark"] .comment` selector may not include font-family

### Bug 2: Trending Posts Display Bug
1. **Incorrect Filtering Logic**: The `loadTrending` function filters posts with reactions, then applies a 2x ratio check that incorrectly limits display to 1 post
2. **Slice Logic Error**: The `showCount` variable is set to 1 when top post has 2x more reactions than second, but this should only apply when the ratio is significantly higher
3. **Array Slicing Issue**: The `display.slice(0, showCount)` may be slicing incorrectly when `showCount` is 1

### Bug 3: User Profile Missing
1. **Missing Initialization Call**: `writers.js` and `freedom_wall.js` do not call `refreshProfileUI()` or equivalent function on page load
2. **Session Data Not Applied**: The session data is loaded but not applied to the header avatar elements
3. **DOM Element Not Found**: The header avatar elements may not be present in the HTML templates for these pages

### Bug 4: Add Image Button Positioning
1. **CSS Display Property**: The button may have `display: block` instead of `display: inline-block` or `display: inline-flex`
2. **Flexbox Layout Missing**: The parent container may not use flexbox layout to align children horizontally
3. **Margin/Padding Issue**: Excessive margin or padding may be pushing the button away from the category select

### Bug 5 & 6: Refresh Behavior
1. **No Click Handler**: The home/Freedom Wall links do not have click event listeners to detect same-page navigation
2. **No Randomization Logic**: The `loadPosts` function does not randomize post order
3. **No End Indicator**: The feed rendering logic does not check if all posts have been displayed and show an end message

## Correctness Properties

Property 1: Bug Condition - Comments Display in Application Font

_For any_ comment element displayed on the page, the fixed CSS SHALL apply the application's main font (DM Sans or Times New Roman) to ensure consistent typography across all comment text.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Trending Posts Display All Qualifying Posts

_For any_ state where the top trending post receives a new reaction, the fixed `loadTrending` function SHALL continue to display all other trending posts (up to 3 total) in the sidebar without causing them to disappear.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Profile Displays on Writers Hub

_For any_ navigation to the Writers Hub page (`/writers`), the fixed `writers.js` SHALL initialize and display the user's profile information including name and avatar in the header.

**Validates: Requirements 2.3**

Property 4: Bug Condition - Profile Displays on Freedom Wall

_For any_ navigation to the Freedom Wall page (`/freedom-wall`), the fixed `freedom_wall.js` SHALL initialize and display the user's profile information including name and avatar in the header.

**Validates: Requirements 2.4**

Property 5: Bug Condition - Image Button Positioned Next to Category

_For any_ display of the post composer interface, the fixed CSS SHALL position the "add image" button horizontally next to the category dropdown with minimal spacing, forming a cohesive button group.

**Validates: Requirements 2.5, 2.6**

Property 6: Bug Condition - Home Button Refreshes Posts

_For any_ click on the home button while already on the home wall page, the fixed navigation handler SHALL refresh and randomize the order of posts, mixing new posts with existing posts at the top.

**Validates: Requirements 2.7, 2.8**

Property 7: Bug Condition - Home Wall End Indicator

_For any_ state where the user has scrolled to the end of all posts on the home wall, the fixed feed rendering logic SHALL display a message "that's the only posts" or similar end-of-content indicator.

**Validates: Requirements 2.9**

Property 8: Bug Condition - Freedom Wall Button Refreshes Posts

_For any_ click on the Freedom Wall button while already on the Freedom Wall page, the fixed navigation handler SHALL refresh and randomize the order of posts, mixing new posts with existing posts at the top.

**Validates: Requirements 2.10, 2.11**

Property 9: Bug Condition - Freedom Wall End Indicator

_For any_ state where the user has scrolled to the end of all posts on the Freedom Wall, the fixed feed rendering logic SHALL display a message "that's the only posts" or similar end-of-content indicator.

**Validates: Requirements 2.12**

Property 10: Preservation - Non-Comment Font Styling

_For any_ UI element that is NOT a comment (posts, headers, buttons, labels), the fixed code SHALL produce exactly the same font styling as the original code, preserving all existing typography.

**Validates: Requirements 3.1, 3.2**

Property 11: Preservation - Non-Trending Post Reactions

_For any_ reaction added to a non-trending post, the fixed code SHALL update reaction counts without affecting the trending posts display, preserving existing reaction functionality.

**Validates: Requirements 3.3, 3.4**

Property 12: Preservation - Home Wall Profile Display

_For any_ navigation to or interaction with the Home Wall page, the fixed code SHALL continue to display the user's profile information exactly as it currently does, preserving existing profile functionality.

**Validates: Requirements 3.5, 3.6**

Property 13: Preservation - Image Button Functionality

_For any_ click on the "add image" button or image attachment operation, the fixed code SHALL continue to open the file picker and attach images to posts exactly as it currently does.

**Validates: Requirements 3.7, 3.8**

Property 14: Preservation - Navigation and Filtering

_For any_ navigation from other pages, filter application, search operation, or post creation, the fixed code SHALL continue to function exactly as it currently does on both Home Wall and Freedom Wall pages.

**Validates: Requirements 3.9, 3.10, 3.11, 3.12, 3.13**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Bug 1: Comments Font Issue

**File**: `static/css/style.css`

**Location**: `.comment` class definition (around line 827)

**Specific Changes**:
1. **Add Font Family Declaration**: Add `font-family: var(--font-sans);` to the `.comment` class
   - This ensures comments use DM Sans, matching the application's body font
   - Alternative: Use `font-family: var(--font-serif);` if comments should match post content

2. **Verify Dark Mode**: Ensure `[data-theme="dark"] .comment` also inherits or explicitly sets the font
   - The dark mode selector at line 2215 should not override the font-family

**CSS Change**:
```css
.comment {
  background: #f8f6f4;
  border-radius: var(--radius-md);
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-family: var(--font-sans); /* ADD THIS LINE */
}
```

#### Bug 2: Trending Posts Display Bug

**File**: `static/js/wall.js`

**Function**: `loadTrending` (around line 398)

**Specific Changes**:
1. **Fix Ratio Logic**: Change the 2x ratio check to be more lenient or remove it entirely
   - Current logic: `if (second > 0 && top >= second * 2) showCount = 1;`
   - Fixed logic: Remove this check or increase threshold to 3x or 4x
   - Rationale: A 2x ratio is too aggressive and hides posts that are still trending

2. **Alternative Fix**: Always show top 3 posts with reactions, regardless of ratio
   - Simplify logic to: `var display = withReactions.slice(0, 3);`
   - This ensures consistent display of trending posts

**JavaScript Change**:
```javascript
// BEFORE (lines 410-415):
var showCount = 3;
if (withReactions.length >= 2) {
  var top = withReactions[0].like_count || 0;
  var second = withReactions[1].like_count || 0;
  if (second > 0 && top >= second * 2) showCount = 1;
}

// AFTER (remove the ratio check):
var showCount = 3;
// Always show top 3 posts with reactions
```

#### Bug 3: User Profile Missing

**File 1**: `static/js/writers.js`

**Location**: End of initialization code (after line 600)

**Specific Changes**:
1. **Add Profile Initialization**: Call a function to set header avatar and profile name
   - Similar to `refreshProfileUI()` in `wall.js`
   - Set `#header-avatar` src to `currentUser.photo_url`
   - Set `#header-avatar-link` href to `/profile/{user_id}`

**JavaScript Addition**:
```javascript
// Add after line 600 (after loadMine() and loadFeed() calls):
// Initialize header profile display
var headerAvatar = document.getElementById("header-avatar");
var headerAvatarLink = document.getElementById("header-avatar-link");
if (headerAvatarLink) {
  headerAvatarLink.href = "/profile/" + currentUser.user_id;
}
if (headerAvatar && currentUser.photo_url) {
  headerAvatar.src = currentUser.photo_url;
} else if (headerAvatar) {
  headerAvatar.classList.add("no-image");
}
```

**File 2**: `static/js/freedom_wall.js`

**Location**: End of initialization code (after line 900)

**Specific Changes**:
1. **Add Profile Initialization**: Same as writers.js
   - Set `#header-avatar` src to `currentUser.photo_url`
   - Set `#header-avatar-link` href to `/profile/{user_id}`

**JavaScript Addition**:
```javascript
// Add after initialization code (similar to writers.js):
var headerAvatar = document.getElementById("header-avatar");
var headerAvatarLink = document.getElementById("header-avatar-link");
if (headerAvatarLink) {
  headerAvatarLink.href = "/profile/" + currentUser.user_id;
}
if (headerAvatar && currentUser.photo_url) {
  headerAvatar.src = currentUser.photo_url;
} else if (headerAvatar) {
  headerAvatar.classList.add("no-image");
}
```

#### Bug 4: Add Image Button Positioning

**File**: `static/css/style.css`

**Location**: `.composer-meta-row` class or button-specific styles

**Specific Changes**:
1. **Ensure Flexbox Layout**: Verify `.composer-meta-row` uses `display: flex` with `align-items: center`
   - This should already be set (line 697)

2. **Fix Button Display**: Ensure `#post-image-btn` or `.btn-sm` uses `display: inline-flex` or `display: inline-block`
   - Remove any `text-align: center` or `display: block` that causes centering

3. **Adjust Spacing**: Reduce margin/padding between category select and image button
   - Set consistent gap using flexbox `gap` property or minimal margin

**CSS Change**:
```css
/* Ensure composer meta row uses flexbox */
.composer-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem; /* Ensure consistent spacing */
}

/* Ensure button displays inline */
.btn-sm,
#post-image-btn {
  display: inline-flex; /* or inline-block */
  align-items: center;
  /* Remove any text-align: center or display: block */
}
```

#### Bug 5: Home Button Refresh Behavior

**File**: `static/js/wall.js`

**Location**: Initialization code and `loadPosts` function

**Specific Changes**:
1. **Add Click Handler**: Add event listener to home link (`a[href="/wall"]`) to detect same-page clicks
   - Check if `window.location.pathname === '/wall'`
   - If true, call `loadPosts()` to refresh

2. **Add Randomization**: Modify `loadPosts` to optionally randomize post order
   - Add a parameter `randomize` to `loadPosts`
   - If true, shuffle the posts array before rendering

3. **Add End Indicator**: After rendering posts, check if feed is empty or at end
   - If `posts.length === 0` or all posts rendered, append end message

**JavaScript Changes**:
```javascript
// Add click handler for home link (in initialization):
var homeLink = document.querySelector('a[href="/wall"]');
if (homeLink) {
  homeLink.addEventListener('click', function(e) {
    if (window.location.pathname === '/wall') {
      e.preventDefault();
      loadPosts(true); // Pass true to randomize
    }
  });
}

// Modify loadPosts to accept randomize parameter:
function loadPosts(randomize) {
  // ... existing code ...
  .then(function (posts) {
    if (randomize && posts.length > 0) {
      // Shuffle posts array
      for (var i = posts.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = posts[i];
        posts[i] = posts[j];
        posts[j] = temp;
      }
    }
    statusEl.textContent = posts.length ? "" : "No posts yet. Write the first one above.";
    feedEl.innerHTML = "";
    posts.forEach(function (p) {
      feedEl.appendChild(renderPostShell(p, s));
    });
    // Add end indicator
    if (posts.length > 0) {
      var endMsg = document.createElement('p');
      endMsg.className = 'status-msg';
      endMsg.textContent = "that's the only posts";
      feedEl.appendChild(endMsg);
    }
    return posts;
  })
  // ... rest of code ...
}
```

#### Bug 6: Freedom Wall Refresh Behavior

**File**: `static/js/freedom_wall.js`

**Location**: Initialization code and `loadPosts` function

**Specific Changes**:
1. **Add Click Handler**: Same as Bug 5, but for Freedom Wall link (`a[href="/freedom-wall"]`)
   - Check if `window.location.pathname === '/freedom-wall'`
   - If true, call `loadPosts()` to refresh

2. **Add Randomization**: Same as Bug 5
   - Add `randomize` parameter to `loadPosts`
   - Shuffle posts array if `randomize` is true

3. **Add End Indicator**: Same as Bug 5
   - Append "that's the only posts" message after rendering

**JavaScript Changes**:
```javascript
// Add click handler for Freedom Wall link (in initialization):
var fwLink = document.querySelector('a[href="/freedom-wall"]');
if (fwLink) {
  fwLink.addEventListener('click', function(e) {
    if (window.location.pathname === '/freedom-wall') {
      e.preventDefault();
      loadPosts(searchEl.value.trim(), true); // Pass true to randomize
    }
  });
}

// Modify loadPosts to accept randomize parameter:
function loadPosts(q, randomize) {
  // ... existing code ...
  .then(function (posts) {
    if (randomize && posts.length > 0) {
      // Shuffle posts array
      for (var i = posts.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = posts[i];
        posts[i] = posts[j];
        posts[j] = temp;
      }
    }
    allPosts = posts;
    statusEl.textContent = posts.length ? "" : "No posts yet.";
    renderGrid(posts, q);
    // Add end indicator
    if (posts.length > 0) {
      var endMsg = document.createElement('p');
      endMsg.className = 'fw-status-msg';
      endMsg.textContent = "that's the only posts";
      gridEl.appendChild(endMsg);
    }
  })
  // ... rest of code ...
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate each bug condition and assert that the defective behavior occurs. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:

1. **Bug 1 - Comments Font Test**: Render a comment element and check computed font-family (will fail on unfixed code)
2. **Bug 2 - Trending Display Test**: Add reaction to top post and verify other posts remain visible (will fail on unfixed code)
3. **Bug 3 - Writers Profile Test**: Navigate to `/writers` and check if header avatar is populated (will fail on unfixed code)
4. **Bug 3 - Freedom Wall Profile Test**: Navigate to `/freedom-wall` and check if header avatar is populated (will fail on unfixed code)
5. **Bug 4 - Button Position Test**: Render composer and measure button positions (will fail on unfixed code)
6. **Bug 5 - Home Refresh Test**: Click home link while on `/wall` and verify posts refresh (will fail on unfixed code)
7. **Bug 6 - Freedom Wall Refresh Test**: Click Freedom Wall link while on `/freedom-wall` and verify posts refresh (will fail on unfixed code)

**Expected Counterexamples**:
- Comments display in monospace or system font instead of DM Sans
- Trending posts disappear when top post receives reactions
- Header avatar is blank on Writers Hub and Freedom Wall pages
- Image button appears centered instead of next to category dropdown
- Home/Freedom Wall links do not refresh posts on same-page clicks
- No end-of-content indicator displayed at end of feeds

### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR EACH bug IN [Bug1, Bug2, Bug3, Bug4, Bug5, Bug6] DO
  FOR ALL input WHERE isBugCondition_bug(input) DO
    result := fixedCode_bug(input)
    ASSERT expectedBehavior_bug(result)
  END FOR
END FOR
```

**Test Cases**:
1. **Bug 1 Fix**: Verify comments display in DM Sans font
2. **Bug 2 Fix**: Verify trending posts remain visible after reactions
3. **Bug 3 Fix**: Verify profile displays on Writers Hub and Freedom Wall
4. **Bug 4 Fix**: Verify image button is positioned next to category dropdown
5. **Bug 5 Fix**: Verify home link refreshes posts on same-page click
6. **Bug 6 Fix**: Verify Freedom Wall link refreshes posts on same-page click

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR EACH bug IN [Bug1, Bug2, Bug3, Bug4, Bug5, Bug6] DO
  FOR ALL input WHERE NOT isBugCondition_bug(input) DO
    ASSERT originalCode_bug(input) = fixedCode_bug(input)
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-bug inputs, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Bug 1 Preservation**: Verify post content, headers, buttons retain their fonts
2. **Bug 2 Preservation**: Verify reactions on non-trending posts work correctly
3. **Bug 3 Preservation**: Verify Home Wall profile display continues to work
4. **Bug 4 Preservation**: Verify image button functionality (file picker, attachment) works
5. **Bug 5 Preservation**: Verify navigation from other pages, filters, search work on Home Wall
6. **Bug 6 Preservation**: Verify navigation from other pages, filters, search work on Freedom Wall

### Unit Tests

- Test CSS font-family application to `.comment` elements
- Test `loadTrending` function with various reaction count scenarios
- Test profile initialization on Writers Hub and Freedom Wall pages
- Test button positioning in composer UI
- Test click handlers for home and Freedom Wall links
- Test post randomization logic
- Test end-of-content indicator display

### Property-Based Tests

- Generate random comment content and verify font displays correctly across all comments
- Generate random reaction patterns and verify trending posts always display correctly
- Generate random user sessions and verify profile displays on all pages
- Generate random post sets and verify refresh behavior works consistently
- Test that all non-buggy UI elements continue to work across many scenarios

### Integration Tests

- Test full user flow: navigate to Writers Hub → verify profile → create submission
- Test full user flow: navigate to Freedom Wall → verify profile → create post → add reaction
- Test full user flow: navigate to Home Wall → create post → add image → verify button position
- Test full user flow: click home link multiple times → verify posts refresh and randomize
- Test full user flow: scroll to end of feed → verify end indicator displays
- Test that visual feedback occurs correctly for all fixed bugs
