/**
 * Content Script - Main entry point for the extension
 * Handles page detection, job description extraction, and badge management
 */

(function () {
  'use strict';

  let currentJobId = null;
  let currentJobDescriptionHash = null;
  let isProcessing = false;
  let observer = null;
  let checkInterval = null;

  /**
   * Check if current URL is a LinkedIn job page
   * @returns {boolean}
   */
  function isLinkedInJobPage() {
    const url = window.location.href;
    const path = window.location.pathname;

    // Check for job search page with currentJobId parameter
    if (path.includes('/jobs/search') && url.includes('currentJobId=')) {
      return true;
    }

    // Check for direct job view page (with or without trailing slash)
    // Examples: /jobs/view/4345903518/ or /jobs/view/4345903518
    if (path.match(/\/jobs\/view\/\d+\/?/)) {
      return true;
    }

    // Check for job collections (recommended, featured, etc.)
    // Examples: /jobs/collections/recommended/?currentJobId=123, /jobs/collections/featured/?currentJobId=456
    if (path.includes('/jobs/collections/')) {
      return true;
    }

    return false;
  }

  /**
   * Extract job ID from URL
   * @returns {string|null} - Job ID or null if not found
   */
  function extractJobId() {
    const url = window.location.href;
    const path = window.location.pathname;

    // Try to get from currentJobId query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const jobIdFromQuery = urlParams.get('currentJobId');
    if (jobIdFromQuery) {
      return jobIdFromQuery;
    }

    // Try to extract from /jobs/view/{id}/ path (with or without trailing slash)
    const viewMatch = path.match(/\/jobs\/view\/(\d+)\/?/);
    if (viewMatch && viewMatch[1]) {
      return viewMatch[1];
    }

    // Try to find job ID in page data attributes or meta tags
    const jobIdElement = document.querySelector('[data-job-id]');
    if (jobIdElement) {
      return jobIdElement.getAttribute('data-job-id');
    }

    return null;
  }

  /**
   * Create a simple hash of the job description for comparison
   * @param {string} text - Job description text
   * @returns {string} - Hash string (first 200 chars + length)
   */
  function hashJobDescription(text) {
    if (!text) return null;
    // Use first 200 chars + total length as a simple hash
    const preview = text.substring(0, 200).trim();
    return preview + '|' + text.length;
  }

  /**
   * Extract job description text from the page
   * @returns {string|null} - Job description text or null if not found
   */
  function extractJobDescription() {
    // Try multiple selectors for job description (LinkedIn may use different selectors)
    const selectors = [
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '.jobs-description__text',
      '.jobs-box__html-content',
      '[class*="jobs-description"]',
      '[class*="description-content"]',
      '.jobs-description-content',
      '.jobs-box--fadeout'
    ];

    let descriptionText = '';

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        // Get text content, removing extra whitespace
        const text = element.textContent || element.innerText || '';
        if (text.trim().length > 100) { // Minimum length threshold
          descriptionText += ' ' + text.trim();
        }
      }
    }

    // If no description found with selectors, try getting all text from main content
    if (!descriptionText.trim()) {
      const mainContent = document.querySelector('.jobs-details__main-content, .jobs-search__job-details');
      if (mainContent) {
        // Get text but exclude navigation and other non-description elements
        const clone = mainContent.cloneNode(true);
        const excludeSelectors = ['nav', 'header', 'footer', 'button', '.jobs-details-top-card'];
        excludeSelectors.forEach(sel => {
          const elements = clone.querySelectorAll(sel);
          elements.forEach(el => el.remove());
        });
        descriptionText = clone.textContent || '';
      }
    }

    return descriptionText.trim() || null;
  }

  /**
   * Process the current job page
   * @param {boolean} force - Force reprocessing even if job ID hasn't changed
   */
  function processJobPage(force = false) {
    if (isProcessing && !force) {
      return;
    }

    if (!isLinkedInJobPage()) {
      return;
    }

    const jobId = extractJobId();
    const description = extractJobDescription();

    // Create hash of current description
    const descriptionHash = hashJobDescription(description);

    // Check if we need to process (job ID changed OR description content changed)
    const jobIdChanged = jobId !== currentJobId;
    const descriptionChanged = descriptionHash !== currentJobDescriptionHash;

    // If same job ID and same description, don't reprocess (unless forced)
    if (!force && !jobIdChanged && !descriptionChanged && document.getElementById('h1b-sponsor-badge')) {
      return;
    }

    // If we don't have a description yet, wait a bit for LinkedIn to load it
    if (!description) {
      // Don't process if we're waiting for description to load
      if (!force && currentJobId === jobId) {
        return;
      }
      // Wait for description to load
      setTimeout(() => processJobPage(force), 300);
      return;
    }

    isProcessing = true;
    currentJobId = jobId;
    currentJobDescriptionHash = descriptionHash;

    // Analyze the job description
    const analysisResult = Analyzer.analyze(description);

    // Inject or update badge
    if (document.getElementById('h1b-sponsor-badge')) {
      BadgeManager.updateBadge(analysisResult);
    } else {
      BadgeManager.injectBadge(analysisResult);
    }

    // Highlight sentences if no sponsorship detected
    try {
      if (analysisResult.status === 'no') {
        // Small delay to ensure DOM is ready for highlighting
        setTimeout(() => {
          if (typeof Highlighter !== 'undefined') {
            Highlighter.highlight(analysisResult, description);
          }
        }, 100);
      } else {
        if (typeof Highlighter !== 'undefined') {
          Highlighter.removeHighlights();
        }
      }
    } catch (error) {
      // Silently fail - don't break the extension
    }

    isProcessing = false;
  }

  /**
   * Handle URL changes (LinkedIn is a SPA, so we need to monitor this)
   */
  function handleUrlChange() {
    const newJobId = extractJobId();

    // If job ID changed, process the new page
    if (newJobId !== currentJobId) {
      currentJobId = null;
      currentJobDescriptionHash = null;
      BadgeManager.removeBadge();
      Highlighter.removeHighlights();
      // Small delay to let LinkedIn load the new job content
      setTimeout(() => processJobPage(true), 200);
    }
  }

  /**
   * Check if job content has changed (periodic check)
   */
  function checkForJobChange() {
    if (isProcessing) return;

    const jobId = extractJobId();
    const description = extractJobDescription();
    const descriptionHash = hashJobDescription(description);

    // If job ID or description content changed, reprocess
    if (jobId !== currentJobId || descriptionHash !== currentJobDescriptionHash) {
      if (jobId !== currentJobId) {
        currentJobId = null;
        currentJobDescriptionHash = null;
        BadgeManager.removeBadge();
        Highlighter.removeHighlights();
      }
      processJobPage(true);
    }
  }

  /**
   * Initialize the extension
   */
  function init() {
    // Process current page
    processJobPage();

    // Monitor URL changes (LinkedIn uses pushState for navigation)
    let lastUrl = window.location.href;

    // Override pushState and replaceState to detect navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(history, arguments);
      setTimeout(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          handleUrlChange();
        }
      }, 100);
    };

    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);
      setTimeout(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          handleUrlChange();
        }
      }, 100);
    };

    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          handleUrlChange();
        }
      }, 100);
    });

    // Use MutationObserver to detect when job description content is loaded/updated
    // Throttle the observer callback to avoid excessive processing
    let observerTimeout = null;
    observer = new MutationObserver((mutations) => {
      // Check if mutations affect job description areas
      const affectsJobContent = mutations.some(mutation => {
        const target = mutation.target;
        if (!target || !target.classList) return false;

        // Check if mutation is in job-related containers
        const jobSelectors = [
          '.jobs-description',
          '.jobs-details',
          '.jobs-search__job-details',
          '[class*="jobs-description"]',
          '[class*="job-details"]'
        ];

        return jobSelectors.some(selector => {
          try {
            return target.matches && target.matches(selector) ||
              target.closest && target.closest(selector);
          } catch (e) {
            return false;
          }
        });
      });

      if (affectsJobContent) {
        // Debounce the check
        clearTimeout(observerTimeout);
        observerTimeout = setTimeout(() => {
          checkForJobChange();
        }, 300);
      }
    });

    // Start observing the document body for changes
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } else {
      // Wait for body to be available
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
      });
    }

    // Also set up a periodic check as a fallback (every 2 seconds)
    // This helps catch cases where mutations aren't detected
    checkInterval = setInterval(() => {
      if (isLinkedInJobPage()) {
        checkForJobChange();
      }
    }, 2000);

    // Listen for clicks on job list items (additional detection method)
    document.addEventListener('click', (e) => {
      // Check if click is on a job list item
      const jobListItem = e.target.closest('[data-job-id], [class*="job-card"], [class*="jobs-search-result"]');
      if (jobListItem) {
        // Job item clicked, wait a bit then check for changes
        setTimeout(() => {
          checkForJobChange();
        }, 500);
      }
    }, true); // Use capture phase to catch clicks early
  }

  // Initialize when script loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }
})();

