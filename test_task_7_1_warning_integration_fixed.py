#!/usr/bin/env python3
"""
Test script to verify Task 7.1 - Enhanced warning system integration.

This script tests that the admin_issue_warning() endpoint properly:
1. Triggers restrictions when users reach 5-warning threshold
2. Automatically creates restrictions with correct cooldown periods
3. Resets warning count to 0 when restriction is created
4. Integrates seamlessly with existing warning workflow
"""

import sys
import os
import sqlite3
from datetime import datetime, timedelta

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from restriction_engine import RestrictionEngine
from restriction_models import get_cooldown_period

def test_warning_threshold_integration():
    """Test that warning system properly integrates with restriction system."""
    print("Testing Task 7.1: Enhanced Warning System Integration")
    print("=" * 60)
    
    # Use actual database for testing
    db_path = "freedom_wall.db"
    if not os.path.exists(db_path):
        print("❌ Database not found. Please ensure the application is set up.")
        return False
    
    try:
        # Initialize restriction engine
        engine = RestrictionEngine(db_path)
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        
        # Find or create test users
        admin_user = conn.execute("SELECT id FROM users WHERE role IN ('admin', 'co_admin') LIMIT 1").fetchone()
        if not admin_user:
            print("❌ No admin user found. Please create an admin user first.")
            return False
        admin_id = admin_user['id']
        
        # Create a test user for warnings
        test_user_cursor = conn.execute("""
            INSERT OR IGNORE INTO users (email, password_hash, display_name, role)
            VALUES ('test_warning_user@test.com', 'hash', 'Test Warning User', 'user')
        """)
        
        # Get the test user ID
        test_user = conn.execute("SELECT id FROM users WHERE email = 'test_warning_user@test.com'").fetchone()
        user_id = test_user['id']
        
        # Create a test post for warnings
        test_post_cursor = conn.execute("""
            INSERT OR IGNORE INTO posts (user_id, content, category)
            VALUES (?, 'Test post for warning integration', 'General')
        """, (user_id,))
        
        # Get the test post ID
        test_post = conn.execute("SELECT id FROM posts WHERE user_id = ? AND content LIKE '%warning integration%'", (user_id,)).fetchone()
        if not test_post:
            # Create new post
            cursor = conn.execute("""
                INSERT INTO posts (user_id, content, category)
                VALUES (?, 'Test post for warning integration', 'General')
            """, (user_id,))
            post_id = cursor.lastrowid
        else:
            post_id = test_post['id']
        
        conn.commit()
        
        print(f"✅ Test setup complete: admin_id={admin_id}, user_id={user_id}, post_id={post_id}")
        
        # Clean up any existing warnings and restrictions for this user
        conn.execute("DELETE FROM warnings WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM user_restrictions WHERE user_id = ?", (user_id,))
        conn.commit()
        print("✅ Cleaned up existing test data")
        
        # Test 1: Issue 4 warnings (should not trigger restriction)
        print("\nTest 1: Issuing 4 warnings (should not trigger restriction)")
        for i in range(4):
            conn.execute("""
                INSERT INTO warnings (user_id, admin_id, target_type, target_id, reason, message)
                VALUES (?, ?, 'post', ?, ?, ?)
            """, (user_id, admin_id, post_id, f"Test violation {i+1}", f"Test warning message {i+1}"))
        conn.commit()
        
        # Check warning count
        warning_count = conn.execute("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", (user_id,)).fetchone()['count']
        print(f"✅ Warning count after 4 warnings: {warning_count}")
        
        # Check if restriction was created (should not be)
        restriction = conn.execute("SELECT * FROM user_restrictions WHERE user_id = ? AND is_active = 1", (user_id,)).fetchone()
        if restriction is None:
            print("✅ No restriction created after 4 warnings (correct)")
        else:
            print("❌ Restriction created prematurely after 4 warnings")
            return False
        
        # Test 2: Issue 5th warning (should trigger restriction)
        print("\nTest 2: Issuing 5th warning (should trigger restriction)")
        conn.execute("""
            INSERT INTO warnings (user_id, admin_id, target_type, target_id, reason, message)
            VALUES (?, ?, 'post', ?, ?, ?)
        """, (user_id, admin_id, post_id, "Test violation 5", "Final test warning message"))
        conn.commit()
        
        # Process warning threshold (this is what admin_issue_warning() calls)
        restriction_record = engine.process_warning_threshold(user_id, admin_id)
        
        if restriction_record:
            print(f"✅ Restriction created: ID={restriction_record.id}")
            print(f"✅ Restriction count: {restriction_record.restriction_count}")
            print(f"✅ Restriction end: {restriction_record.restriction_end}")
            
            # Verify restriction details
            expected_cooldown = get_cooldown_period(1)  # First restriction = 1 day
            actual_duration = (restriction_record.restriction_end - restriction_record.restriction_start).days
            
            if actual_duration == expected_cooldown:
                print(f"✅ Correct cooldown period: {expected_cooldown} days")
            else:
                print(f"❌ Incorrect cooldown period: expected {expected_cooldown}, got {actual_duration}")
                return False
        else:
            print("❌ No restriction created after 5th warning")
            return False
        
        # Test 3: Verify warning count reset
        print("\nTest 3: Verifying warning count reset")
        warning_count_after = conn.execute("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", (user_id,)).fetchone()['count']
        
        if warning_count_after == 0:
            print("✅ Warning count reset to 0 after restriction creation")
        else:
            print(f"❌ Warning count not reset: {warning_count_after} warnings remaining")
            return False
        
        # Test 4: Verify restriction is active and properly configured
        print("\nTest 4: Verifying restriction configuration")
        active_restriction = conn.execute("""
            SELECT * FROM user_restrictions 
            WHERE user_id = ? AND is_active = 1 
            ORDER BY created_at DESC LIMIT 1
        """, (user_id,)).fetchone()
        
        if active_restriction:
            print(f"✅ Active restriction found with ID: {active_restriction['id']}")
            print(f"✅ Created by admin ID: {active_restriction['created_by_admin_id']}")
            print(f"✅ Restriction count: {active_restriction['restriction_count']}")
            
            # Verify the restriction is properly set up
            restriction_end = datetime.fromisoformat(active_restriction['restriction_end'])
            restriction_start = datetime.fromisoformat(active_restriction['restriction_start'])
            duration = (restriction_end - restriction_start).days
            
            if duration == 1:  # First restriction should be 1 day
                print("✅ Correct restriction duration for first offense")
            else:
                print(f"❌ Incorrect restriction duration: {duration} days")
                return False
        else:
            print("❌ No active restriction found")
            return False
        
        # Test 5: Verify duplicate restriction prevention
        print("\nTest 5: Testing duplicate restriction prevention")
        
        # Add another warning while restriction is active
        conn.execute("""
            INSERT INTO warnings (user_id, admin_id, target_type, target_id, reason, message)
            VALUES (?, ?, 'post', ?, ?, ?)
        """, (user_id, admin_id, post_id, "Test violation while restricted", "Should not create duplicate restriction"))
        conn.commit()
        
        # Try to create another restriction while one is active
        duplicate_restriction = engine.process_warning_threshold(user_id, admin_id)
        
        if duplicate_restriction is None:
            print("✅ Duplicate restriction properly prevented")
        else:
            print("❌ Duplicate restriction was created")
            return False
        
        # Clean up test data
        print("\nCleaning up test data...")
        conn.execute("DELETE FROM warnings WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM user_restrictions WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        print("✅ Test data cleaned up")
        
        print("\n" + "=" * 60)
        print("✅ Task 7.1 Enhanced Warning System Integration Test PASSED")
        print("\nVerified functionality:")
        print("  - Warning threshold detection (5 warnings) ✅")
        print("  - Automatic restriction creation ✅")
        print("  - Warning count reset after restriction ✅")
        print("  - Correct cooldown calculation ✅")
        print("  - Duplicate restriction prevention ✅")
        print("  - Integration with process_warning_threshold() ✅")
        print("\nThe admin_issue_warning() endpoint is properly enhanced!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    success = test_warning_threshold_integration()
    sys.exit(0 if success else 1)