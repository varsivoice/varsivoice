"""
Restriction Engine for the User Warning and Restriction System.

This module contains the core business logic for managing user restrictions,
including automatic restriction creation, cooldown calculation, and lifecycle management.
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Optional, List, Tuple

from restriction_models import RestrictionRecord, RestrictionStatus, get_cooldown_period


class RestrictionEngine:
    """
    Core engine for managing user restrictions.
    
    This class handles all restriction-related operations including:
    - Checking warning thresholds
    - Creating automatic restrictions
    - Calculating cooldown periods
    - Managing restriction lifecycle
    """

    def __init__(self, db_path: str):
        """
        Initialize the restriction engine.
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection with proper configuration."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def check_warning_threshold(self, user_id: int) -> bool:
        """
        Check if a user has reached the warning threshold (5 warnings).
        
        Args:
            user_id: The ID of the user to check
            
        Returns:
            True if the user has 5 or more warnings, False otherwise
        """
        conn = self._get_connection()
        try:
            result = conn.execute(
                "SELECT COUNT(*) as warning_count FROM warnings WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            return result['warning_count'] >= 5
        finally:
            conn.close()

    def get_user_restriction_count(self, user_id: int) -> int:
        """
        Get the total number of restrictions a user has received.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            The total number of restrictions (both active and inactive)
        """
        conn = self._get_connection()
        try:
            result = conn.execute(
                "SELECT MAX(restriction_count) as max_count FROM user_restrictions WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            return result['max_count'] or 0
        finally:
            conn.close()

    def calculate_cooldown_period(self, user_id: int) -> int:
        """
        Calculate the cooldown period in days for a user's next restriction.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Number of days for the cooldown period
        """
        current_count = self.get_user_restriction_count(user_id)
        next_restriction_count = current_count + 1
        return get_cooldown_period(next_restriction_count)

    def create_restriction(self, user_id: int, admin_id: Optional[int] = None) -> RestrictionRecord:
        """
        Create a new restriction for a user.
        
        Args:
            user_id: The ID of the user to restrict
            admin_id: The ID of the admin creating the restriction (None for automatic)
            
        Returns:
            The created RestrictionRecord
            
        Raises:
            ValueError: If the user already has an active restriction
        """
        conn = self._get_connection()
        try:
            # Check if user already has an active restriction
            existing = conn.execute(
                """
                SELECT id FROM user_restrictions 
                WHERE user_id = ? AND is_active = 1 AND restriction_end > datetime('now')
                """,
                (user_id,)
            ).fetchone()
            
            if existing:
                raise ValueError(f"User {user_id} already has an active restriction")

            # Calculate restriction details
            restriction_count = self.get_user_restriction_count(user_id) + 1
            cooldown_days = get_cooldown_period(restriction_count)
            
            start_time = datetime.now()
            end_time = start_time + timedelta(days=cooldown_days)
            
            # Create the restriction
            cursor = conn.execute(
                """
                INSERT INTO user_restrictions 
                (user_id, restriction_start, restriction_end, restriction_count, 
                 is_active, created_by_admin_id, created_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (user_id, start_time.isoformat(), end_time.isoformat(), 
                 restriction_count, admin_id, start_time.isoformat())
            )
            
            restriction_id = cursor.lastrowid
            
            # Reset user's warning count
            conn.execute("DELETE FROM warnings WHERE user_id = ?", (user_id,))
            
            conn.commit()
            
            # Return the created restriction
            row = conn.execute(
                "SELECT * FROM user_restrictions WHERE id = ?",
                (restriction_id,)
            ).fetchone()
            
            return RestrictionRecord.from_db_row(row)
            
        finally:
            conn.close()

    def is_user_restricted(self, user_id: int) -> bool:
        """
        Check if a user is currently restricted.
        
        Args:
            user_id: The ID of the user to check
            
        Returns:
            True if the user has an active restriction, False otherwise
        """
        status = self.get_restriction_status(user_id)
        return status.is_restricted

    def get_restriction_details(self, user_id: int) -> Optional[RestrictionRecord]:
        """
        Get the current active restriction details for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            RestrictionRecord if user has an active restriction, None otherwise
        """
        conn = self._get_connection()
        try:
            row = conn.execute(
                """
                SELECT * FROM user_restrictions 
                WHERE user_id = ? AND is_active = 1 AND restriction_end > datetime('now')
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,)
            ).fetchone()
            
            if row:
                return RestrictionRecord.from_db_row(row)
            return None
            
        finally:
            conn.close()

    def get_restriction_status(self, user_id: int) -> RestrictionStatus:
        """
        Get the restriction status for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            RestrictionStatus object with current restriction information
        """
        restriction = self.get_restriction_details(user_id)
        return RestrictionStatus.from_restriction_record(restriction)

    def deactivate_expired_restrictions(self) -> int:
        """
        Deactivate all expired restrictions.
        
        Returns:
            Number of restrictions that were deactivated
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                UPDATE user_restrictions 
                SET is_active = 0, deactivated_at = datetime('now')
                WHERE is_active = 1 AND restriction_end <= datetime('now')
                """
            )
            
            count = cursor.rowcount
            conn.commit()
            return count
            
        finally:
            conn.close()

    def manually_lift_restriction(self, restriction_id: int, admin_id: int) -> bool:
        """
        Manually lift (deactivate) a restriction.
        
        Args:
            restriction_id: The ID of the restriction to lift
            admin_id: The ID of the admin lifting the restriction
            
        Returns:
            True if the restriction was successfully lifted, False if not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                UPDATE user_restrictions 
                SET is_active = 0, deactivated_at = datetime('now')
                WHERE id = ? AND is_active = 1
                """,
                (restriction_id,)
            )
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
            return success
            
        finally:
            conn.close()

    def modify_restriction_end_time(self, restriction_id: int, new_end_time: datetime, admin_id: int) -> bool:
        """
        Modify the end time of an active restriction.
        
        Args:
            restriction_id: The ID of the restriction to modify
            new_end_time: The new end time for the restriction
            admin_id: The ID of the admin making the modification
            
        Returns:
            True if the restriction was successfully modified, False if not found
        """
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                UPDATE user_restrictions 
                SET restriction_end = ?
                WHERE id = ? AND is_active = 1
                """,
                (new_end_time.isoformat(), restriction_id)
            )
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
            return success
            
        finally:
            conn.close()

    def get_user_restriction_history(self, user_id: int) -> List[RestrictionRecord]:
        """
        Get the complete restriction history for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            List of RestrictionRecord objects, ordered by creation date (newest first)
        """
        conn = self._get_connection()
        try:
            rows = conn.execute(
                """
                SELECT * FROM user_restrictions 
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,)
            ).fetchall()
            
            return [RestrictionRecord.from_db_row(row) for row in rows]
            
        finally:
            conn.close()

    def get_all_active_restrictions(self) -> List[RestrictionRecord]:
        """
        Get all currently active restrictions.
        
        Returns:
            List of RestrictionRecord objects for all active restrictions
        """
        conn = self._get_connection()
        try:
            rows = conn.execute(
                """
                SELECT * FROM user_restrictions 
                WHERE is_active = 1 AND restriction_end > datetime('now')
                ORDER BY restriction_end ASC
                """
            ).fetchall()
            
            return [RestrictionRecord.from_db_row(row) for row in rows]
            
        finally:
            conn.close()

    def process_warning_threshold(self, user_id: int, admin_id: Optional[int] = None) -> Optional[RestrictionRecord]:
        """
        Check if a user has reached the warning threshold and create a restriction if needed.
        
        This method should be called after issuing a warning to check if the user
        has reached the 5-warning threshold.
        
        Args:
            user_id: The ID of the user who received a warning
            admin_id: The ID of the admin who issued the warning
            
        Returns:
            RestrictionRecord if a restriction was created, None otherwise
        """
        if self.check_warning_threshold(user_id):
            try:
                return self.create_restriction(user_id, admin_id)
            except ValueError:
                # User already has an active restriction
                return None
        return None