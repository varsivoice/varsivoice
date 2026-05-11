#!/usr/bin/env python3
"""
Complete test script for Task 3: Implement restriction lifecycle management

This script tests the complete restriction lifecycle management system:
- Task 3.1: Create restriction creation and activation logic
- Task 3.2: Implement automatic restriction expiration

Requirements: 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1
"""

import os
import sqlite3
import tempfile
from datetime import datetime, timedelta
from restriction_engine import RestrictionEngine
from restriction_models import RestrictionRecord, RestrictionStatus

def setup_test_db():
    """Create a temporary test database with required tables."""
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    # Create required tables
    conn.executescript("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        );
        
        CREATE TABLE warnings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            admin_id INTEGER NOT NULL,
            target_type TEXT NOT NULL,
            target_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            message TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE user_restrictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            restriction_start TEXT NOT NULL DEFAULT (datetime('now')),
            restriction_end TEXT NOT NULL,
            restriction_count INTEGER NOT NULL DEFAULT 1,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_by_admin_id INTEGER NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            deactivated_at TEXT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
        );
        
        CREATE INDEX idx_user_restrictions_active ON user_restrictions(user_id, is_active);
        CREATE INDEX idx_user_restrictions_end ON user_restrictions(restriction_end);
    """)
    
    # Insert test users
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (1, 'user1@test.com', 'Test User 1', 'user')")
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (2, 'user2@test.com', 'Test User 2', 'user')")
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (3, 'user3@test.com', 'Test User 3', 'user')")
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (100, 'admin@test.com', 'Admin User', 'admin')")
    
    conn.commit()
    conn.close()
    
    return db_path

def cleanup_db(db_path):
    """Safely cleanup database file."""
    try:
        os.unlink(db_path)
    except (PermissionError, FileNotFoundError):
        pass  # Ignore file cleanup errors on Windows

def test_complete_restriction_lifecycle():
    """Test the complete restriction lifecycle from creation to expiration."""
    print("Testing complete restriction lifecycle...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Step 1: Add 5 warnings for user 1
        for i in range(5):
            conn.execute(
                "INSERT INTO warnings (user_id, admin_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)",
                (1, 100, 'post', 1, f'Test warning {i+1}')
            )
        conn.commit()
        conn.close()
        
        # Verify user has 5 warnings
        assert engine.check_warning_threshold(user_id=1) == True, "User should have reached warning threshold"
        print("✓ User has reached 5-warning threshold")
        
        # Step 2: Create restriction (should reset warnings)
        restriction = engine.create_restriction(user_id=1, admin_id=100)
        
        # Verify restriction was created correctly
        assert isinstance(restriction, RestrictionRecord), "Should return RestrictionRecord"
        assert restriction.user_id == 1, "Should have correct user_id"
        assert restriction.is_active == True, "Should be active"
        assert restriction.restriction_count == 1, "Should be first restriction"
        print("✓ Restriction created successfully")
        
        # Verify warning count was reset
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        warning_count = conn.execute("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", (1,)).fetchone()['count']
        conn.close()
        assert warning_count == 0, f"Expected 0 warnings after restriction, got {warning_count}"
        print("✓ Warning count reset to 0 after restriction")
        
        # Step 3: Test real-time restriction checking
        assert engine.is_user_restricted(user_id=1) == True, "User should be restricted"
        assert engine.is_user_restricted(user_id=2) == False, "Other user should not be restricted"
        print("✓ Real-time restriction checking works")
        
        # Step 4: Test restriction details
        details = engine.get_restriction_details(user_id=1)
        assert details is not None, "Should return restriction details"
        assert details.user_id == 1, "Should have correct user_id"
        assert details.remaining_time is not None, "Should have remaining time"
        assert details.remaining_time.total_seconds() > 0, "Remaining time should be positive"
        print("✓ Restriction details provide correct information")
        
        # Step 5: Test restriction status
        status = engine.get_restriction_status(user_id=1)
        assert status.is_restricted == True, "Status should show user is restricted"
        assert status.restriction_end is not None, "Should have restriction end time"
        assert status.remaining_time is not None, "Should have remaining time"
        print("✓ Restriction status provides correct information")
        
        # Step 6: Manually expire the restriction
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id = ?", (past_time, restriction.id))
        conn.commit()
        conn.close()
        
        # Step 7: Test automatic capability restoration (before cleanup)
        assert engine.is_user_restricted(user_id=1) == False, "User should not be restricted after expiration"
        details_expired = engine.get_restriction_details(user_id=1)
        assert details_expired is None, "Should return None for expired restriction"
        print("✓ Capabilities automatically restored after expiration")
        
        # Step 8: Test automatic restriction cleanup
        deactivated_count = engine.deactivate_expired_restrictions()
        assert deactivated_count == 1, f"Expected 1 restriction to be deactivated, got {deactivated_count}"
        print("✓ Expired restrictions automatically deactivated")
        
        # Step 9: Verify final state
        assert engine.is_user_restricted(user_id=1) == False, "User should not be restricted after cleanup"
        
        # Verify the restriction is marked as inactive
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        inactive_restriction = conn.execute(
            "SELECT * FROM user_restrictions WHERE id = ? AND is_active = 0",
            (restriction.id,)
        ).fetchone()
        conn.close()
        
        assert inactive_restriction is not None, "Restriction should be marked as inactive"
        assert inactive_restriction['deactivated_at'] is not None, "Should have deactivated_at timestamp"
        print("✓ Restriction properly deactivated with timestamp")
        
        print("✓ Complete restriction lifecycle test PASSED")
        
    finally:
        cleanup_db(db_path)

def test_progressive_restriction_lifecycle():
    """Test progressive restrictions with automatic expiration."""
    print("Testing progressive restriction lifecycle...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Test multiple restriction cycles
        expected_periods = [1, 7, 14]  # Test first 3 restriction periods
        
        for i, expected_days in enumerate(expected_periods):
            print(f"  Testing restriction cycle {i+1}...")
            
            # Create restriction
            restriction = engine.create_restriction(user_id=1, admin_id=100)
            
            # Verify cooldown period
            actual_period = (restriction.restriction_end - restriction.restriction_start).days
            assert actual_period == expected_days, f"Restriction {i+1}: expected {expected_days} days, got {actual_period}"
            print(f"    ✓ Restriction {i+1}: {actual_period} days cooldown")
            
            # Verify user is restricted
            assert engine.is_user_restricted(user_id=1) == True, f"User should be restricted during cycle {i+1}"
            
            # Manually expire and deactivate the restriction
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            past_time = (datetime.now() - timedelta(days=1)).isoformat()
            conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id = ?", (past_time, restriction.id))
            conn.commit()
            conn.close()
            
            # Run cleanup
            deactivated_count = engine.deactivate_expired_restrictions()
            assert deactivated_count == 1, f"Expected 1 restriction to be deactivated in cycle {i+1}"
            
            # Verify user is no longer restricted
            assert engine.is_user_restricted(user_id=1) == False, f"User should not be restricted after cycle {i+1} expiration"
            print(f"    ✓ Restriction {i+1} properly expired and cleaned up")
        
        print("✓ Progressive restriction lifecycle test PASSED")
        
    finally:
        cleanup_db(db_path)

def test_multiple_users_lifecycle():
    """Test restriction lifecycle with multiple users."""
    print("Testing multiple users restriction lifecycle...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Create restrictions for multiple users
        restriction1 = engine.create_restriction(user_id=1, admin_id=100)
        restriction2 = engine.create_restriction(user_id=2, admin_id=100)
        restriction3 = engine.create_restriction(user_id=3, admin_id=100)
        
        # Verify all users are restricted
        assert engine.is_user_restricted(user_id=1) == True, "User 1 should be restricted"
        assert engine.is_user_restricted(user_id=2) == True, "User 2 should be restricted"
        assert engine.is_user_restricted(user_id=3) == True, "User 3 should be restricted"
        print("✓ All users initially restricted")
        
        # Expire restrictions for users 1 and 2
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id IN (?, ?)", (past_time, restriction1.id, restriction2.id))
        conn.commit()
        conn.close()
        
        # Test selective capability restoration
        assert engine.is_user_restricted(user_id=1) == False, "User 1 should not be restricted after expiration"
        assert engine.is_user_restricted(user_id=2) == False, "User 2 should not be restricted after expiration"
        assert engine.is_user_restricted(user_id=3) == True, "User 3 should still be restricted"
        print("✓ Selective capability restoration works")
        
        # Run cleanup
        deactivated_count = engine.deactivate_expired_restrictions()
        assert deactivated_count == 2, f"Expected 2 restrictions to be deactivated, got {deactivated_count}"
        print("✓ Selective restriction cleanup works")
        
        # Verify final states
        assert engine.is_user_restricted(user_id=1) == False, "User 1 should not be restricted after cleanup"
        assert engine.is_user_restricted(user_id=2) == False, "User 2 should not be restricted after cleanup"
        assert engine.is_user_restricted(user_id=3) == True, "User 3 should still be restricted after cleanup"
        print("✓ Final states correct after cleanup")
        
        print("✓ Multiple users lifecycle test PASSED")
        
    finally:
        cleanup_db(db_path)

def main():
    """Run all tests for Task 3 complete implementation."""
    print("=" * 70)
    print("TESTING TASK 3: Complete Restriction Lifecycle Management")
    print("=" * 70)
    print()
    
    try:
        test_complete_restriction_lifecycle()
        print()
        test_progressive_restriction_lifecycle()
        print()
        test_multiple_users_lifecycle()
        
        print()
        print("=" * 70)
        print("ALL TESTS PASSED! ✓")
        print("Task 3 complete implementation is working correctly.")
        print("=" * 70)
        print()
        print("✅ Task 3.1: Restriction creation and activation logic - COMPLETE")
        print("✅ Task 3.2: Automatic restriction expiration - COMPLETE")
        print("✅ Task 3: Restriction lifecycle management - COMPLETE")
        print()
        print("Requirements validated:")
        print("  ✓ 1.3: Restriction start time set correctly")
        print("  ✓ 1.4: Restriction end time calculated correctly")
        print("  ✓ 1.5: Restriction marked as active")
        print("  ✓ 5.1: Restriction status information available")
        print("  ✓ 5.2: Restriction end date and time shown")
        print("  ✓ 5.3: Remaining duration calculated")
        print("  ✓ 5.4: Automatic restriction deactivation")
        print("  ✓ 5.5: Automatic capability restoration")
        print("  ✓ 6.1: Warning count reset on restriction")
        
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())