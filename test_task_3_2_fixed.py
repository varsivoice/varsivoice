#!/usr/bin/env python3
"""
Test script for Task 3.2: Implement automatic restriction expiration

This script tests the automatic restriction expiration functionality:
- deactivate_expired_restrictions() method with scheduled execution
- Automatic capability restoration when restrictions expire

Requirements: 5.4, 5.5
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

def test_deactivate_expired_restrictions():
    """Test deactivate_expired_restrictions() method."""
    print("Testing deactivate_expired_restrictions() method...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Create some test restrictions with different expiration times
        now = datetime.now()
        
        # Use the engine to create restrictions, then manually modify their end times
        restriction1 = engine.create_restriction(user_id=1, admin_id=100)
        restriction2 = engine.create_restriction(user_id=2, admin_id=100)
        
        # Manually set expiration times to test the cleanup
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Make restriction 1 expired (2 days ago)
        expired_time_1 = (now - timedelta(days=2)).isoformat()
        conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id = ?", (expired_time_1, restriction1.id))
        
        # Make restriction 2 expired (1 day ago)  
        expired_time_2 = (now - timedelta(days=1)).isoformat()
        conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id = ?", (expired_time_2, restriction2.id))
        
        conn.commit()
        conn.close()
        
        # Create one more active restriction
        restriction3 = engine.create_restriction(user_id=3, admin_id=100)
        
        # Verify initial state - should have 3 active restrictions
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        active_count = conn.execute("SELECT COUNT(*) as count FROM user_restrictions WHERE is_active = 1").fetchone()['count']
        conn.close()
        
        assert active_count == 3, f"Expected 3 active restrictions initially, got {active_count}"
        print("✓ Initial state: 3 active restrictions")
        
        # Run the deactivation method
        deactivated_count = engine.deactivate_expired_restrictions()
        
        # Should deactivate 2 expired restrictions
        assert deactivated_count == 2, f"Expected 2 restrictions to be deactivated, got {deactivated_count}"
        print(f"✓ Deactivated {deactivated_count} expired restrictions")
        
        # Verify final state - should have 1 active restriction
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        active_count_after = conn.execute("SELECT COUNT(*) as count FROM user_restrictions WHERE is_active = 1").fetchone()['count']
        conn.close()
        
        assert active_count_after == 1, f"Expected 1 active restriction after cleanup, got {active_count_after}"
        print("✓ Final state: 1 active restriction remaining")
        
        # Verify the remaining active restriction is user 3
        assert engine.is_user_restricted(user_id=1) == False, "User 1 should not be restricted after expiration"
        assert engine.is_user_restricted(user_id=2) == False, "User 2 should not be restricted after expiration"
        assert engine.is_user_restricted(user_id=3) == True, "User 3 should still be restricted"
        print("✓ Correct users are restricted/unrestricted")
        
    finally:
        cleanup_db(db_path)
    
    print("deactivate_expired_restrictions() test PASSED\n")

def test_automatic_capability_restoration():
    """Test that capabilities are automatically restored when restrictions expire."""
    print("Testing automatic capability restoration...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Create a restriction that will expire
        restriction = engine.create_restriction(user_id=1, admin_id=100)
        
        # Verify user is initially restricted
        assert engine.is_user_restricted(user_id=1) == True, "User should be restricted initially"
        print("✓ User is initially restricted")
        
        # Manually expire the restriction by setting end time to past
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        conn.execute("UPDATE user_restrictions SET restriction_end = ? WHERE id = ?", (past_time, restriction.id))
        conn.commit()
        conn.close()
        
        # User should not be restricted after expiration (even before cleanup)
        assert engine.is_user_restricted(user_id=1) == False, "User should not be restricted after expiration"
        print("✓ User capabilities restored after expiration (before cleanup)")
        
        # Run cleanup to deactivate expired restrictions
        deactivated_count = engine.deactivate_expired_restrictions()
        assert deactivated_count == 1, f"Expected 1 restriction to be deactivated, got {deactivated_count}"
        print("✓ Expired restriction deactivated by cleanup")
        
        # Verify user is still not restricted after cleanup
        assert engine.is_user_restricted(user_id=1) == False, "User should not be restricted after cleanup"
        print("✓ User capabilities remain restored after cleanup")
        
        # Verify restriction details return None
        details = engine.get_restriction_details(user_id=1)
        assert details is None, "Should return None for expired/deactivated restriction"
        print("✓ Restriction details return None for expired restriction")
        
    finally:
        cleanup_db(db_path)
    
    print("Automatic capability restoration test PASSED\n")

def test_no_expired_restrictions():
    """Test deactivate_expired_restrictions when no restrictions are expired."""
    print("Testing deactivate_expired_restrictions with no expired restrictions...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Create some active restrictions that are not expired
        restriction1 = engine.create_restriction(user_id=1, admin_id=100)
        restriction2 = engine.create_restriction(user_id=2, admin_id=100)
        
        # Verify both users are restricted
        assert engine.is_user_restricted(user_id=1) == True, "User 1 should be restricted"
        assert engine.is_user_restricted(user_id=2) == True, "User 2 should be restricted"
        print("✓ Both users are initially restricted")
        
        # Run expiration cleanup
        deactivated_count = engine.deactivate_expired_restrictions()
        assert deactivated_count == 0, f"Expected 0 restrictions to be deactivated, got {deactivated_count}"
        print("✓ No restrictions were deactivated (none expired)")
        
        # Verify both users are still restricted
        assert engine.is_user_restricted(user_id=1) == True, "User 1 should still be restricted"
        assert engine.is_user_restricted(user_id=2) == True, "User 2 should still be restricted"
        print("✓ Both users remain restricted")
        
    finally:
        cleanup_db(db_path)
    
    print("No expired restrictions test PASSED\n")

def main():
    """Run all tests for Task 3.2."""
    print("=" * 60)
    print("TESTING TASK 3.2: Automatic Restriction Expiration")
    print("=" * 60)
    print()
    
    try:
        test_deactivate_expired_restrictions()
        test_automatic_capability_restoration()
        test_no_expired_restrictions()
        
        print("=" * 60)
        print("ALL TESTS PASSED! ✓")
        print("Task 3.2 implementation is working correctly.")
        print("=" * 60)
        
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())