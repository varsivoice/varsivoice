/**
 * RestrictionStatusDisplay - Frontend component for displaying user restriction status
 * 
 * This component handles:
 * - Restriction banner display for restricted users
 * - Countdown timer showing remaining restriction time
 * - Restriction status information in user interface
 * - Modal dialogs for restriction explanations
 */

class RestrictionStatusDisplay {
    constructor() {
        this.currentUserId = null;
        this.restrictionStatus = null;
        this.countdownInterval = null;
        this.bannerElement = null;
        
        this.init();
    }

    /**
     * Initialize the restriction status display system
     */
    init() {
        // Get current user ID from the page
        this.getCurrentUserId();
        
        // Create restriction banner container
        this.createBannerContainer();
        
        // Check restriction status on page load
        this.checkRestrictionStatus();
        
        // Set up periodic status checks (every 30 seconds)
        setInterval(() => {
            this.checkRestrictionStatus();
        }, 30000);
        
        // Set up interaction button listeners
        this.setupInteractionListeners();
    }

    /**
     * Get current user ID from the page
     */
    getCurrentUserId() {
        // Try to get from shared auth session (primary method)
        try {
            const sessionData = window.AuthSession ? window.AuthSession.getRaw() : sessionStorage.getItem('ub_session');
            if (sessionData) {
                const parsed = JSON.parse(sessionData);
                if (parsed && parsed.user_id) {
                    this.currentUserId = parsed.user_id;
                    return;
                }
            }
        } catch (e) {
            console.log('Could not get user ID from auth session:', e);
        }
        
        // Try to get from global variable (if set by the page)
        if (typeof window.currentUserId !== 'undefined') {
            this.currentUserId = window.currentUserId;
            return;
        }
        
        // Try to get from data attribute on body
        const bodyUserId = document.body.getAttribute('data-user-id');
        if (bodyUserId) {
            this.currentUserId = parseInt(bodyUserId);
            return;
        }
        
        // Try to get from a user info element
        const userInfoElement = document.querySelector('[data-user-id]');
        if (userInfoElement) {
            this.currentUserId = parseInt(userInfoElement.getAttribute('data-user-id'));
            return;
        }
        
        console.log('RestrictionStatusDisplay: Could not determine current user ID');
    }

    /**
     * Create the restriction banner container
     */
    createBannerContainer() {
        // Check if banner already exists
        if (document.getElementById('restriction-banner')) {
            return;
        }
        
        // Create banner element
        this.bannerElement = document.createElement('div');
        this.bannerElement.id = 'restriction-banner';
        this.bannerElement.className = 'restriction-banner hidden';
        this.bannerElement.innerHTML = `
            <div class="restriction-banner-content">
                <div class="restriction-icon">⚠️</div>
                <div class="restriction-message">
                    <div class="restriction-title">Account Restricted</div>
                    <div class="restriction-details"></div>
                    <div class="restriction-countdown"></div>
                </div>
                <button class="restriction-close" onclick="restrictionStatusDisplay.hideBanner()">&times;</button>
            </div>
        `;
        
        // Insert banner at the top of the page
        const targetContainer = document.querySelector('main') || document.querySelector('.container') || document.body;
        targetContainer.insertBefore(this.bannerElement, targetContainer.firstChild);
        
        // Add CSS styles
        this.addBannerStyles();
    }

