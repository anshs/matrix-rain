/**
 * Creates and manages a simple FPS counter div on the screen.
 * Follows performance rules by only updating DOM twice a second.
 */

let frameCount = 0;
let lastTime = 0;
let fpsDiv = null;

/**
 * Initializes the FPS counter DOM element.
 * @returns {void}
 */
export function setupFPS() {
  fpsDiv = document.createElement('div');
  fpsDiv.id = 'fps-counter';
  fpsDiv.style.position = 'fixed';
  fpsDiv.style.top = '10px';
  fpsDiv.style.left = '10px';
  fpsDiv.style.color = '#0F0';
  fpsDiv.style.fontFamily = 'monospace';
  fpsDiv.style.fontSize = '14px';
  fpsDiv.style.pointerEvents = 'none';
  fpsDiv.style.zIndex = '9999';
  fpsDiv.textContent = 'FPS: 0';
  document.body.appendChild(fpsDiv);
  lastTime = performance.now();
}

/**
 * Call this every frame to update the FPS counter.
 * @param {number} now Current timestamp from performance.now()
 * @returns {void}
 */
export function updateFPS(now) {
  frameCount++;
  if (now - lastTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastTime));
    if (fpsDiv) fpsDiv.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastTime = now;
  }
}
