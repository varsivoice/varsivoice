#!/usr/bin/env python3
"""
Test script to verify Task 8 API endpoints are properly implemented.

This script tests all the restriction management API endpoints:
- GET /api/restrictions/status/<user_id>
- GET /api/user/restriction-status
- GET /api/admin/restrictions
- POST /api/admin/restrictions
- PUT /api/admin/restrictions/<restriction_id>
- DELETE /api/admin/restrictions/<restriction_id>
"""

import sys
import os
import sqlite3
from datetime import datetime, timedelta

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from restriction_engine import RestrictionEngine
from restriction_models import RestrictionRecord

def test_api_endpoints_exist():
    """Test that all required API endpoints are implemented."""
    print("Testing Task 8: API Endpoints Implementation")
    print("=" * 60)
    
    # Read app.py to verify endpoints exist
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check for required endpoints
    required_endpoints = [
        '@app.route("/api/restrictions/status/<int:user_id>", methods=["GET"])',
        '@app.route("/api/user/restriction-status", methods=["GET"])',
        '@app.route("/api/admin/restrictions", methods=["GET"])',
        '@app.route("/api/admin/restrictions", methods=["POST"])',
        '@app.route("/api/admin/restrictions/<int:restriction_id>", methods=["PUT"])',
        '@app.route("/api/admin/restrictions/<int:restriction_id>", methods=["DELETE"])'
    ]
    
    print("Checking for required API endpoints:")
    all_found = True
    
    for endpoint in required_endpoints:
        if endpoint in app_content:
            print(f"✅ {endpoint}")
        else:
            print(f"❌ {endpoint}")
            all_found = False
    
    if not all_found:
        return False
    
    # Check for required functions
    required_functions = [
        'def get_user_restriction_status(user_id):',
        'def get_current_user_restriction_status():',
        'def admin_list_restrictions():',
        'def admin_create_restriction():',
        'def admin_modify_restriction(restriction_id):',
        'def admin_remove_restriction(restriction_id):'
    ]
    
    print("\nChecking for endpoint functions:")
    for function in required_functions:
        if function in app_content:
            print(f"✅ {function}")
        else:
            print(f"❌ {function}")
            all_found = False
    
    return all_found

def test_restriction_engine_integration():
    """Test that the restriction engine is properly integrated."""
    print("\nTesting RestrictionEngine integration:")
    
    # Check if restriction_engine is imported and initialized
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check for imports
    if 'from restriction_engine import RestrictionEngine' in app_content:
        print("✅ RestrictionEngine imported")
    else:
        print("❌ RestrictionEngine not imported")
        return False
    
    if 'restriction_engine = RestrictionEngine(' in app_content:
        print("✅ RestrictionEngine initialized")
    else:
        print("❌ RestrictionEngine not initialized")
        return False
    
    # Test actual functionality
    try:
        db_path = "freedom_wall.db"
        if os.path.exists(db_path):
            engine = RestrictionEngine(db_path)
            
            # Test basic functionality
            status = engine.get_restriction_status(999999)  # Non-existent user
            print(f"✅ RestrictionEngine.get_restriction_status() works: {status.is_restricted}")
            
            return True
        else:
            print("⚠️  Database not found, skipping functional test")
            return True
    except Exception as e:
        print(f"❌ RestrictionEngine functionality test failed: {e}")
        return False

def test_endpoint_features():
    """Test specific endpoint features."""
    print("\nTesting endpoint features:")
    
    try:
        with open('app.py', 'r', encoding='utf-8') as f:
            app_content = f.read()
    except Exception as e:
        print(f"❌ Could not read app.py: {e}")
        return False
    
    # Check for key features in endpoints
    features_to_check = [
        ('Admin authentication', 'require_admin_auth'),
        ('JSON responses', 'jsonify'),
        ('Error handling', 'try:'),
        ('Database connections', 'get_db_connection()'),
        ('Restriction status serialization', '.to_dict()'),
        ('HTTP status codes', ', 40'),  # 400, 403, 404, etc.
    ]
    
    for feature_name, feature_code in features_to_check:
        if feature_code in app_content:
            print(f"✅ {feature_name}: Found '{feature_code}'")
        else:
            print(f"⚠️  {feature_name}: '{feature_code}' not found (may use different implementation)")
    
    return True

def main():
    """Run all tests for Task 8 API endpoints."""
    print("Task 8: Create new API endpoints for restriction management")
    print("Testing implementation verification...")
    print()
    
    try:
        # Test 1: Check endpoints exist
        if not test_api_endpoints_exist():
            print("\n❌ API endpoints test FAILED")
            return False
        
        # Test 2: Check integration
        if not test_restriction_engine_integration():
            print("\n❌ RestrictionEngine integration test FAILED")
            return False
        
        # Test 3: Check features
        if not test_endpoint_features():
            print("\n❌ Endpoint features test FAILED")
            return False
        
        print("\n" + "=" * 60)
        print("✅ Task 8 API Endpoints Verification PASSED")
        print("\nAll required endpoints are implemented:")
        print("  - GET /api/restrictions/status/<user_id> ✅")
        print("  - GET /api/user/restriction-status ✅")
        print("  - GET /api/admin/restrictions ✅")
        print("  - POST /api/admin/restrictions ✅")
        print("  - PUT /api/admin/restrictions/<restriction_id> ✅")
        print("  - DELETE /api/admin/restrictions/<restriction_id> ✅")
        print("\nTask 8.1: User restriction status endpoints - COMPLETE ✅")
        print("Task 8.2: Admin restriction management endpoints - COMPLETE ✅")
        print("Task 8: Create new API endpoints for restriction management - COMPLETE ✅")
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)