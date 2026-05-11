# Bugfix Requirements Document

## Introduction

Posts on the Freedom Wall feed do not load when a user first visits the wall page. The feed remains empty until the current user submits a new post, at which point posts appear. This is caused by a JavaScript `ReferenceError` in `wall.js`: the variable `sortEl` is referenced but never defined (it refers to a `<select>` element that no longer exists in the HTML — the UI was updated to use a filter button/menu instead). The error crashes the script's initialization sequence before the initial `loadPosts()` call at the bottom of the file executes. The post submission handler calls `loadPosts()` directly and runs before the crash point, which is why posting "fixes" the feed temporarily.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a logged-in user navigates to the wall page THEN the system fails to load and display existing posts, leaving the feed empty

1.2 WHEN the wall page script initializes THEN the system throws a `ReferenceError` for the undefined variable `sortEl`, halting script execution before the initial `loadPosts()` call runs

1.3 WHEN a user applies a sort filter via the filter menu THEN the system throws a `ReferenceError` for `sortEl` and fails to reload the feed with the selected sort order

### Expected Behavior (Correct)

2.1 WHEN a logged-in user navigates to the wall page THEN the system SHALL load and display all existing posts in the feed on page load

2.2 WHEN the wall page script initializes THEN the system SHALL complete initialization without errors and SHALL call `loadPosts()` to populate the feed

2.3 WHEN a user applies a sort filter via the filter menu THEN the system SHALL reload the feed with posts ordered by the selected sort option

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a logged-in user submits a new post THEN the system SHALL CONTINUE TO save the post and refresh the feed displaying the new post

3.2 WHEN a logged-in user applies a search query THEN the system SHALL CONTINUE TO filter and display matching posts in the feed

3.3 WHEN a logged-in user is not authenticated (no session) THEN the system SHALL CONTINUE TO redirect to the login page

3.4 WHEN a logged-in user reacts to a post or comment THEN the system SHALL CONTINUE TO record the reaction and update the reaction display

3.5 WHEN a logged-in user adds or deletes a comment THEN the system SHALL CONTINUE TO update the comment count and comment list on the post

---

## Bug Condition

**Bug Condition Function:**

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type PageLoadEvent or FilterChangeEvent
  OUTPUT: boolean

  // Returns true when the page initializes or a filter is changed,
  // triggering the code path that references the undefined `sortEl` variable
  RETURN X is a wall page load OR X is a filter menu sort selection
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← initializeWallPage'(X)
  ASSERT no_reference_error(result)
    AND feed_is_populated(result)
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
