let isEnabled = true;
const debugData = new Map();
const logs = [];
const MAX_LOGS = 10;
let debugContainer = null;
let isDirty = false;
let renderScheduled = false;

/**
 * Initializes the debug UI container and injects its styles.
 */
function initDebugContainer() {
  // Handle Hot Module Replacement (HMR) by reusing existing elements
  debugContainer = document.getElementById('debug-container');
  if (!debugContainer) {
    debugContainer = document.createElement('div');
    debugContainer.id = 'debug-container';
    document.body.appendChild(debugContainer);
  }

  // Create and inject the CSS styles
  let style = document.getElementById('debug-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'debug-style';
    document.head.appendChild(style);
  }
  
  style.textContent = `
    #debug-container {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(10, 10, 10, 0.85); /* Dark mode background */
      color: #0f0; /* Neon green text */
      font-family: 'Courier New', Courier, monospace; /* Mono font */
      font-size: 14px;
      padding: 12px;
      border: 1px solid #0f0;
      border-radius: 6px;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.3), inset 0 0 5px rgba(0, 255, 0, 0.2); /* Neon glow effect */
      text-shadow: 0 0 4px #0f0; /* Neon text glow */
      z-index: 9999;
      pointer-events: none; /* Let clicks pass through container */
      min-width: 200px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    #debug-container .debug-item {
      pointer-events: auto; /* Allow hovering on text */
      cursor: help; /* Show a question mark cursor to imply hoverable */
    }

    #debug-container hr {
      border: 0;
      border-top: 1px dashed rgba(0, 255, 0, 0.4);
      margin: 8px 0;
    }

    /* Hide on devices narrower than 1024px (standard desktop threshold) */
    @media (max-width: 1024px) {
      #debug-container {
        display: none !important;
      }
    }
  `;
}

/**
 * Updates the DOM with the latest debug data.
 * This is scheduled via requestAnimationFrame for performance.
 */
function renderDebug() {
  // Reset the schedule flag so it can be scheduled again
  renderScheduled = false;

  // If there's nothing to update or it's disabled, do nothing
  if (!isDirty || !isEnabled || !debugContainer) {
    return;
  }

  // Ensure inner containers exist
  let kvContainer = document.getElementById('debug-kv-container');
  let logsContainer = document.getElementById('debug-logs-container');
  let hr = document.getElementById('debug-hr');

  if (!kvContainer) {
    debugContainer.innerHTML = '<div id="debug-kv-container"></div><hr id="debug-hr" style="display:none; border: 0; border-top: 1px dashed rgba(0,255,0,0.4); margin: 8px 0;"><div id="debug-logs-container"></div>';
    kvContainer = document.getElementById('debug-kv-container');
    logsContainer = document.getElementById('debug-logs-container');
    hr = document.getElementById('debug-hr');
  }

  // 1. Render Key-Value pairs without destroying DOM nodes
  for (const [k, data] of debugData.entries()) {
    // Create a safe, unique ID for this specific key
    const safeId = 'debug-kv-' + k.replace(/[^a-zA-Z0-9]/g, '-');
    let row = document.getElementById(safeId);
    
    const displayValue = typeof data.value === 'object' ? JSON.stringify(data.value) : data.value;
    const contentHtml = `<strong>${k}:</strong> ${displayValue}`;

    if (!row) {
      // First time seeing this key: create the persistent DOM element
      row = document.createElement('div');
      row.id = safeId;
      row.className = 'debug-item';
      row.title = data.source; // The title attribute stays here permanently
      row.innerHTML = contentHtml;
      kvContainer.appendChild(row);
    } else {
      // Update existing element's content only if it changed
      if (row.innerHTML !== contentHtml) {
        row.innerHTML = contentHtml;
      }
    }
  }

  // 2. Render simple appended logs
  if (logs.length > 0) {
    hr.style.display = debugData.size > 0 ? 'block' : 'none';
    
    // Logs don't update 60 times a second, so replacing innerHTML here is safe
    let logsHtml = '';
    logs.forEach(log => {
      logsHtml += `<div class="debug-item" title="${log.source}">${log.text}</div>`;
    });
    logsContainer.innerHTML = logsHtml;
  }

  // Mark as clean since we've rendered the latest changes
  isDirty = false;
}

/**
 * Extracts the file and line number of the code that called debug().
 * @returns {string} The source location
 */
function getCallerSource() {
  try {
    throw new Error();
  } catch (e) {
    if (!e.stack) return 'Unknown source';
    const lines = e.stack.split('\n');
    for (let i = 1; i < lines.length; i++) {
      // Find the first stack line NOT originating from debug.js itself
      if (lines[i].indexOf('debug.js') === -1 && lines[i].trim() !== 'Error') {
        return lines[i].trim();
      }
    }
  }
  return 'Unknown source';
}

/**
 * The main debug function.
 * @param {string} key - The label for the value, OR just a string message to append.
 * @param {any} [value] - The value to track. If omitted, the 'key' is treated as a log message.
 */
export function debug(key, value) {
  if (!isEnabled) return;

  // Lazily initialize the container on first use
  if (!debugContainer) {
    initDebugContainer();
  }

  if (value === undefined) {
    // Mode: Simple log append (only one argument provided)
    logs.push({ text: key, source: getCallerSource() });
    if (logs.length > MAX_LOGS) {
      logs.shift(); // Keep logs bounded to prevent memory leaks and infinite growth
    }
    isDirty = true;
  } else {
    // Mode: Key-Value tracking
    const existing = debugData.get(key);
    if (existing) {
      // Optimization: Only update if the value actually changed
      if (existing.value === value) return;
      existing.value = value;
    } else {
      // First time seeing this key: capture source for the tooltip
      debugData.set(key, { value, source: getCallerSource() });
    }
    isDirty = true;
  }

  // Schedule a render in the next animation frame to batch updates
  // This prevents multiple DOM updates per frame even if debug() is called many times
  if (!renderScheduled && isDirty) {
    renderScheduled = true;
    requestAnimationFrame(renderDebug);
  }
}

/**
 * Turns the debug utility on or off.
 * @param {boolean} [state] - Explicitly set state, or toggle if omitted.
 */
export function toggleDebug(state) {
  if (state !== undefined) {
    isEnabled = Boolean(state);
  } else {
    isEnabled = !isEnabled;
  }

  // Update container visibility if it exists
  if (debugContainer) {
    debugContainer.style.visibility = isEnabled ? 'visible' : 'hidden';
  }
}