    /**
     * Add CSS styles for the restriction banner
     */
    addBannerStyles() {
        if (document.getElementById('restriction-banner-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'restriction-banner-styles';
        style.textContent = `
            .restriction-banner {
                background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                color: white;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(238, 90, 82, 0.3);
                position: relative;
                animation: slideDown 0.3s ease-out;
            }
            
            .restriction-banner.hidden {
                display: none;
            }
            
            .restriction-banner-content {
                display: flex;
                align-items: center;
                gap: 15px;
            }
            
            .restriction-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .restriction-message {
                flex: 1;
            }
            
            .restriction-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .restriction-details {
                font-size: 14px;
                opacity: 0.9;
                margin-bottom: 5px;
            }
            
            .restriction-countdown {
                font-size: 13px;
                font-weight: bold;
                background: rgba(255, 255, 255, 0.2);
                padding: 4px 8px;
                border-radius: 4px;
                display: inline-block;
            }
            
            .restriction-close {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            
            .restriction-close:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .interaction-disabled {
                opacity: 0.6;
                pointer-events: none;
                position: relative;
            }
            
            .interaction-disabled::after {
                content: "🚫";
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 20px;
                z-index: 10;
            }
            
            .restriction-tooltip {
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                position: absolute;
                z-index: 1000;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            
            .restriction-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .restriction-modal-content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            
            .restriction-modal h3 {
                color: #ee5a52;
                margin-bottom: 15px;
            }
            
            .restriction-modal p {
                margin-bottom: 15px;
                line-height: 1.5;
            }
            
            .restriction-modal button {
                background: #ee5a52;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .restriction-modal button:hover {
                background: #d64545;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Check current user's restriction status
     */
    async checkRestrictionStatus() {
        if (!this.currentUserId) {
            return;
        }
        
        try {
            const response = await fetch(`/api/user/restriction-status?user_id=${this.currentUserId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.updateRestrictionStatus(data);
            } else {
                console.error('Failed to fetch restriction status:', response.status);
            }
        } catch (error) {
            console.error('Error checking restriction status:', error);
        }
    }

    /**
     * Update the restriction status display
     */
    updateRestrictionStatus(status) {
        this.restrictionStatus = status;
        
        if (status.is_restricted) {
            this.showRestrictionBanner(status);
            this.disableInteractionButtons();
            this.startCountdown(status);
        } else {
            this.hideRestrictionBanner();
            this.enableInteractionButtons();
            this.stopCountdown();
        }
    }

    /**
     * Show the restriction banner
     */
    showRestrictionBanner(status) {
        if (!this.bannerElement) {
            return;
        }
        
        const detailsElement = this.bannerElement.querySelector('.restriction-details');
        const countdownElement = this.bannerElement.querySelector('.restriction-countdown');
        
        // Update banner content
        if (status.restriction_end) {
            const endDate = new Date(status.restriction_end);
            detailsElement.textContent = `Your account is restricted until ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}.`;
        } else {
            detailsElement.textContent = 'Your account is currently restricted. Please contact support for assistance.';
        }
        
        // Show countdown if there's remaining time
        if (status.remaining_time_human && status.remaining_time_seconds > 0) {
            countdownElement.textContent = `Time remaining: ${status.remaining_time_human}`;
            countdownElement.style.display = 'inline-block';
        } else {
            countdownElement.style.display = 'none';
        }
        
        // Show banner
        this.bannerElement.classList.remove('hidden');
    }

    /**
     * Hide the restriction banner
     */
    hideRestrictionBanner() {
        if (this.bannerElement) {
            this.bannerElement.classList.add('hidden');
        }
    }

    /**
     * Hide banner (called by close button)
     */
    hideBanner() {
        this.hideRestrictionBanner();
    }

    /**
     * Start countdown timer
     */
    startCountdown(status) {
        this.stopCountdown(); // Clear any existing countdown
        
        if (!status.remaining_time_seconds || status.remaining_time_seconds <= 0) {
            return;
        }
        
        let remainingSeconds = status.remaining_time_seconds;
        
        this.countdownInterval = setInterval(() => {
            remainingSeconds--;
            
            if (remainingSeconds <= 0) {
                this.stopCountdown();
                this.checkRestrictionStatus(); // Refresh status
                return;
            }
            
            // Update countdown display
            const countdownElement = this.bannerElement?.querySelector('.restriction-countdown');
            if (countdownElement) {
                const timeString = this.formatTimeRemaining(remainingSeconds);
                countdownElement.textContent = `Time remaining: ${timeString}`;
            }
        }, 1000);
    }

    /**
     * Stop countdown timer
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Format remaining time in human-readable format
     */
    formatTimeRemaining(seconds) {
        if (seconds <= 0) return 'Expired';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (days > 0) {
            return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
        } else if (hours > 0) {
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    /**
     * Disable interaction buttons for restricted users
     */
    disableInteractionButtons() {
        const interactionSelectors = [
            // Generic button selectors
            'button[type="submit"]',
            'input[type="submit"]',
            '.btn-primary',
            '.btn-submit',
            
            // Specific action buttons
            'button[onclick*="Post"]',
            'button[onclick*="Comment"]',
            'button[onclick*="Like"]',
            'button[onclick*="React"]',
            'button[onclick*="Edit"]',
            'button[onclick*="Submit"]',
            
            // Class-based selectors
            '.post-actions button',
            '.comment-actions button',
            '.reaction-button',
            '.like-button',
            '.edit-button',
            '.submit-button',
            '.create-button',
            
            // Form submit buttons
            'form button[type="submit"]',
            'form input[type="submit"]',
            
            // Common interaction elements
            '.interaction-btn',
            '.action-btn'
        ];
        
        interactionSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Skip if already disabled or if it's a navigation/safe button
                if (element.classList.contains('interaction-disabled') || 
                    element.classList.contains('nav-btn') ||
                    element.classList.contains('safe-action')) {
                    return;
                }
                
                element.classList.add('interaction-disabled');
                element.setAttribute('data-restriction-blocked', 'true');
                
                // Add tooltip
                element.addEventListener('mouseenter', this.showRestrictionTooltip.bind(this));
                element.addEventListener('mouseleave', this.hideRestrictionTooltip.bind(this));
            });
        });
    }

    /**
     * Enable interaction buttons for unrestricted users
     */
    enableInteractionButtons() {
        const disabledElements = document.querySelectorAll('.interaction-disabled');
        disabledElements.forEach(element => {
            element.classList.remove('interaction-disabled');
            element.removeAttribute('data-restriction-blocked');
            
            // Remove tooltip listeners
            element.removeEventListener('mouseenter', this.showRestrictionTooltip.bind(this));
            element.removeEventListener('mouseleave', this.hideRestrictionTooltip.bind(this));
        });
    }

    /**
     * Show restriction tooltip on hover
     */
    showRestrictionTooltip(event) {
        const element = event.target;
        
        if (!element.hasAttribute('data-restriction-blocked')) {
            return;
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'restriction-tooltip';
        tooltip.textContent = 'This action is blocked while your account is restricted';
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
        
        element._restrictionTooltip = tooltip;
    }

    /**
     * Hide restriction tooltip
     */
    hideRestrictionTooltip(event) {
        const element = event.target;
        
        if (element._restrictionTooltip) {
            element._restrictionTooltip.remove();
            delete element._restrictionTooltip;
        }
    }

    /**
     * Set up interaction listeners to show restriction modals
     */
    setupInteractionListeners() {
        // Listen for clicks on disabled interaction elements
        document.addEventListener('click', (event) => {
            const element = event.target;
            
            if (element.hasAttribute('data-restriction-blocked')) {
                event.preventDefault();
                event.stopPropagation();
                this.showRestrictionModal();
                return false;
            }
        }, true);
    }

    /**
     * Show restriction explanation modal
     */
    showRestrictionModal() {
        if (!this.restrictionStatus || !this.restrictionStatus.is_restricted) {
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'restriction-modal';
        
        const endDate = this.restrictionStatus.restriction_end ? 
            new Date(this.restrictionStatus.restriction_end).toLocaleString() : 'Unknown';
        
        const timeRemaining = this.restrictionStatus.remaining_time_human || 'Unknown';
        
        modal.innerHTML = `
            <div class="restriction-modal-content">
                <h3>Action Blocked</h3>
                <p>Your account is currently restricted and you cannot perform this action.</p>
                <p><strong>Restriction ends:</strong> ${endDate}</p>
                <p><strong>Time remaining:</strong> ${timeRemaining}</p>
                ${this.restrictionStatus.can_appeal ? 
                    '<p>If you believe this restriction was applied in error, you can contact support to appeal.</p>' : 
                    ''}
                <button onclick="this.closest(\'.restriction-modal\').remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove modal after 10 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    /**
     * Check if current user is restricted
     */
    isRestricted() {
        return this.restrictionStatus && this.restrictionStatus.is_restricted;
    }

    /**
     * Get current restriction status
     */
    getRestrictionStatus() {
        return this.restrictionStatus;
    }
}

// Initialize the restriction status display when DOM is ready
let restrictionStatusDisplay;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        restrictionStatusDisplay = new RestrictionStatusDisplay();
    });
} else {
    restrictionStatusDisplay = new RestrictionStatusDisplay();
}

// Export for use in other scripts
window.RestrictionStatusDisplay = RestrictionStatusDisplay;
window.restrictionStatusDisplay = restrictionStatusDisplay;
