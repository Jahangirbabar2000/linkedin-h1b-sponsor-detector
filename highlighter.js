/**
 * Highlighter Module
 * Highlights sentences in job descriptions that indicate no sponsorship
 */

const Highlighter = (function () {
  'use strict';

  const HIGHLIGHT_CLASS = 'h1b-sponsor-highlight';

  /**
   * Extract sentence containing a match
   * @param {string} text - Full text
   * @param {number} matchIndex - Index where match was found
   * @param {number} matchLength - Length of the match
   * @returns {string|null} - The sentence containing the match
   */
  function extractSentence(text, matchIndex, matchLength) {
    // Find sentence boundaries
    const sentenceEndRegex = /[.!?]\s+|$/g;
    let start = 0;
    let end = text.length;

    // Find sentence end after the match
    sentenceEndRegex.lastIndex = matchIndex + matchLength;
    const endMatch = sentenceEndRegex.exec(text);
    if (endMatch) {
      end = endMatch.index + endMatch[0].length;
    }

    // Find sentence start before the match
    sentenceEndRegex.lastIndex = 0;
    let startMatch;
    while ((startMatch = sentenceEndRegex.exec(text)) !== null) {
      if (startMatch.index + startMatch[0].length >= matchIndex) {
        start = startMatch.index === 0 ? 0 : startMatch.index + startMatch[0].length;
        break;
      }
    }

    const sentence = text.substring(start, end).trim();
    return sentence.length > 10 ? sentence : null;
  }

  /**
   * Highlight text in a DOM element by wrapping matched phrase in a span
   * @param {Element} element - Element to search in
   * @param {string} phrase - Phrase to highlight
   */
  function highlightPhraseInElement(element, phrase) {
    try {
      const phraseTrimmed = phrase.trim();
      const phraseLower = phraseTrimmed.toLowerCase();
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let textNode;
      while ((textNode = walker.nextNode())) {
        // Skip if already inside a highlight
        if (textNode.parentElement && textNode.parentElement.classList.contains(HIGHLIGHT_CLASS)) {
          continue;
        }

        const nodeText = textNode.textContent;
        const nodeTextLower = nodeText.toLowerCase();
        const index = nodeTextLower.indexOf(phraseLower);

        if (index !== -1) {
          const beforeText = nodeText.substring(0, index);
          const phraseText = nodeText.substring(index, index + phraseTrimmed.length);
          const afterText = nodeText.substring(index + phraseTrimmed.length);

          const highlightSpan = document.createElement('span');
          highlightSpan.className = HIGHLIGHT_CLASS;
          highlightSpan.textContent = phraseText;

          const parent = textNode.parentNode;
          if (!parent) return false;

          if (beforeText) {
            parent.insertBefore(document.createTextNode(beforeText), textNode);
          }
          parent.insertBefore(highlightSpan, textNode);
          if (afterText) {
            parent.insertBefore(document.createTextNode(afterText), textNode);
          }
          parent.removeChild(textNode);

          return true;
        }
      }
    } catch (error) {
      // Silently fail - don't spam console
      return false;
    }
    return false;
  }

  /**
   * Find and highlight matched phrases in job description
   * @param {Array} matchedPhrases - Array of matched phrase strings
   * @param {string} fullText - Full job description text
   */
  function highlightSentences(matchedPhrases, fullText) {
    if (!matchedPhrases || matchedPhrases.length === 0 || !fullText) return;

    const firstMatch = matchedPhrases[0];
    const matchIndex = fullText.toLowerCase().indexOf(firstMatch.toLowerCase());
    if (matchIndex === -1) return;

    // Try to extract sentence, but fall back to just the phrase
    let textToHighlight = extractSentence(fullText, matchIndex, firstMatch.length);
    if (!textToHighlight) {
      textToHighlight = firstMatch;
    }

    // Find job description DOM elements
    const selectors = [
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '.jobs-description__text',
      '.jobs-box__html-content',
      '.jobs-description-content',
      '[class*="jobs-description"]'
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          // Skip if already highlighted
          if (element.querySelector(`.${HIGHLIGHT_CLASS}`)) {
            continue;
          }
          // Try highlighting the phrase first (more reliable)
          if (highlightPhraseInElement(element, firstMatch)) {
            return true;
          }
          // Try highlighting the sentence if phrase didn't work
          if (textToHighlight !== firstMatch && highlightPhraseInElement(element, textToHighlight)) {
            return true;
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    return false;
  }

  /**
   * Remove all highlights
   */
  function removeHighlights() {
    try {
      const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
        }
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Highlight job description based on analysis result
   * @param {Object} analysisResult - Analysis result from analyzer
   * @param {string} jobDescriptionText - Full job description text
   */
  function highlight(analysisResult, jobDescriptionText) {
    // Only highlight if status is "no"
    if (analysisResult.status !== 'no') {
      removeHighlights();
      return;
    }

    // Remove existing highlights first
    removeHighlights();

    // Get matched phrases (prioritize strong negative over moderate)
    const matchedPhrases = analysisResult.details.strongNegative.length > 0
      ? analysisResult.details.strongNegative
      : analysisResult.details.moderateNegative;

    if (matchedPhrases.length > 0 && jobDescriptionText) {
      // Wait a bit for DOM to be ready, then try to highlight
      setTimeout(() => {
        highlightSentences(matchedPhrases, jobDescriptionText);
      }, 300);
    }
  }

  // Public API
  return {
    highlight,
    removeHighlights
  };
})();
