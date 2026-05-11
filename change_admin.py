import sqlite3

DB_PATH = 'freedom_wall.db'

# Users to update
OLD_ADMIN_EMAIL = 'fullerinefullerinefullerine@gmail.com'
NEW_ADMIN_EMAIL = 'varsivoice@gmail.com'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

try:
    # Find old admin
    old_admin = c.execute("SELECT id, display_name, role FROM users WHERE email = ?", (OLD_ADMIN_EMAIL,)).fetchone()
    if not old_admin:
        print(f"❌ Old admin with email {OLD_ADMIN_EMAIL} not found")
        conn.close()
        exit(1)
    
    print(f"Found old admin: {old_admin['display_name']} (ID: {old_admin['id']}, Role: {old_admin['role']})")
    
    # Find new admin
    new_admin = c.execute("SELECT id, display_name, role FROM users WHERE email = ?", (NEW_ADMIN_EMAIL,)).fetchone()
    if not new_admin:
        print(f"❌ New admin with email {NEW_ADMIN_EMAIL} not found")
        conn.close()
        exit(1)
    
    print(f"Found new admin: {new_admin['display_name']} (ID: {new_admin['id']}, Role: {new_admin['role']})")
    
    # Update roles
    print("\n--- Updating roles ---")
    
    # Remove admin from old admin
    c.execute("UPDATE users SET role = 'user' WHERE email = ?", (OLD_ADMIN_EMAIL,))
    print(f"✓ Changed {old_admin['display_name']} role from {old_admin['role']} to 'user'")
    
    # Make new admin the main admin
    c.execute("UPDATE users SET role = 'main_admin' WHERE email = ?", (NEW_ADMIN_EMAIL,))
    print(f"✓ Changed {new_admin['display_name']} role from {new_admin['role']} to 'main_admin'")
    
    conn.commit()
    print("\n✓ Admin roles updated successfully!")
    
    # Verify changes
    print("\n--- Verification ---")
    old_admin_updated = c.execute("SELECT role FROM users WHERE email = ?", (OLD_ADMIN_EMAIL,)).fetchone()
    new_admin_updated = c.execute("SELECT role FROM users WHERE email = ?", (NEW_ADMIN_EMAIL,)).fetchone()
    
    print(f"{old_admin['display_name']}: {old_admin_updated['role']}")
    print(f"{new_admin['display_name']}: {new_admin_updated['role']}")
    
except Exception as e:
    conn.rollback()
    print(f"❌ Error: {e}")
    raise
finally:
    conn.close()
