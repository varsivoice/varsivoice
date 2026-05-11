import sqlite3

DB_PATH = 'freedom_wall.db'
USER_IDS = [26, 27]

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys=ON")

try:
    c = conn.cursor()
    
    for user_id in USER_IDS:
        print(f"\n--- Deleting user {user_id} and all associated data ---")
        
        # Check if user exists
        user = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            print(f"User {user_id} not found.")
            continue
        
        print(f"User: {user['display_name']} ({user['email']})")
        
        # Get posts by this user
        posts = c.execute("SELECT id FROM posts WHERE user_id = ?", (user_id,)).fetchall()
        post_ids = [p['id'] for p in posts]
        print(f"  Posts to delete: {len(post_ids)}")
        
        # Get comments by this user
        comments = c.execute("SELECT id FROM comments WHERE user_id = ?", (user_id,)).fetchall()
        comment_ids = [c['id'] for c in comments]
        print(f"  Comments to delete: {len(comment_ids)}")
        
        # Delete cascade:
        # 1. Delete reactions on user's posts and comments
        if post_ids:
            placeholders = ",".join(["?"] * len(post_ids))
            c.execute(f"DELETE FROM reactions WHERE target_type = 'post' AND target_id IN ({placeholders})", post_ids)
        
        if comment_ids:
            placeholders = ",".join(["?"] * len(comment_ids))
            c.execute(f"DELETE FROM reactions WHERE target_type = 'comment' AND target_id IN ({placeholders})", comment_ids)
        
        # 2. Delete likes on user's posts
        if post_ids:
            placeholders = ",".join(["?"] * len(post_ids))
            c.execute(f"DELETE FROM likes WHERE post_id IN ({placeholders})", post_ids)
        
        # 3. Delete comments on user's posts
        if post_ids:
            placeholders = ",".join(["?"] * len(post_ids))
            c.execute(f"DELETE FROM comments WHERE post_id IN ({placeholders})", post_ids)
        
        # 4. Delete user's comments
        if comment_ids:
            placeholders = ",".join(["?"] * len(comment_ids))
            c.execute(f"DELETE FROM comments WHERE id IN ({placeholders})", comment_ids)
        
        # 5. Delete notifications involving this user
        c.execute("DELETE FROM notifications WHERE recipient_user_id = ? OR actor_user_id = ?", (user_id, user_id))
        
        # 6. Delete reports by this user
        c.execute("DELETE FROM reports WHERE reporter_user_id = ?", (user_id,))
        
        # 7. Delete warnings issued to this user
        c.execute("DELETE FROM warnings WHERE user_id = ?", (user_id,))
        
        # 8. Delete restrictions on this user
        c.execute("DELETE FROM user_restrictions WHERE user_id = ?", (user_id,))
        
        # 9. Delete admin transfers involving this user
        c.execute("DELETE FROM admin_transfers WHERE from_user_id = ? OR to_user_id = ?", (user_id, user_id))
        
        # 10. Delete user's posts
        if post_ids:
            placeholders = ",".join(["?"] * len(post_ids))
            c.execute(f"DELETE FROM posts WHERE id IN ({placeholders})", post_ids)
        
        # 11. Delete submissions by this user
        c.execute("DELETE FROM submissions WHERE user_id = ?", (user_id,))
        
        # 12. Finally, delete the user
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        print(f"  ✓ User {user_id} and all associated data deleted")
    
    conn.commit()
    print("\n✓ All deletions completed successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"\n✗ Error: {e}")
    raise
finally:
    conn.close()
