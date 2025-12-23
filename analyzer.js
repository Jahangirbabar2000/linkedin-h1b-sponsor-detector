/**
 * H1B Sponsorship Detection Analyzer
 * Analyzes job descriptions to determine visa sponsorship availability
 */

const Analyzer = (function () {
  'use strict';

  // Strong Positive Indicators (explicit sponsorship mention) - Weight: +3
  const STRONG_POSITIVE_PATTERNS = [
    /\bH1B\s+sponsorship\b/i,
    /\bH1B\s+visa\s+sponsorship\b/i,
    /\bH-1B\s+sponsorship\b/i,
    /\bvisa\s+sponsorship\b/i,
    /\bwork\s+visa\s+sponsorship\b/i,
    /\bemployment\s+visa\s+sponsorship\b/i,
    /\bsponsor\s+H1B\b/i,
    /\bsponsor\s+visa\b/i,
    /\bprovide\s+sponsorship\b/i,
    /\bsponsorship\s+available\b/i,
    /\bsponsorship\s+provided\b/i,
    /\boffers\s+sponsorship\b/i,
    /\bwilling\s+to\s+sponsor\b/i,
    /\bwill\s+sponsor\b/i,
    /\bcan\s+sponsor\b/i,
    /\bsponsor\s+for\s+international\s+candidates\b/i,
    /\binternational\s+sponsorship\b/i,
    /\bwork\s+authorization\s+sponsorship\b/i,
    /\bemployment\s+authorization\s+sponsorship\b/i,
    /\bTN\s+visa\b/i,
    /\bE-3\s+visa\b/i,
    /\bO-1\s+visa\b/i,
    /\bL-1\s+visa\b/i,
    /\bJ-1\s+visa\b/i,
    /\bOPT\s+to\s+H1B\b/i,
    /\bpleased\s+to\s+offer\s+visa\s+sponsorship\b/i,  // "pleased to offer visa sponsorship"
    /\bpleased\s+to\s+offer\s+sponsorship\b/i,
    /\boffer\s+visa\s+sponsorship\b/i,
    /\boffer\s+sponsorship\b/i
  ];

  // Moderate Positive Indicators (implies openness) - Weight: +1
  const MODERATE_POSITIVE_PATTERNS = [
    /\bopen\s+to\s+international\s+candidates\b/i,
    /\binternational\s+applicants\s+welcome\b/i,
    /\bglobal\s+talent\b/i,
    /\bdiverse\s+candidates\b/i,
    /\binternational\s+experience\s+preferred\b/i,
    /\brelocation\s+assistance\b/i,
    /\bimmigration\s+support\b/i
  ];

  // Strong Negative Indicators (explicit exclusion) - Weight: -3
  const STRONG_NEGATIVE_PATTERNS = [
    /\bU\.?S\.?\s+citizens?\s+only\b/i,  // "US citizens only" or "U.S. citizens only"
    /\bU\.?S\.?\s+citizenship\s+required\b/i,  // "US citizenship required" or "U.S. citizenship required"
    /\bmust\s+be\s+(a\s+)?U\.?S\.?\s+citizen\b/i,  // "must be US citizen" or "must be a U.S. citizen"
    /\bmust\s+be\s+(a\s+)?United\s+States\s+citizen\b/i,  // "must be a United States citizen"
    /\bU\.?S\.?\s+citizenship\s+only\b/i,
    /\bno\s+sponsorship\b/i,
    /\bdoes\s+not\s+sponsor\b/i,
    /\bcannot\s+sponsor\b/i,
    /\bcan't\s+sponsor\b/i,
    /\bunable\s+to\s+sponsor\b/i,  // "unable to sponsor"
    /\bunable\s+to\s+sponsor.*work\s+visas?\b/i,  // "unable to sponsor...work visas"
    /\bnot\s+sponsoring\b/i,
    /\bsponsorship\s+not\s+available\b/i,
    /\bno\s+visa\s+sponsorship\b/i,
    /\bmust\s+have\s+work\s+authorization\b/i,
    // Note: "must be authorized to work" is NOT a negative indicator by itself
    // It's only negative when paired with "no sponsorship" - handled by context checking
    /\bno\s+visa\s+support\b/i,
    /\bwill\s+not\s+sponsor\b/i,
    /\bsponsorship\s+not\s+provided\b/i,
    /\bU\.?S\.?\s+work\s+authorization\s+required\b/i,
    /\bcitizenship\s+required\b/i,
    /\bU\.?S\.?\s+citizenship\s+mandatory\b/i,
    /\bsecurity\s+clearance\s+required\b/i,
    /\bDOD\s+security\s+clearance\b/i,  // Department of Defense security clearance
    /\bD\.?O\.?D\.?\s+security\s+clearance\b/i,  // DOD or D.O.D. security clearance
    /\beligible\s+to\s+obtain\s+(a\s+)?(DOD|D\.?O\.?D\.?|security)\s+clearance\b/i,  // "eligible to obtain a DOD Security Clearance"
    /\bmust\s+be\s+eligible\s+for\s+security\s+clearance\b/i,
    /\bmust\s+obtain\s+security\s+clearance\b/i,
    /\bable\s+to\s+obtain\s+security\s+clearance\b/i,
    /\bclearance\s+eligible\b/i,
    /\bsecurity\s+clearance\s+eligible\b/i,
    /\bmust\s+possess\s+U\.?S\.?\s+citizenship\b/i,
    /\bITAR\s+requirements?\b/i,  // ITAR (International Traffic in Arms Regulations) requirements
    /\bITAR\s+compliance\b/i,
    /\bITAR\s+eligible\b/i,
    /\bmust\s+be\s+ITAR\s+eligible\b/i,
    /\bU\.?S\.?\s+citizen\s+or\s+national\b/i,  // "U.S. citizen or national" (from ITAR text)
    /\bU\.?S\.?\s+lawful\s+permanent\s+resident\b/i,  // "U.S. lawful permanent resident" (green card holder)
    /\bgreen\s+card\s+holder\b/i,
    /\bexport\s+control\s+regulations?\b/i,
    /\bDepartment\s+of\s+State\s+authorization\b/i
  ];

  // Moderate Negative Indicators (likely exclusion) - Weight: -1
  // Note: "authorized to work" phrases are NOT negative by themselves
  // They're only negative when there's no positive sponsorship language
  const MODERATE_NEGATIVE_PATTERNS = [
    // Only include these if they appear with explicit "no sponsorship" context
    /\bno\s+relocation\s+assistance\b/i,
    /\blocal\s+candidates\s+only\b/i
  ];

  // Negation patterns to detect negative context
  const NEGATION_PATTERNS = [
    /\bno\s+/i,
    /\bnot\s+/i,
    /\bdoesn't\s+/i,
    /\bdoes\s+not\s+/i,
    /\bcannot\s+/i,
    /\bcan't\s+/i,
    /\bwill\s+not\s+/i,
    /\bwon't\s+/i
  ];

  /**
   * Check if a match is negated (e.g., "no sponsorship" vs "sponsorship available")
   * @param {string} text - Full text to check
   * @param {number} matchIndex - Index where the match was found
   * @param {number} matchLength - Length of the matched text
   * @returns {boolean} - True if the match appears to be negated
   */
  function isNegated(text, matchIndex, matchLength) {
    const contextBefore = text.substring(Math.max(0, matchIndex - 50), matchIndex).toLowerCase();

    // Check for negation patterns before the match
    for (const negPattern of NEGATION_PATTERNS) {
      if (negPattern.test(contextBefore)) {
        // Make sure the negation is close to our match (within 20 chars)
        const lastNegMatch = contextBefore.match(new RegExp(negPattern.source + '[^.]{0,20}$', 'i'));
        if (lastNegMatch) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Find all matches for a pattern in text, with context checking
   * @param {RegExp} pattern - Pattern to match
   * @param {string} text - Text to search
   * @returns {Array} - Array of match objects with text and index
   */
  function findMatches(pattern, text) {
    const matches = [];
    let match;

    // Create a new regex with global flag if not already present
    const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');

    while ((match = globalPattern.exec(text)) !== null) {
      matches.push({
        text: match[0],
        index: match.index,
        length: match[0].length
      });
    }

    return matches;
  }

  /**
   * Analyze job description text for sponsorship indicators
   * @param {string} jobDescription - The job description text to analyze
   * @returns {Object} - Analysis result with status, score, and matched keywords
   */
  function analyze(jobDescription) {
    if (!jobDescription || typeof jobDescription !== 'string') {
      return {
        status: 'unclear',
        score: 0,
        confidence: 'low',
        matchedKeywords: [],
        message: 'No job description found'
      };
    }

    const text = jobDescription;
    const matchedKeywords = {
      strongPositive: [],
      moderatePositive: [],
      strongNegative: [],
      moderateNegative: []
    };

    // First, check for POSITIVE indicators (explicit sponsorship offers)
    // These override everything else
    for (const pattern of STRONG_POSITIVE_PATTERNS) {
      const matches = findMatches(pattern, text);
      for (const match of matches) {
        if (!isNegated(text, match.index, match.length)) {
          matchedKeywords.strongPositive.push(match.text);
        }
      }
    }

    for (const pattern of MODERATE_POSITIVE_PATTERNS) {
      const matches = findMatches(pattern, text);
      for (const match of matches) {
        if (!isNegated(text, match.index, match.length)) {
          matchedKeywords.moderatePositive.push(match.text);
        }
      }
    }

    // Then check for NEGATIVE indicators (explicit "no sponsorship" statements)
    for (const pattern of STRONG_NEGATIVE_PATTERNS) {
      const matches = findMatches(pattern, text);
      for (const match of matches) {
        matchedKeywords.strongNegative.push(match.text);
      }
    }

    for (const pattern of MODERATE_NEGATIVE_PATTERNS) {
      const matches = findMatches(pattern, text);
      for (const match of matches) {
        matchedKeywords.moderateNegative.push(match.text);
      }
    }

    // Determine status: Positive indicators override negative ones
    let status, message, confidence;

    if (matchedKeywords.strongPositive.length > 0) {
      // Explicit positive sponsorship language found - definitely yes
      status = 'yes';
      message = 'Sponsorship Available';
      confidence = 'high';
    } else if (matchedKeywords.strongNegative.length > 0) {
      // Strong negative indicators found - definitely no sponsorship
      status = 'no';
      message = 'No Sponsorship';
      confidence = 'high';
    } else if (matchedKeywords.moderatePositive.length > 0) {
      // Moderate positive indicators found - likely yes
      status = 'yes';
      message = 'Sponsorship Available';
      confidence = 'medium';
    } else if (matchedKeywords.moderateNegative.length > 0) {
      // Only moderate negative indicators found - likely no sponsorship
      status = 'no';
      message = 'No Sponsorship';
      confidence = 'medium';
    } else {
      // No indicators found - default to yes (most jobs don't mention sponsorship)
      status = 'yes';
      message = 'Sponsorship Available';
      confidence = 'low'; // Low confidence since we're inferring from absence of indicators
    }

    // Collect all matched keywords for display
    const allMatchedKeywords = [
      ...matchedKeywords.strongPositive,
      ...matchedKeywords.moderatePositive,
      ...matchedKeywords.strongNegative,
      ...matchedKeywords.moderateNegative
    ];

    // Calculate score for compatibility
    let score = 0;
    if (matchedKeywords.strongPositive.length > 0) score = 3;
    else if (matchedKeywords.moderatePositive.length > 0) score = 1;
    else if (matchedKeywords.strongNegative.length > 0) score = -3;
    else if (matchedKeywords.moderateNegative.length > 0) score = -1;

    return {
      status,
      score,
      confidence,
      matchedKeywords: [...new Set(allMatchedKeywords)], // Remove duplicates
      message,
      details: matchedKeywords
    };
  }

  /**
   * Future: AI-powered analysis (placeholder for future enhancement)
   * @param {string} jobDescription - The job description text
   * @returns {Promise<Object>} - AI analysis result
   */
  async function analyzeWithAI(jobDescription) {
    // Placeholder for future AI API integration
    // This would use OpenAI/Claude API for more sophisticated analysis
    throw new Error('AI analysis not yet implemented');
  }

  // Public API
  return {
    analyze,
    analyzeWithAI
  };
})();

