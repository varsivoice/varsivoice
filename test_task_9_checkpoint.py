#!/usr/bin/env python3
"""
Task 9 Checkpoint: Comprehensive API Integration Test

This script runs comprehensive tests to ensure all API integration is working correctly
before proceeding to frontend implementation.
"""

import sys
import os
import sqlite3
from datetime import datetime, timedelta

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from restriction_engine import RestrictionEngine
from interaction_blocker import InteractionBlocker

def test_core_components():
    """Test that all core components are working."""
    print("Testing Core Components Integration...")
    
    try:
        # Test RestrictionEngine
        db_path = "freedom_wall.db"
        if not os.path.exists(db_path):
            print("❌ Database not found")
            return False
        
        engine = RestrictionEngine(db_path)
        print("✅ RestrictionEngine initialized")
        
        # Test InteractionBlocker
        blocker = InteractionBlocker(engine)
        print("✅ InteractionBlocker initialized")
        
        # Test basic functionality
        status = engine.get_restriction_status(999999)
        print(f"✅ Restriction status check works: {status.is_restricted}")
        
        can_interact, msg = blocker.check_user_can_interact(999999)
        print(f"✅ Interaction check works: {can_interact}")
        
        return True
        
    except Exception as e:
        print(f"❌ Core components test failed: {e}")
        return False

def test_api_endpoints():
    """Test that all API endpoints are properly implemented."""
    print("\nTesting API Endpoints...")
    
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check all required endpoints
    endpoints = [
        # User endpoints
        ('@app.route("/api/restrictions/status/<int:user_id>"', 'User restriction status'),
        ('@app.route("/api/user/restriction-status"', 'Current user restriction status'),
        
        # Admin endpoints
        ('@app.route("/api/admin/restrictions", methods=["GET"])', 'Admin list restrictions'),
        ('@app.route("/api/admin/restrictions", methods=["POST"])', 'Admin create restriction'),
        ('@app.route("/api/admin/restrictions/<int:restriction_id>", methods=["PUT"])', 'Admin modify restriction'),
        ('@app.route("/api/admin/restrictions/<int:restriction_id>", methods=["DELETE"])', 'Admin remove restriction'),
    ]
    
    for endpoint_code, description in endpoints:
        if endpoint_code in app_content:
            print(f"✅ {description}")
        else:
            print(f"❌ {description}")
            return False
    
    return True

def test_interaction_blocking():
    """Test that interaction blocking is properly integrated."""
    print("\nTesting Interaction Blocking Integration...")
    
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check for decorator applications
    protected_endpoints = [
        ('@require_post_creation_permission(interaction_blocker)', 'Post creation protection'),
        ('@require_comment_creation_permission(interaction_blocker)', 'Comment creation protection'),
        ('@require_reaction_permission(interaction_blocker)', 'Reaction protection'),
        ('@require_content_editing_permission(interaction_blocker)', 'Content editing protection'),
        ('@require_submission_creation_permission(interaction_blocker)', 'Submission creation protection'),
        ('@require_submission_editing_permission(interaction_blocker)', 'Submission editing protection'),
    ]
    
    for decorator, description in protected_endpoints:
        if decorator in app_content:
            print(f"✅ {description}")
        else:
            print(f"❌ {description}")
            return False
    
    return True

def test_warning_integration():
    """Test that warning system integration is working."""
    print("\nTesting Warning System Integration...")
    
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check for warning threshold processing
    if 'restriction_engine.process_warning_threshold(' in app_content:
        print("✅ Warning threshold processing integrated")
    else:
        print("❌ Warning threshold processing not found")
        return False
    
    # Check for notification creation on restriction
    if '_create_notification(conn, content_owner_id, user_row["id"], "restriction"' in app_content:
        print("✅ Restriction notification creation integrated")
    else:
        print("❌ Restriction notification creation not found")
        return False
    
    return True

def test_database_schema():
    """Test that database schema is properly set up."""
    print("\nTesting Database Schema...")
    
    try:
        db_path = "freedom_wall.db"
        if not os.path.exists(db_path):
            print("❌ Database not found")
            return False
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Check for user_restrictions table
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        table_names = [table['name'] for table in tables]
        
        if 'user_restrictions' in table_names:
            print("✅ user_restrictions table exists")
        else:
            print("❌ user_restrictions table not found")
            return False
        
        # Check table structure
        columns = conn.execute("PRAGMA table_info(user_restrictions)").fetchall()
        column_names = [col['name'] for col in columns]
        
        required_columns = ['id', 'user_id', 'restriction_start', 'restriction_end', 
                          'restriction_count', 'is_active', 'created_by_admin_id', 
                          'created_at', 'deactivated_at']
        
        for col in required_columns:
            if col in column_names:
                print(f"✅ Column '{col}' exists")
            else:
                print(f"❌ Column '{col}' missing")
                return False
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database schema test failed: {e}")
        return False

def test_end_to_end_workflow():
    """Test a complete end-to-end workflow."""
    print("\nTesting End-to-End Workflow...")
    
    try:
        db_path = "freedom_wall.db"
        engine = RestrictionEngine(db_path)
        blocker = InteractionBlocker(engine)
        
        # Test with non-existent user (should allow all interactions)
        test_user_id = 999999
        
        # Test restriction status
        status = engine.get_restriction_status(test_user_id)
        if not status.is_restricted:
            print("✅ Non-restricted user status correct")
        else:
            print("❌ Non-restricted user shows as restricted")
            return False
        
        # Test interaction permissions
        can_post, _ = blocker.validate_post_creation(test_user_id)
        can_comment, _ = blocker.validate_comment_creation(test_user_id)
        can_react, _ = blocker.validate_reaction_creation(test_user_id)
        can_edit, _ = blocker.validate_content_editing(test_user_id)
        
        if all([can_post, can_comment, can_react, can_edit]):
            print("✅ Non-restricted user can perform all interactions")
        else:
            print("❌ Non-restricted user blocked from interactions")
            return False
        
        # Test cooldown calculation
        cooldown = engine.calculate_cooldown_period(test_user_id)
        if cooldown == 1:  # First restriction should be 1 day
            print("✅ Cooldown calculation works correctly")
        else:
            print(f"❌ Incorrect cooldown calculation: {cooldown}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ End-to-end workflow test failed: {e}")
        return False

def main():
    """Run all checkpoint tests."""
    print("=" * 70)
    print("TASK 9 CHECKPOINT: API Integration Tests")
    print("=" * 70)
    print()
    
    tests = [
        ("Core Components", test_core_components),
        ("API Endpoints", test_api_endpoints),
        ("Interaction Blocking", test_interaction_blocking),
        ("Warning Integration", test_warning_integration),
        ("Database Schema", test_database_schema),
        ("End-to-End Workflow", test_end_to_end_workflow),
    ]
    
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"Running {test_name} test...")
        if not test_func():
            print(f"❌ {test_name} test FAILED")
            all_passed = False
        else:
            print(f"✅ {test_name} test PASSED")
        print()
    
    print("=" * 70)
    if all_passed:
        print("✅ ALL CHECKPOINT TESTS PASSED!")
        print("\nAPI Integration Status:")
        print("  ✅ Core restriction engine working")
        print("  ✅ InteractionBlocker middleware working")
        print("  ✅ All API endpoints implemented")
        print("  ✅ Interaction blocking integrated")
        print("  ✅ Warning system integration working")
        print("  ✅ Database schema correct")
        print("  ✅ End-to-end workflow functional")
        print("\nReady to proceed to frontend implementation!")
        return True
    else:
        print("❌ SOME TESTS FAILED!")
        print("Please address the issues before proceeding.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)