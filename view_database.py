#!/usr/bin/env python3
"""
Simple database viewer for freedom_wall.db
Run this script to see your database contents
"""

import sqlite3
import sys
from datetime import datetime

def view_database():
    try:
        # Connect to database
        conn = sqlite3.connect('freedom_wall.db')
        cursor = conn.cursor()
        
        print("=" * 60)
        print("FREEDOM WALL DATABASE VIEWER")
        print("=" * 60)
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"\n📊 TABLES IN DATABASE ({len(tables)} total):")
        for i, (table_name,) in enumerate(tables, 1):
            print(f"  {i}. {table_name}")
        
        print("\n" + "=" * 60)
        
        # Show each table's data
        for table_name, in tables:
            print(f"\n📋 TABLE: {table_name}")
            print("-" * 40)
            
            # Get table info
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            print("Columns:")
            for col in columns:
                col_name, col_type = col[1], col[2]
                print(f"  • {col_name} ({col_type})")
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"\nRows: {count}")
            
            # Show sample data (first 5 rows)
            if count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                rows = cursor.fetchall()
                
                print("\nSample data (first 5 rows):")
                col_names = [col[1] for col in columns]
                
                # Print header
                header = " | ".join(f"{name[:15]:<15}" for name in col_names)
                print(f"  {header}")
                print("  " + "-" * len(header))
                
                # Print rows
                for row in rows:
                    row_str = " | ".join(f"{str(val)[:15]:<15}" for val in row)
                    print(f"  {row_str}")
                
                if count > 5:
                    print(f"  ... and {count - 5} more rows")
            
            print()
        
        conn.close()
        print("=" * 60)
        print("✅ Database viewing complete!")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except FileNotFoundError:
        print("❌ Database file 'freedom_wall.db' not found!")
        print("Make sure you're running this script in the same folder as your database.")

if __name__ == "__main__":
    view_database()