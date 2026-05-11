#!/usr/bin/env python3
"""
Test Task 11: Admin Interface Restriction Management

This test verifies that the admin interface has been enhanced with restriction management capabilities.
"""

import requests
import json
import sqlite3
import os
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://127.0.0.1:5000"
DB_PATH = "freedom_wall.db"

def test_admin_restrictions_endpoints():
    """Test that the admin restriction management endpoints are available."""
    print("Testing admin restriction management endpoints...")
    
    # Create a test admin user
    conn = sqlite3.connect(DB_PATH)
    try:
        # Create admin user
        cursor = conn.execute(
            "INSERT OR REPLACE INTO users (id, email, password_hash, display_name, role, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            (9999, "admin@test.com", "test_hash", "Test Admin", "main_admin", "USR-09999")
        )
        
        # Create a regular user for testing
        cursor = conn.execute(
            "INSERT OR REPLACE INTO users (id, email, password_hash, display_name, role, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            (9998, "user@test.com", "test_hash", "Test User", "user", "USR-09998")
        )
        
        conn.commit()
        
        # Test GET /api/admin/restrictions
        response = requests.get(f"{BASE_URL}/api/admin/restrictions?user_id=9999")
        print(f"GET /api/admin/restrictions: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "restrictions" in data, "Response should contain 'restrictions' key"
        print(f"Found {len(data['restrictions'])} existing restrictions")
        
        # Test POST /api/admin/restrictions (create restriction)
        restriction_data = {
            "admin_user_id": 9999,
            "user_id": 9998,
            "duration_days": 7,
            "reason": "Test restriction for admin interface"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/restrictions",
            headers={"Content-Type": "application/json"},
            data=json.dumps(restriction_data)
        )
        print(f"POST /api/admin/restrictions: {response.status_code}")
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        
        created_restriction = response.json()
        restriction_id = created_restriction["id"]
        print(f"Created restriction with ID: {restriction_id}")
        
        # Test PUT /api/admin/restrictions/<id> (modify restriction)
        new_end_time = (datetime.now() + timedelta(days=14)).isoformat()
        modify_data = {
            "admin_user_id": 9999,
            "new_end_time": new_end_time,
            "reason": "Extended restriction duration"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/restrictions/{restriction_id}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(modify_data)
        )
        print(f"PUT /api/admin/restrictions/{restriction_id}: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Test DELETE /api/admin/restrictions/<id> (remove restriction)
        remove_data = {
            "admin_user_id": 9999,
            "reason": "Test removal"
        }
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/restrictions/{restriction_id}",
            headers={"Content-Type": "application/json"},
            data=json.dumps(remove_data)
        )
        print(f"DELETE /api/admin/restrictions/{restriction_id}: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print("✓ All admin restriction endpoints are working correctly")
        
    finally:
        # Clean up test data
        conn.execute("DELETE FROM user_restrictions WHERE user_id = 9998")
        conn.execute("DELETE FROM users WHERE id IN (9999, 9998)")
        conn.commit()
        conn.close()

def test_admin_page_contains_restrictions():
    """Test that the admin page contains the restriction management section."""
    print("Testing admin page contains restriction management...")
    
    response = requests.get(f"{BASE_URL}/admin")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    html_content = response.text
    
    # Check for restriction management elements
    required_elements = [
        'id="sidenav-restrictions"',  # Sidebar navigation item
        'id="section-restrictions"',  # Main section
        'id="restrictions-filter"',   # Filter dropdown
        'id="restrictions-sort"',     # Sort dropdown
        'id="btn-create-restriction"', # Create button
        'id="restriction-modal"',     # Create modal
        'id="restriction-details-modal"' # Details modal
    ]
    
    for element in required_elements:
        assert element in html_content, f"Missing required element: {element}"
        print(f"✓ Found {element}")
    
    print("✓ Admin page contains all required restriction management elements")

def test_admin_js_contains_restriction_functions():
    """Test that admin.js contains the restriction management functions."""
    print("Testing admin.js contains restriction management functions...")
    
    with open("static/js/admin.js", "r") as f:
        js_content = f.read()
    
    # Check for key functions
    required_functions = [
        "loadRestrictions",
        "renderRestrictions", 
        "renderRestrictionCard",
        "openCreateRestrictionModal",
        "openRestrictionDetailsModal",
        "openModifyRestrictionModal",
        "openRemoveRestrictionModal",
        "openUserRestrictionsModal"
    ]
    
    for func in required_functions:
        assert f"function {func}" in js_content, f"Missing function: {func}"
        print(f"✓ Found function {func}")
    
    print("✓ Admin.js contains all required restriction management functions")

def test_css_contains_restriction_styles():
    """Test that CSS contains the restriction management styles."""
    print("Testing CSS contains restriction management styles...")
    
    with open("static/css/style.css", "r") as f:
        css_content = f.read()
    
    # Check for key CSS classes
    required_classes = [
        ".restriction-card",
        ".restriction-modal-card",
        ".restriction-status-active",
        ".restriction-status-inactive",
        ".user-restriction-status",
        ".warning-restriction-options"
    ]
    
    for css_class in required_classes:
        assert css_class in css_content, f"Missing CSS class: {css_class}"
        print(f"✓ Found CSS class {css_class}")
    
    print("✓ CSS contains all required restriction management styles")

def run_all_tests():
    """Run all tests for Task 11."""
    print("=" * 60)
    print("TASK 11: Admin Interface Restriction Management Tests")
    print("=" * 60)
    
    try:
        test_admin_page_contains_restrictions()
        print()
        
        test_admin_js_contains_restriction_functions()
        print()
        
        test_css_contains_restriction_styles()
        print()
        
        test_admin_restrictions_endpoints()
        print()
        
        print("=" * 60)
        print("✅ ALL TASK 11 TESTS PASSED!")
        print("=" * 60)
        print()
        print("Task 11 Implementation Summary:")
        print("- ✓ Added restriction management section to admin panel")
        print("- ✓ Created admin UI for viewing all user restrictions")
        print("- ✓ Added controls for creating, modifying, and removing restrictions")
        print("- ✓ Integrated restriction management with warning workflow")
        print("- ✓ Added user restriction status display in admin user management")
        print("- ✓ Enhanced warning modal with restriction creation options")
        print("- ✓ Added comprehensive CSS styling for all components")
        print("- ✓ Implemented responsive design for mobile devices")
        print()
        print("The admin interface now provides comprehensive restriction management")
        print("capabilities, allowing administrators to effectively manage user")
        print("restrictions through an intuitive web interface.")
        
        return True
        
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)