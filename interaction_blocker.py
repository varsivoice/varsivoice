"""
InteractionBlocker middleware for the User Warning and Restriction System.

This module provides middleware functionality to prevent restricted users from
performing interactions while preserving their viewing capabilities.
"""

from functools import wraps
from typing import Tuple, Optional, Callable, Any
from flask import request, jsonify

from restriction_engine import RestrictionEngine
from restriction_models import RestrictionStatus


class InteractionBlocker:
    """
    Middleware component that prevents restricted users from performing blocked actions.
    
    This class provides validation methods for different types of user interactions
    and decorator functions for protecting API endpoints.
    """

    def __init__(self, restriction_engine: RestrictionEngine):
        """
        Initialize the InteractionBlocker.
        
        Args:
            restriction_engine: RestrictionEngine instance for checking user restrictions
        """
        self.restriction_engine = restriction_engine

    def check_user_can_interact(self, user_id: int) -> Tuple[bool, str]:
        """
        Check if a user can perform any interaction.
        
        Args:
            user_id: The ID of the user to check
            
        Returns:
            Tuple of (can_interact: bool, error_message: str)
            If can_interact is True, error_message will be empty
        """
        try:
            restriction_status = self.restriction_engine.get_restriction_status(user_id)
            
            if not restriction_status.is_restricted:
                return True, ""
            
            # User is restricted - generate appropriate error message
            if restriction_status.remaining_time:
                remaining_human = restriction_status._format_remaining_time()
                error_msg = (
                    f"Your account is currently restricted. "
                    f"You can resume interactions in {remaining_human}. "
                    f"Restriction ends on {restriction_status.restriction_end.strftime('%B %d, %Y at %I:%M %p')}."
                )
            else:
                error_msg = "Your account is currently restricted. Please contact support for assistance."
            
            return False, error_msg
            
        except Exception as e:
            # Log error and allow interaction to prevent system failures
            print(f"Error checking user restriction status: {e}")
            return True, ""

    def validate_post_creation(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can create posts.
        
        Args:
            user_id: The ID of the user attempting to create a post
            
        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot create post: {error_msg}"
        return True, ""

    def validate_comment_creation(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can create comments.
        
        Args:
            user_id: The ID of the user attempting to create a comment
            
        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot create comment: {error_msg}"
        return True, ""

    def validate_reaction_creation(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can create reactions.
        
        Args:
            user_id: The ID of the user attempting to create a reaction
            
        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot add reaction: {error_msg}"
        return True, ""

    def validate_content_editing(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can edit content (posts or comments).
        
        Args:
            user_id: The ID of the user attempting to edit content
            
        Returns:
            Tuple of (can_edit: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot edit content: {error_msg}"
        return True, ""

    def validate_submission_creation(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can create writer submissions.
        
        Args:
            user_id: The ID of the user attempting to create a submission
            
        Returns:
            Tuple of (can_create: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot submit to writers hub: {error_msg}"
        return True, ""

    def validate_submission_editing(self, user_id: int) -> Tuple[bool, str]:
        """
        Validate if a user can edit writer submissions.
        
        Args:
            user_id: The ID of the user attempting to edit a submission
            
        Returns:
            Tuple of (can_edit: bool, error_message: str)
        """
        can_interact, error_msg = self.check_user_can_interact(user_id)
        if not can_interact:
            return False, f"Cannot edit submission: {error_msg}"
        return True, ""


# Decorator functions for protecting API endpoints

def require_interaction_permission(interaction_blocker: InteractionBlocker, 
                                 validation_method: str = "check_user_can_interact"):
    """
    Decorator to protect API endpoints from restricted users.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        validation_method: Name of the validation method to use
        
    Returns:
        Decorator function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Extract user_id from request data
            user_id = None
            
            # Try to get user_id from different sources
            if request.method == "POST" or request.method == "PUT":
                # Try form data first (multipart requests)
                if hasattr(request, 'form') and 'user_id' in request.form:
                    try:
                        user_id = int(request.form.get('user_id'))
                    except (TypeError, ValueError):
                        pass
                
                # Try JSON data if form data didn't work
                if user_id is None:
                    try:
                        data = request.get_json(force=True, silent=True) or {}
                        user_id = int(data.get('user_id', 0))
                    except (TypeError, ValueError):
                        pass
            
            # Try URL parameters for GET requests or as fallback
            if user_id is None:
                try:
                    user_id = int(request.args.get('user_id', 0))
                except (TypeError, ValueError):
                    pass
            
            # If we still don't have a user_id, let the original function handle it
            if user_id is None or user_id == 0:
                return f(*args, **kwargs)
            
            # Get the validation method
            validator = getattr(interaction_blocker, validation_method)
            can_interact, error_msg = validator(user_id)
            
            if not can_interact:
                # Get restriction status for additional information
                try:
                    restriction_status = interaction_blocker.restriction_engine.get_restriction_status(user_id)
                    response_data = {
                        "error": error_msg,
                        "restriction_active": True,
                        "restriction_end": restriction_status.restriction_end.isoformat() if restriction_status.restriction_end else None,
                        "remaining_time_seconds": int(restriction_status.remaining_time.total_seconds()) if restriction_status.remaining_time else 0,
                        "remaining_time_human": restriction_status._format_remaining_time() if restriction_status.remaining_time else "Expired",
                        "can_appeal": restriction_status.can_appeal
                    }
                except Exception:
                    response_data = {
                        "error": error_msg,
                        "restriction_active": True
                    }
                
                return jsonify(response_data), 403
            
            # User can interact, proceed with original function
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_post_creation_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for post creation endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    return require_interaction_permission(interaction_blocker, "validate_post_creation")


def require_comment_creation_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for comment creation endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    return require_interaction_permission(interaction_blocker, "validate_comment_creation")


def require_reaction_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for reaction endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Extract user_id from request data
            user_id = None
            
            # Try to get user_id from different sources
            if request.method == "POST" or request.method == "PUT":
                # Try form data first (multipart requests)
                if hasattr(request, 'form') and 'user_id' in request.form:
                    try:
                        user_id = int(request.form.get('user_id'))
                    except (TypeError, ValueError):
                        pass
                
                # Try JSON data if form data didn't work
                if user_id is None:
                    try:
                        data = request.get_json(force=True, silent=True) or {}
                        user_id = int(data.get('user_id', 0))
                        
                        # Handle legacy likes endpoint with token format
                        if user_id == 0:
                            token = data.get('token', '') or data.get('user_token', '')
                            if token.startswith('user_'):
                                try:
                                    user_id = int(token.replace('user_', ''))
                                except (TypeError, ValueError):
                                    pass
                    except (TypeError, ValueError):
                        pass
            
            # Try URL parameters for GET requests or as fallback
            if user_id is None:
                try:
                    user_id = int(request.args.get('user_id', 0))
                except (TypeError, ValueError):
                    pass
            
            # If we still don't have a user_id, let the original function handle it
            if user_id is None or user_id == 0:
                return f(*args, **kwargs)
            
            # Check if user can create reactions
            can_interact, error_msg = interaction_blocker.validate_reaction_creation(user_id)
            
            if not can_interact:
                # Get restriction status for additional information
                try:
                    restriction_status = interaction_blocker.restriction_engine.get_restriction_status(user_id)
                    response_data = {
                        "error": error_msg,
                        "restriction_active": True,
                        "restriction_end": restriction_status.restriction_end.isoformat() if restriction_status.restriction_end else None,
                        "remaining_time_seconds": int(restriction_status.remaining_time.total_seconds()) if restriction_status.remaining_time else 0,
                        "remaining_time_human": restriction_status._format_remaining_time() if restriction_status.remaining_time else "Expired",
                        "can_appeal": restriction_status.can_appeal
                    }
                except Exception:
                    response_data = {
                        "error": error_msg,
                        "restriction_active": True
                    }
                
                return jsonify(response_data), 403
            
            # User can interact, proceed with original function
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_content_editing_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for content editing endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    return require_interaction_permission(interaction_blocker, "validate_content_editing")


def require_submission_creation_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for submission creation endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    return require_interaction_permission(interaction_blocker, "validate_submission_creation")


def require_submission_editing_permission(interaction_blocker: InteractionBlocker):
    """
    Decorator specifically for submission editing endpoints.
    
    Args:
        interaction_blocker: InteractionBlocker instance
        
    Returns:
        Decorator function
    """
    return require_interaction_permission(interaction_blocker, "validate_submission_editing")


# Helper function to extract user_id from various request sources
def extract_user_id_from_request() -> Optional[int]:
    """
    Extract user_id from request data (form, JSON, or query parameters).
    
    Returns:
        User ID if found and valid, None otherwise
    """
    user_id = None
    
    # Try form data first (multipart requests)
    if hasattr(request, 'form') and 'user_id' in request.form:
        try:
            user_id = int(request.form.get('user_id'))
        except (TypeError, ValueError):
            pass
    
    # Try JSON data if form data didn't work
    if user_id is None:
        try:
            data = request.get_json(force=True, silent=True) or {}
            user_id = int(data.get('user_id', 0))
        except (TypeError, ValueError):
            pass
    
    # Try URL parameters as fallback
    if user_id is None:
        try:
            user_id = int(request.args.get('user_id', 0))
        except (TypeError, ValueError):
            pass
    
    return user_id if user_id and user_id > 0 else None


# Helper function to create restriction error response
def create_restriction_error_response(restriction_status: RestrictionStatus, 
                                    action_description: str = "perform this action") -> Tuple[dict, int]:
    """
    Create a standardized error response for restricted users.
    
    Args:
        restriction_status: RestrictionStatus object with restriction details
        action_description: Description of the action being blocked
        
    Returns:
        Tuple of (response_dict, http_status_code)
    """
    if restriction_status.remaining_time:
        remaining_human = restriction_status._format_remaining_time()
        error_msg = (
            f"You cannot {action_description} while your account is restricted. "
            f"You can resume interactions in {remaining_human}. "
            f"Restriction ends on {restriction_status.restriction_end.strftime('%B %d, %Y at %I:%M %p')}."
        )
    else:
        error_msg = f"You cannot {action_description} while your account is restricted. Please contact support for assistance."
    
    response_data = {
        "error": error_msg,
        "restriction_active": True,
        "restriction_end": restriction_status.restriction_end.isoformat() if restriction_status.restriction_end else None,
        "remaining_time_seconds": int(restriction_status.remaining_time.total_seconds()) if restriction_status.remaining_time else 0,
        "remaining_time_human": restriction_status._format_remaining_time() if restriction_status.remaining_time else "Expired",
        "can_appeal": restriction_status.can_appeal,
        "restriction_count": restriction_status.restriction_count
    }
    
    return response_data, 403