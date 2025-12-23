/**
 * Badge UI Component
 * Creates and manages the sponsorship status badge overlay
 */

const BadgeManager = (function() {
  'use strict';

  const BADGE_ID = 'h1b-sponsor-badge';
  const BADGE_CONTAINER_ID = 'h1b-sponsor-badge-container';

  /**
   * Get badge colors based on status
   * @param {string} status - Status: 'yes', 'no', or 'unclear'
   * @returns {Object} - Color configuration
   */
  function getBadgeColors(status) {
    switch (status) {
      case 'yes':
        return {
          background: '#057642',
          border: '#034d2e',
          text: '#ffffff',
          icon: '✓'
        };
      case 'no':
        return {
          background: '#c7372f',
          border: '#a02e27',
          text: '#ffffff',
          icon: '✗'
        };
      case 'unclear':
        return {
          background: '#e37318',
          border: '#b85a14',
          text: '#ffffff',
          icon: '?'
        };
      default:
        return {
          background: '#666666',
          border: '#444444',
          text: '#ffffff',
          icon: '?'
        };
    }
  }

  /**
   * Create tooltip text from analysis result
   * @param {Object} analysisResult - Result from analyzer
   * @returns {string} - Tooltip text
   */
  function createTooltipText(analysisResult) {
    const { status, message, matchedKeywords, confidence } = analysisResult;
    
    let tooltip = `${message}\n\n`;
    tooltip += `Confidence: ${confidence.toUpperCase()}\n\n`;
    
    if (matchedKeywords.length > 0) {
      tooltip += `Matched keywords:\n${matchedKeywords.slice(0, 5).join(', ')}`;
      if (matchedKeywords.length > 5) {
        tooltip += ` (+${matchedKeywords.length - 5} more)`;
      }
    } else {
      tooltip += 'No specific keywords found';
    }
    
    return tooltip;
  }

  /**
   * Create the badge element
   * @param {Object} analysisResult - Analysis result from analyzer
   * @returns {HTMLElement} - Badge element
   */
  function createBadge(analysisResult) {
    const { status, message } = analysisResult;
    const colors = getBadgeColors(status);
    
    const badge = document.createElement('div');
    badge.id = BADGE_ID;
    badge.className = 'h1b-sponsor-badge';
    badge.setAttribute('data-status', status);
    badge.setAttribute('title', createTooltipText(analysisResult));
    
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background-color: ${colors.background};
      border: 1px solid ${colors.border};
      border-radius: 16px;
      color: ${colors.text};
      font-size: 13px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: help;
      transition: all 0.2s ease;
      z-index: 10000;
      position: relative;
    `;
    
    // Icon
    const icon = document.createElement('span');
    icon.textContent = colors.icon;
    icon.style.cssText = `
      font-size: 14px;
      font-weight: bold;
    `;
    
    // Text
    const text = document.createElement('span');
    text.textContent = message;
    
    badge.appendChild(icon);
    badge.appendChild(text);
    
    // Hover effect
    badge.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.05)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
    });
    
    badge.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    });
    
    return badge;
  }

  /**
   * Find the best position to inject the badge on LinkedIn job page
   * @returns {HTMLElement|null} - Target container element or null
   */
  function findBadgeContainer() {
    // Try multiple selectors for LinkedIn job page structure
    const selectors = [
      '.jobs-details-top-card__job-title-lockup', // Job title area
      '.jobs-details__main-content .jobs-details-top-card', // Top card container
      '.jobs-search__job-details .jobs-details-top-card', // Search view top card
      '.jobs-details__main-content', // Main content area
      '[data-job-id]' // Any element with job ID
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    // Fallback: look for job title text
    const jobTitle = document.querySelector('h1[class*="job-title"], h2[class*="job-title"]');
    if (jobTitle && jobTitle.parentElement) {
      return jobTitle.parentElement;
    }

    return null;
  }

  /**
   * Inject badge into the page
   * @param {Object} analysisResult - Analysis result
   * @returns {boolean} - True if badge was successfully injected
   */
  function injectBadge(analysisResult) {
    // Remove existing badge if present
    removeBadge();

    const container = findBadgeContainer();
    if (!container) {
      console.warn('H1B Sponsor Extension: Could not find badge container');
      return false;
    }

    const badge = createBadge(analysisResult);

    // Try to insert after job title or at the beginning of container
    const jobTitle = container.querySelector('h1, h2');
    if (jobTitle) {
      // Insert after title element
      jobTitle.parentNode.insertBefore(badge, jobTitle.nextSibling);
    } else {
      // Insert at the beginning of container
      container.insertBefore(badge, container.firstChild);
    }

    // Add a wrapper div for easier styling and positioning
    const wrapper = document.createElement('div');
    wrapper.id = BADGE_CONTAINER_ID;
    wrapper.style.cssText = `
      margin: 8px 0;
      display: flex;
      align-items: center;
    `;
    
    badge.parentNode.insertBefore(wrapper, badge);
    wrapper.appendChild(badge);

    return true;
  }

  /**
   * Remove badge from the page
   */
  function removeBadge() {
    const existingBadge = document.getElementById(BADGE_ID);
    const existingContainer = document.getElementById(BADGE_CONTAINER_ID);
    
    if (existingBadge) {
      existingBadge.remove();
    }
    
    if (existingContainer) {
      existingContainer.remove();
    }

    // Also remove highlights when badge is removed
    try {
      if (typeof Highlighter !== 'undefined') {
        Highlighter.removeHighlights();
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Update existing badge with new analysis result
   * @param {Object} analysisResult - New analysis result
   */
  function updateBadge(analysisResult) {
    const existingBadge = document.getElementById(BADGE_ID);
    
    if (existingBadge) {
      // Remove and re-inject for simplicity
      removeBadge();
    }
    
    injectBadge(analysisResult);
  }

  // Public API
  return {
    injectBadge,
    removeBadge,
    updateBadge
  };
})();

