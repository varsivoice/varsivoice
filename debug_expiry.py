#!/usr/bin/env python3
"""Debug script to understand the expiry issue."""

import os
import sqlite3
import tempfile
from datetime import datetime, timedelta
from restriction_engine import RestrictionEngine

def debug_expiry():
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    
    # Insert test user
    conn.execute("INSERT INTO users (id, email, display_name, role) VALUES (1, 'user1@test.com', 'Test User 1', 'user')")
    conn.commit()
    conn.close()
    
    # Create a restriction
    engine = RestrictionEngine(db_path)
    restriction = engine.create_restriction(user_id=1, admin_id=None)
    
    print(f"Created restriction:")
    print(f"  ID: {restriction.id}")
    print(f"  Start: {restriction.restriction_start}")
    print(f"  End: {restriction.restriction_end}")
    print(f"  Is Active: {restriction.is_active}")
    
    # Check current time in different formats
    python_now = datetime.now()
    sqlite_now = conn.execute("SELECT datetime('now') as now").fetchone()['now']
    
    print(f"\nTime comparison:")
    print(f"  Python now(): {python_now}")
    print(f"  Python now().isoformat(): {python_now.isoformat()}")
    print(f"  SQLite datetime('now'): {sqlite_now}")
    
    # Set restriction end to past time
    past_time = (datetime.now() - timedelta(hours=1)).isoformat()
    print(f"\nSetting restriction_end to: {past_time}")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "UPDATE user_restrictions SET restriction_end = ? WHERE user_id = ?",
        (past_time, 1)
    )
    conn.commit()
    conn.close()
    
    # Check what the query returns
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        """
        SELECT *, 
               restriction_end,
               datetime('now') as sqlite_now,
               restriction_end > datetime('now') as is_future
        FROM user_restrictions 
        WHERE user_id = ? AND is_active = 1
        """,
        (1,)
    ).fetchone()
    
    if row:
        print(f"\nRestriction record:")
        print(f"  restriction_end: {row['restriction_end']}")
        print(f"  sqlite_now: {row['sqlite_now']}")
        print(f"  is_future: {row['is_future']}")
        print(f"  restriction_end > datetime('now'): {row['is_future']}")
    
    # Test the actual query used by get_restriction_details
    filtered_row = conn.execute(
        """
        SELECT * FROM user_restrictions 
        WHERE user_id = ? AND is_active = 1 AND restriction_end > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (1,)
    ).fetchone()
    
    print(f"\nFiltered query result: {filtered_row}")
    
    # Test get_restriction_details
    details = engine.get_restriction_details(user_id=1)
    print(f"get_restriction_details result: {details}")
    
    conn.close()
    os.unlink(db_path)

if __name__ == "__main__":
    debug_expiry()