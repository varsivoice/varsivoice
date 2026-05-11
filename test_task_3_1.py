#!/usr/bin/env python3
"""
Test script for Task 3.1: Create restriction creation and activation logic

This script tests the three main methods:
- create_restriction() method with automatic warning count reset
- is_user_restricted() method for real-time restriction checking  
- get_restriction_details() method for status information

Requirements: 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 6.1
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
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (100, 'admin@test.com', 'Admin User', 'admin')")
    
    conn.commit()
    conn.close()
    
    return db_path

def test_create_restriction():
    """Test create_restriction() method with automatic warning count reset."""
    print("Testing create_restriction() method...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Add some warnings for user 1
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        for i in range(5):
            conn.execute(
                "INSERT INTO warnings (user_id, admin_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)",
                (1, 100, 'post', 1, f'Test warning {i+1}')
            )
        conn.commit()
        
        # Verify user has 5 warnings
        warning_count = conn.execute("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", (1,)).fetchone()['count']
        assert warning_count == 5, f"Expected 5 warnings, got {warning_count}"
        print("✓ User has 5 warnings before restriction")
        
        # Create restriction
        restriction = engine.create_restriction(user_id=1, admin_id=100)
        
        # Verify restriction was created correctly
        assert isinstance(restriction, RestrictionRecord), "Should return RestrictionRecord"
        assert restriction.user_id == 1, "Should have correct user_id"
        assert restriction.is_active == True, "Should be active"
        assert restriction.restriction_count == 1, "Should be first restriction"
        assert restriction.created_by_admin_id == 100, "Should have correct admin_id"
        print("✓ Restriction created successfully")
        
        # Verify warning count was reset
        warning_count_after = conn.execute("SELECT COUNT(*) as count FROM warnings WHERE user_id = ?", (1,)).fetchone()['count']
        assert warning_count_after == 0, f"Expected 0 warnings after restriction, got {warning_count_after}"
        print("✓ Warning count reset to 0 after restriction")
        
        # Verify cooldown period is correct (1 day for first restriction)
        expected_end = restriction.restriction_start + timedelta(days=1)
        actual_end = restriction.restriction_end
        time_diff = abs((actual_end - expected_end).total_seconds())
        assert time_diff < 60, f"Restriction end time should be ~1 day from start, diff: {time_diff}s"
        print("✓ Cooldown period calculated correctly (1 day)")
        
        # Test duplicate restriction prevention
        try:
            engine.create_restriction(user_id=1, admin_id=100)
            assert False, "Should raise ValueError for duplicate restriction"
        except ValueError as e:
            assert "already has an active restriction" in str(e)
            print("✓ Duplicate restriction prevention works")
        
        conn.close()
        
    finally:
        os.unlink(db_path)
    
    print("create_restriction() test PASSED\n")

def test_is_user_restricted():
    """Test is_user_restricted() method for real-time restriction checking."""
    print("Testing is_user_restricted() method...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Test unrestricted user
        is_restricted = engine.is_user_restricted(user_id=1)
        assert is_restricted == False, "User should not be restricted initially"
        print("✓ Unrestricted user returns False")
        
        # Create a restriction
        restriction = engine.create_restriction(user_id=1, admin_id=100)
        
        # Test restricted user
        is_restricted = engine.is_user_restricted(user_id=1)
        assert is_restricted == True, "User should be restricted after creating restriction"
        print("✓ Restricted user returns True")
        
        # Test different user (should not be restricted)
        is_restricted_other = engine.is_user_restricted(user_id=2)
        assert is_restricted_other == False, "Other user should not be restricted"
        print("✓ Other users not affected by restriction")
        
        # Test expired restriction
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        conn.execute(
            "UPDATE user_restrictions SET restriction_end = ? WHERE user_id = ?",
            (past_time, 1)
        )
        conn.commit()
        conn.close()
        
        is_restricted_expired = engine.is_user_restricted(user_id=1)
        assert is_restricted_expired == False, "User should not be restricted after expiration"
        print("✓ Expired restrictions return False")
        
    finally:
        os.unlink(db_path)
    
    print("is_user_restricted() test PASSED\n")

def test_get_restriction_details():
    """Test get_restriction_details() method for status information."""
    print("Testing get_restriction_details() method...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        # Test unrestricted user
        details = engine.get_restriction_details(user_id=1)
        assert details is None, "Should return None for unrestricted user"
        print("✓ Unrestricted user returns None")
        
        # Create a restriction
        restriction = engine.create_restriction(user_id=1, admin_id=100)
        
        # Test restricted user
        details = engine.get_restriction_details(user_id=1)
        assert details is not None, "Should return RestrictionRecord for restricted user"
        assert isinstance(details, RestrictionRecord), "Should return RestrictionRecord instance"
        assert details.user_id == 1, "Should have correct user_id"
        assert details.is_active == True, "Should be active"
        assert details.restriction_count == 1, "Should have correct restriction count"
        assert details.created_by_admin_id == 100, "Should have correct admin_id"
        print("✓ Restricted user returns correct RestrictionRecord")
        
        # Test remaining time calculation
        remaining = details.remaining_time
        assert remaining is not None, "Should have remaining time"
        assert remaining.total_seconds() > 0, "Remaining time should be positive"
        assert remaining.total_seconds() <= 86400, "Remaining time should be <= 1 day"
        print("✓ Remaining time calculated correctly")
        
        # Test expired restriction
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        past_time = (datetime.now() - timedelta(days=1)).isoformat()
        conn.execute(
            "UPDATE user_restrictions SET restriction_end = ? WHERE user_id = ?",
            (past_time, 1)
        )
        conn.commit()
        conn.close()
        
        # The get_restriction_details method filters by restriction_end > datetime('now')
        # So it should return None for expired restrictions
        details_expired = engine.get_restriction_details(user_id=1)
        assert details_expired is None, "Should return None for expired restriction"
        print("✓ Expired restrictions return None")
        
        # But let's also verify that is_user_restricted correctly handles this
        is_restricted_after_expiry = engine.is_user_restricted(user_id=1)
        assert is_restricted_after_expiry == False, "User should not be restricted after expiration"
        print("✓ is_user_restricted correctly handles expired restrictions")
        
    finally:
        os.unlink(db_path)
    
    print("get_restriction_details() test PASSED\n")

def test_progressive_cooldown():
    """Test progressive cooldown periods for multiple restrictions."""
    print("Testing progressive cooldown periods...")
    
    db_path = setup_test_db()
    engine = RestrictionEngine(db_path)
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Test progressive cooldown periods
        expected_periods = [1, 7, 14, 30, 90, 90]  # Days for restrictions 1-6
        
        for i, expected_days in enumerate(expected_periods):
            # Create restriction
            restriction = engine.create_restriction(user_id=1, admin_id=100)
            
            # Calculate actual cooldown period
            actual_period = (restriction.restriction_end - restriction.restriction_start).days
            
            assert actual_period == expected_days, f"Restriction {i+1}: expected {expected_days} days, got {actual_period}"
            print(f"✓ Restriction {i+1}: {actual_period} days (correct)")
            
            # Deactivate the restriction to allow next one
            conn.execute(
                "UPDATE user_restrictions SET is_active = 0, deactivated_at = datetime('now') WHERE id = ?",
                (restriction.id,)
            )
            conn.commit()
        
        conn.close()
        
    finally:
        os.unlink(db_path)
    
    print("Progressive cooldown test PASSED\n")

def main():
    """Run all tests for Task 3.1."""
    print("=" * 60)
    print("TESTING TASK 3.1: Restriction Creation and Activation Logic")
    print("=" * 60)
    print()
    
    try:
        test_create_restriction()
        test_is_user_restricted()
        test_get_restriction_details()
        test_progressive_cooldown()
        
        print("=" * 60)
        print("ALL TESTS PASSED! ✓")
        print("Task 3.1 implementation is working correctly.")
        print("=" * 60)
        
    except Exception as e:
        print(f"TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())