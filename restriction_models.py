"""
Data models for the User Warning and Restriction System.

This module defines the core data structures used throughout the restriction system,
including database records and status objects.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class RestrictionRecord:
    """
    Represents a user restriction record from the database.
    
    This class maps directly to the user_restrictions table and contains
    all the information about a specific restriction applied to a user.
    """
    id: int
    user_id: int
    restriction_start: datetime
    restriction_end: datetime
    restriction_count: int
    is_active: bool
    created_by_admin_id: Optional[int] = None
    created_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None

    @classmethod
    def from_db_row(cls, row) -> 'RestrictionRecord':
        """
        Create a RestrictionRecord from a database row.
        
        Args:
            row: SQLite row object from user_restrictions table
            
        Returns:
            RestrictionRecord instance
        """
        # Handle both SQLite Row objects and dict-like objects
        def safe_get(key, default=None):
            try:
                return row[key] if row[key] is not None else default
            except (KeyError, TypeError):
                return default
        
        return cls(
            id=row['id'],
            user_id=row['user_id'],
            restriction_start=datetime.fromisoformat(row['restriction_start']),
            restriction_end=datetime.fromisoformat(row['restriction_end']),
            restriction_count=row['restriction_count'],
            is_active=bool(row['is_active']),
            created_by_admin_id=safe_get('created_by_admin_id'),
            created_at=datetime.fromisoformat(safe_get('created_at')) if safe_get('created_at') else None,
            deactivated_at=datetime.fromisoformat(safe_get('deactivated_at')) if safe_get('deactivated_at') else None
        )

    def to_dict(self) -> dict:
        """
        Convert the restriction record to a dictionary for JSON serialization.
        
        Returns:
            Dictionary representation of the restriction record
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'restriction_start': self.restriction_start.isoformat(),
            'restriction_end': self.restriction_end.isoformat(),
            'restriction_count': self.restriction_count,
            'is_active': self.is_active,
            'created_by_admin_id': self.created_by_admin_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'deactivated_at': self.deactivated_at.isoformat() if self.deactivated_at else None
        }

    @property
    def remaining_time(self) -> Optional[timedelta]:
        """
        Calculate the remaining time in the restriction period.
        
        Returns:
            Timedelta representing remaining time, or None if restriction has expired
        """
        if not self.is_active:
            return None
        
        now = datetime.now()
        if now >= self.restriction_end:
            return None
        
        return self.restriction_end - now

    @property
    def is_expired(self) -> bool:
        """
        Check if the restriction has expired.
        
        Returns:
            True if the restriction end time has passed, False otherwise
        """
        return datetime.now() >= self.restriction_end


@dataclass
class RestrictionStatus:
    """
    Represents the current restriction status of a user.
    
    This class provides a simplified view of a user's restriction state,
    used primarily for API responses and UI display.
    """
    is_restricted: bool
    restriction_end: Optional[datetime] = None
    remaining_time: Optional[timedelta] = None
    restriction_count: int = 0
    can_appeal: bool = False
    restriction_id: Optional[int] = None

    @classmethod
    def from_restriction_record(cls, record: Optional[RestrictionRecord]) -> 'RestrictionStatus':
        """
        Create a RestrictionStatus from a RestrictionRecord.
        
        Args:
            record: RestrictionRecord instance or None if user is not restricted
            
        Returns:
            RestrictionStatus instance
        """
        if not record or not record.is_active or record.is_expired:
            return cls(is_restricted=False)
        
        return cls(
            is_restricted=True,
            restriction_end=record.restriction_end,
            remaining_time=record.remaining_time,
            restriction_count=record.restriction_count,
            can_appeal=True,  # Users can always appeal restrictions
            restriction_id=record.id
        )

    @classmethod
    def unrestricted(cls) -> 'RestrictionStatus':
        """
        Create a RestrictionStatus for an unrestricted user.
        
        Returns:
            RestrictionStatus instance indicating no active restriction
        """
        return cls(is_restricted=False)

    def to_dict(self) -> dict:
        """
        Convert the restriction status to a dictionary for JSON serialization.
        
        Returns:
            Dictionary representation of the restriction status
        """
        result = {
            'is_restricted': self.is_restricted,
            'restriction_count': self.restriction_count,
            'can_appeal': self.can_appeal
        }
        
        if self.is_restricted:
            result.update({
                'restriction_end': self.restriction_end.isoformat() if self.restriction_end else None,
                'remaining_time_seconds': int(self.remaining_time.total_seconds()) if self.remaining_time else 0,
                'remaining_time_human': self._format_remaining_time(),
                'restriction_id': self.restriction_id
            })
        
        return result

    def _format_remaining_time(self) -> str:
        """
        Format the remaining time in a human-readable format.
        
        Returns:
            Human-readable string representing the remaining time
        """
        if not self.remaining_time:
            return "Expired"
        
        total_seconds = int(self.remaining_time.total_seconds())
        
        if total_seconds <= 0:
            return "Expired"
        
        days = total_seconds // 86400
        hours = (total_seconds % 86400) // 3600
        minutes = (total_seconds % 3600) // 60
        
        if days > 0:
            if hours > 0:
                return f"{days} day{'s' if days != 1 else ''}, {hours} hour{'s' if hours != 1 else ''}"
            else:
                return f"{days} day{'s' if days != 1 else ''}"
        elif hours > 0:
            if minutes > 0:
                return f"{hours} hour{'s' if hours != 1 else ''}, {minutes} minute{'s' if minutes != 1 else ''}"
            else:
                return f"{hours} hour{'s' if hours != 1 else ''}"
        else:
            return f"{minutes} minute{'s' if minutes != 1 else ''}"


# Progressive cooldown configuration
COOLDOWN_PERIODS = {
    1: 1,      # 1 day
    2: 7,      # 1 week  
    3: 14,     # 2 weeks
    4: 30,     # 1 month
    5: 90      # 3 months (and all subsequent)
}


def get_cooldown_period(restriction_count: int) -> int:
    """
    Get the cooldown period in days for a given restriction count.
    
    Args:
        restriction_count: The number of times the user has been restricted
        
    Returns:
        Number of days for the cooldown period
    """
    if restriction_count >= 5:
        return COOLDOWN_PERIODS[5]
    return COOLDOWN_PERIODS.get(restriction_count, 1)