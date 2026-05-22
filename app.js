/**
 * ==========================================================================
 * GOOGLE ADS EXACT MATCH FORMATTER - CORE ENGINE & EVENT HANDLERS
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputKeywords = document.getElementById('inputKeywords');
  const outputKeywords = document.getElementById('outputKeywords');
  
  // Buttons
  const btnExactMatch = document.getElementById('btnExactMatch');
  const btnPhraseMatch = document.getElementById('btnPhraseMatch');
  const btnRemoveDuplicates = document.getElementById('btnRemoveDuplicates');
  const btnCleanChars = document.getElementById('btnCleanChars');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnCopyOutput = document.getElementById('btnCopyOutput');
  const btnLoadExample = document.getElementById('btnLoadExample');
  const btnQuickCopy = document.getElementById('btnQuickCopy');
  const quickCopyIcon = document.getElementById('quickCopyIcon');
  
  // Feedback elements
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackText = document.getElementById('feedbackText');
  const btnSendFeedback = document.getElementById('btnSendFeedback');
  const feedbackBtnText = document.getElementById('feedbackBtnText');
  const feedbackIcon = document.getElementById('feedbackIcon');
  const feedbackSuccess = document.getElementById('feedbackSuccess');
  
  // Counters & Badges
  const inputLineCounter = document.getElementById('inputLineCounter');
  const outputLineCounter = document.getElementById('outputLineCounter');
  const statRawCount = document.getElementById('statRawCount');
  const statFormattedCount = document.getElementById('statFormattedCount');
  const statDuplicatesRemoved = document.getElementById('statDuplicatesRemoved');
  const toggleAutoProcess = document.getElementById('toggleAutoProcess');
  const copyBtnText = document.getElementById('copyBtnText');
  const copyIcon = document.getElementById('copyIcon');

  // State Variables
  let totalDuplicatesFiltered = 0;
  let currentFormatMode = 'exact'; // 'exact' or 'phrase'

  // Helper function to track GA4 events
  function trackGAEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    } else {
      console.log('[GA Debug] Event:', eventName, params);
    }
  }

  // SVG Icons for clipboard states
  const copyIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  `;
  
  const checkIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;

  // Initialize: Load preference for Auto-Match from localStorage
  const savedAutoProcess = localStorage.getItem('autoProcessKeywords') === 'true';
  toggleAutoProcess.checked = savedAutoProcess;

  // --------------------------------------------------------------------------
  // Core Helper Functions
  // --------------------------------------------------------------------------

  /**
   * Parse textarea string into an array of lines, trimmed.
   * Keeps empty lines if they exist, but we filter them when calculating keywords.
   */
  function getLines(text) {
    if (!text) return [];
    return text.split('\n');
  }

  /**
   * Update the UI line count badges and active keyword stats
   */
  function updateCounters() {
    const inputLines = getLines(inputKeywords.value);
    const outputLines = getLines(outputKeywords.value);

    // Calculate actual keyword count (excluding blank lines)
    const rawKeywords = inputLines.filter(line => line.trim() !== '');
    const formattedKeywords = outputLines.filter(line => line.trim() !== '');

    // Update lines counter (top of card)
    inputLineCounter.textContent = `${inputLines.length} ${inputLines.length === 1 ? 'line' : 'lines'}`;
    outputLineCounter.textContent = `${outputLines.length} ${outputLines.length === 1 ? 'line' : 'lines'}`;

    // Update primary stats cards
    statRawCount.textContent = rawKeywords.length;
    statFormattedCount.textContent = formattedKeywords.length;
    statDuplicatesRemoved.textContent = totalDuplicatesFiltered;
  }

  /**
   * Intelligently wraps phrases in Google Ads [exact match] format
   */
  function formatExactMatch(lines) {
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Avoid double wrapping if already fully bracketed
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed;
      }
      
      let cleanWord = trimmed;
      if (cleanWord.startsWith('[')) cleanWord = cleanWord.substring(1);
      if (cleanWord.endsWith(']')) cleanWord = cleanWord.substring(0, cleanWord.length - 1);
      
      return `[${cleanWord.trim()}]`;
    }).filter(line => line !== '');
  }

  /**
   * Intelligently wraps phrases in Google Ads "phrase match" format
   */
  function formatPhraseMatch(lines) {
    return lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Avoid double wrapping if already fully quoted
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed;
      }
      
      let cleanWord = trimmed;
      if (cleanWord.startsWith('"')) cleanWord = cleanWord.substring(1);
      if (cleanWord.endsWith('"')) cleanWord = cleanWord.substring(0, cleanWord.length - 1);
      
      return `"${cleanWord.trim()}"`;
    }).filter(line => line !== '');
  }

  // --------------------------------------------------------------------------
  // Event Actions
  // --------------------------------------------------------------------------

  /**
   * Perform Exact Match Conversion
   */
  function processExactMatchAction() {
    const rawText = inputKeywords.value;
    const lines = getLines(rawText);
    const formatted = formatExactMatch(lines);
    
    outputKeywords.value = formatted.join('\n');
    updateCounters();
  }

  /**
   * Perform Phrase Match Conversion
   */
  function processPhraseMatchAction() {
    const rawText = inputKeywords.value;
    const lines = getLines(rawText);
    const formatted = formatPhraseMatch(lines);
    
    outputKeywords.value = formatted.join('\n');
    updateCounters();
  }

  /**
   * Dispatches the formatting action based on the active format mode
   */
  function processCurrentFormatAction() {
    if (currentFormatMode === 'phrase') {
      processPhraseMatchAction();
    } else {
      processExactMatchAction();
    }
  }

  /**
   * Clean up identical keyword lines from input (case-insensitive)
   */
  function removeDuplicatesAction() {
    const rawText = inputKeywords.value;
    const lines = getLines(rawText);
    
    const uniqueLines = [];
    const seen = new Set();
    let duplicatesFound = 0;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed === '') {
        // Keep blank lines in the raw input to not disrupt user typing structure,
        // or optionally drop them. Let's keep them but deduplicate actual keywords.
        uniqueLines.push(line);
        return;
      }

      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueLines.push(line); // Keep original casing
      } else {
        duplicatesFound++;
      }
    });

    trackGAEvent('click_remove_duplicates', { count: duplicatesFound });

    if (duplicatesFound > 0) {
      inputKeywords.value = uniqueLines.join('\n');
      totalDuplicatesFiltered += duplicatesFound;
      
      // Flash the stat card to give visual feedback
      const dupCard = statDuplicatesRemoved.closest('.stat-card');
      dupCard.style.transform = 'scale(1.05)';
      dupCard.style.borderColor = 'var(--info)';
      setTimeout(() => {
        dupCard.style.transform = '';
        dupCard.style.borderColor = '';
      }, 300);
    }

    // Trigger auto-process or update counters
    if (toggleAutoProcess.checked) {
      processCurrentFormatAction();
    } else {
      updateCounters();
    }
  }

  /**
   * Clean special characters, keeping only alphanumeric and spaces
   */
  function cleanSpecialCharactersAction() {
    trackGAEvent('click_clean_chars');
    const rawText = inputKeywords.value;
    const lines = getLines(rawText);
    let wasModified = false;

    const cleanedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // Regex: Keep alphanumeric, spaces. Remove everything else.
      // E.g., "buy shoes!" -> "buy shoes", "discount & sales" -> "discount  sales"
      const cleaned = trimmed.replace(/[^a-zA-Z0-9\s-]/g, ''); 
      
      // Collapse multiple spaces to single spaces
      const collapsed = cleaned.replace(/\s+/g, ' ').trim();
      
      if (collapsed !== trimmed) {
        wasModified = true;
      }
      return collapsed;
    }).filter(line => line !== ''); // Remove lines that became empty

    if (wasModified || cleanedLines.length !== lines.length) {
      inputKeywords.value = cleanedLines.join('\n');
      
      // Flash raw count card
      const rawCard = statRawCount.closest('.stat-card');
      rawCard.style.transform = 'scale(1.05)';
      rawCard.style.borderColor = 'var(--primary)';
      setTimeout(() => {
        rawCard.style.transform = '';
        rawCard.style.borderColor = '';
      }, 300);
    }

    if (toggleAutoProcess.checked) {
      processCurrentFormatAction();
    } else {
      updateCounters();
    }
  }

  // --------------------------------------------------------------------------
  // Event Listeners Configuration
  // --------------------------------------------------------------------------

  // Input listener for real-time tracking
  inputKeywords.addEventListener('input', () => {
    updateCounters();
    if (toggleAutoProcess.checked) {
      processCurrentFormatAction();
    }
  });

  // Action Buttons
  btnExactMatch.addEventListener('click', () => {
    trackGAEvent('click_convert_exact');
    currentFormatMode = 'exact';
    processExactMatchAction();
  });

  btnPhraseMatch.addEventListener('click', () => {
    trackGAEvent('click_convert_phrase');
    currentFormatMode = 'phrase';
    processPhraseMatchAction();
  });

  btnRemoveDuplicates.addEventListener('click', removeDuplicatesAction);
  btnCleanChars.addEventListener('click', cleanSpecialCharactersAction);
  
  if (btnLoadExample) {
    btnLoadExample.addEventListener('click', () => {
      trackGAEvent('click_load_example');
      inputKeywords.value = [
        'buy running shoes',
        'best trail running shoes',
        'buy running shoes', // Duplicate
        '  discount & sales!  ', // Special characters
        'local running gear store',
        'cheap running shoes online',
        'best trail running shoes' // Duplicate
      ].join('\n');
      
      updateCounters();
      if (toggleAutoProcess.checked) {
        processCurrentFormatAction();
      }
    });
  }

  // Auto-Process Toggle Preference saving
  toggleAutoProcess.addEventListener('change', () => {
    localStorage.setItem('autoProcessKeywords', toggleAutoProcess.checked);
    if (toggleAutoProcess.checked) {
      processCurrentFormatAction();
    }
  });

  // Clear All Workspace
  btnClearAll.addEventListener('click', () => {
    trackGAEvent('click_clear_all');
    inputKeywords.value = '';
    outputKeywords.value = '';
    totalDuplicatesFiltered = 0;
    
    updateCounters();

    // Visual feedback - quick flash of inputs
    inputKeywords.style.borderColor = 'var(--danger)';
    outputKeywords.style.borderColor = 'var(--danger)';
    setTimeout(() => {
      inputKeywords.style.borderColor = '';
      outputKeywords.style.borderColor = '';
    }, 250);
  });

  // Copy to Clipboard Action
  btnCopyOutput.addEventListener('click', () => {
    const textToCopy = outputKeywords.value;
    if (!textToCopy) return;

    const lineCount = getLines(textToCopy).filter(l => l.trim() !== '').length;
    trackGAEvent('click_copy_output', { lines_count: lineCount });

    navigator.clipboard.writeText(textToCopy).then(() => {
      // Transition to success state
      btnCopyOutput.classList.add('btn-copied');
      copyBtnText.textContent = 'Copied!';
      copyIcon.innerHTML = checkIconSvg;

      // Revert after 2 seconds
      setTimeout(() => {
        btnCopyOutput.classList.remove('btn-copied');
        copyBtnText.textContent = 'Copy Output';
        copyIcon.innerHTML = copyIconSvg;
      }, 2000);
    }).catch(err => {
      console.error('Clipboard copy failed: ', err);
      // Fallback selection copy
      outputKeywords.select();
      document.execCommand('copy');
    });
  });

  // Floating Quick Copy Action
  if (btnQuickCopy) {
    btnQuickCopy.addEventListener('click', () => {
      const textToCopy = outputKeywords.value;
      if (!textToCopy) return;

      const lineCount = getLines(textToCopy).filter(l => l.trim() !== '').length;
      trackGAEvent('click_quick_copy', { lines_count: lineCount });

      navigator.clipboard.writeText(textToCopy).then(() => {
        btnQuickCopy.classList.add('copied');
        quickCopyIcon.innerHTML = checkIconSvg;

        setTimeout(() => {
          btnQuickCopy.classList.remove('copied');
          quickCopyIcon.innerHTML = copyIconSvg;
        }, 2000);
      }).catch(err => {
        console.error('Quick copy failed: ', err);
        outputKeywords.select();
        document.execCommand('copy');
      });
    });
  }

  // Feedback Form Submission
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const feedback = feedbackText.value.trim();
      if (!feedback) return;

      trackGAEvent('click_submit_feedback');

      const action = feedbackForm.getAttribute('action');
      const method = feedbackForm.getAttribute('method') || 'POST';

      // Visual loading state
      const originalText = feedbackBtnText.textContent;
      const originalIcon = feedbackIcon.innerHTML;
      btnSendFeedback.disabled = true;
      feedbackBtnText.textContent = 'Sending...';
      
      // Simple rotating spinner
      feedbackIcon.innerHTML = `
        <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:16px; height:16px;">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="8" stroke-linecap="round"></circle>
        </svg>
      `;

      // Helper to show success transition
      const showSuccess = () => {
        feedbackForm.style.transition = 'opacity 0.3s ease';
        feedbackForm.style.opacity = '0';
        
        setTimeout(() => {
          feedbackForm.style.display = 'none';
          feedbackSuccess.style.display = 'flex';
          setTimeout(() => {
            feedbackSuccess.style.opacity = '1';
          }, 50);
        }, 300);
      };

      // Check if Formspree action is set and is not the placeholder
      const isPlaceholder = !action || action.includes('YOUR_FORMSPREE_ID_HERE');
      
      if (isPlaceholder) {
        // Mock success with a slight delay for realistic feel
        setTimeout(() => {
          showSuccess();
        }, 1000);
      } else {
        // Real Formspree submission
        fetch(action, {
          method: method,
          body: new FormData(feedbackForm),
          headers: {
            'Accept': 'application/json'
          }
        })
        .then(response => {
          if (response.ok) {
            showSuccess();
          } else {
            throw new Error('Form submission failed');
          }
        })
        .catch(error => {
          console.error('Error submitting feedback form:', error);
          
          // Revert button state
          btnSendFeedback.disabled = false;
          feedbackBtnText.textContent = originalText;
          feedbackIcon.innerHTML = originalIcon;
          
          alert('Could not submit feedback via API. Opening your mail app instead...');
          const email = 'antkeep.app@gmail.com';
          const subject = encodeURIComponent('Keyword Formatter Feedback');
          const body = encodeURIComponent(feedback);
          window.open(`mailto:${email}?subject=${subject}&body=${body}`);
          showSuccess();
        });
      }
    });
  }

  // Initialize UI on startup
  updateCounters();
  if (toggleAutoProcess.checked && inputKeywords.value.trim() !== '') {
    processCurrentFormatAction();
  }
});
