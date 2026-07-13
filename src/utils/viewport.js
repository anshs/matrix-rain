/**
 * viewport.js
 * Source of truth for window aspect ratio and resize events.
 */

let aspect = window.innerWidth / window.innerHeight;
const listeners = [];

window.addEventListener('resize', () => {
  aspect = window.innerWidth / window.innerHeight;
  listeners.forEach(callback => callback(aspect));
});

/**
 * Gets the current aspect ratio (Width / Height)
 * @returns {number}
 */
export function getAspect() {
  return aspect;
}

/**
 * Subscribes to window resize events, receiving the new aspect ratio.
 * @param {Function} callback 
 */
export function onResize(callback) {
  listeners.push(callback);
}
