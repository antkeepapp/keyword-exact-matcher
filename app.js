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
  const btnRemoveDuplicates = document.getElementById('btnRemoveDuplicates');
  const btnCleanChars = document.getElementById('btnCleanChars');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnCopyOutput = document.getElementById('btnCopyOutput');
  const btnLoadExample = document.getElementById('btnLoadExample');
  
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

  // SVG Icons for clipboard states
  const copyIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
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
      if (!trimmed) return ''; // Preserve spacing or filter? Let's filter empty lines.
      
      // Avoid double wrapping if already fully bracketed
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed;
      }
      
      // Clean off unbalanced outer brackets if they exist on one side
      let cleanWord = trimmed;
      if (cleanWord.startsWith('[')) cleanWord = cleanWord.substring(1);
      if (cleanWord.endsWith(']')) cleanWord = cleanWord.substring(0, cleanWord.length - 1);
      
      return `[${cleanWord.trim()}]`;
    }).filter(line => line !== ''); // Filter out empty elements
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
      processExactMatchAction();
    } else {
      updateCounters();
    }
  }

  /**
   * Clean special characters, keeping only alphanumeric and spaces
   */
  function cleanSpecialCharactersAction() {
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
      processExactMatchAction();
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
      processExactMatchAction();
    }
  });

  // Action Buttons
  btnExactMatch.addEventListener('click', processExactMatchAction);
  btnRemoveDuplicates.addEventListener('click', removeDuplicatesAction);
  btnCleanChars.addEventListener('click', cleanSpecialCharactersAction);
  
  if (btnLoadExample) {
    btnLoadExample.addEventListener('click', () => {
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
        processExactMatchAction();
      }
    });
  }

  // Auto-Process Toggle Preference saving
  toggleAutoProcess.addEventListener('change', () => {
    localStorage.setItem('autoProcessKeywords', toggleAutoProcess.checked);
    if (toggleAutoProcess.checked) {
      processExactMatchAction();
    }
  });

  // Clear All Workspace
  btnClearAll.addEventListener('click', () => {
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

  // Initialize UI on startup
  updateCounters();
});
