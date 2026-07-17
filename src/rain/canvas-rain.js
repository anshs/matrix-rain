import * as THREE from 'three';
import { getAspect } from '../utils/viewport.js';
import { getIndex2D } from '../utils/array.js';
import { ACTIVE_CHARSET } from './characters.js';
import { createGlyphAtlas } from './glyph-atlas.js';

// Base internal resolution for the canvas
const CANVAS_BASE_HEIGHT = 1024;
const FONT_SIZE = 32;

// Padding and spacing (percentage of character dimensions, e.g., 0.2 means +20%, -0.2 means -20%)
const ROW_PADDING_PERCENTAGE = 0.2;
const COLUMN_SPACING_PERCENTAGE = -0.15; // Negative value squeezes columns closer together

// Time in milliseconds for each character to update on average
const CHAR_UPDATE_INTERVAL_MS = 500;

// === Streak Configuration ===
const TRAIL_LENGTH = 30; // Length of the trail in characters
const TRAIL_HEAD_COLOR = '#d0ff00ff'; // Bright neon green for the leading character
const TRAIL_START_COLOR = { r: 50, g: 255, b: 0, a: 1 }; // Gradient start
const TRAIL_END_COLOR = { r: 0, g: 64, b: 0, a: 0 };    // Gradient end
const GLOW_COLOR = '#0F0';
const GLOW_MAX_BLUR = 5; // Increased blur for better CRT effect

// Width and Height based on aspect ratio of the screen/window
let canvasWidth = Math.floor(CANVAS_BASE_HEIGHT * getAspect());
let canvasHeight = CANVAS_BASE_HEIGHT;

// Grid configuration
let charWidth, charHeight, numColumns, numRows, totalCells;
let charIndices; // 1D typed array storing indices to ACTIVE_CHARSET

// Atlas configuration
let atlasCanvas, getSourceCoords;
let atlasCellWidth, atlasCellHeight;

// Streaks state
let streakRow; // Float32Array: Current fractional row position of the streak head
let streakSpeed; // Float32Array: Speed in rows per second

function initStreaks() {
  streakRow = new Float32Array(numColumns);
  streakSpeed = new Float32Array(numColumns);
  for (let i = 0; i < numColumns; i++) {
    // Start at random position, some offscreen to stagger them
    streakRow[i] = Math.random() * (numRows + TRAIL_LENGTH * 2) - TRAIL_LENGTH;
    streakSpeed[i] = Math.random() * 20 + 15; // Speed between 10 and 25 rows per second
  }
}

/**
 * Initializes the CanvasTexture and Plane mesh for the 2D rain.
 * @returns {Object} { mesh: THREE.Mesh, update: Function, resize: Function }
 */
export function setupRain() {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for slight optimization

  // 1. Measure Font Metrics
  ctx.font = `${FONT_SIZE}px monospace`;
  // Measure a typical wide character from our set to determine grid spacing
  const metrics = ctx.measureText(ACTIVE_CHARSET.includes('ア') ? 'ア' : ACTIVE_CHARSET[0]);

  // The effective logical size of a cell in the grid
  // Using Math.ceil to ensure integers (prevents layout floating-point drift)
  charWidth = Math.ceil(metrics.width * (1 + COLUMN_SPACING_PERCENTAGE));
  const rawCharHeight = Math.ceil((metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || FONT_SIZE);
  charHeight = Math.ceil(rawCharHeight * (1 + ROW_PADDING_PERCENTAGE));

  // 2. Generate Glyph Atlas
  // The atlas cells need to be physically larger than the character to fit the glow without clipping
  // Base it on the UN-squeezed metrics.width so we don't clip horizontal strokes when squeezed
  atlasCellWidth = Math.ceil(metrics.width + (GLOW_MAX_BLUR * 2) + 4);
  atlasCellHeight = Math.ceil(rawCharHeight + (GLOW_MAX_BLUR * 2) + 4);

  const atlasData = createGlyphAtlas(
    ACTIVE_CHARSET,
    atlasCellWidth,
    atlasCellHeight,
    FONT_SIZE,
    TRAIL_LENGTH,
    TRAIL_HEAD_COLOR,
    TRAIL_START_COLOR,
    TRAIL_END_COLOR,
    GLOW_COLOR,
    GLOW_MAX_BLUR
  );
  atlasCanvas = atlasData.atlasCanvas;
  getSourceCoords = atlasData.getSourceCoords;

  // 3. Calculate grid dimensions
  numColumns = Math.max(1, Math.ceil(canvasWidth / charWidth));
  numRows = Math.max(1, Math.ceil(canvasHeight / charHeight));
  totalCells = numColumns * numRows;

  // 4. Allocate state arrays
  charIndices = new Uint16Array(totalCells);
  initStreaks();

  for (let i = 0; i < totalCells; i++) {
    charIndices[i] = Math.floor(Math.random() * ACTIVE_CHARSET.length);
  }

  // Draw initial black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Calculate the exact frustum height for a camera at z=15 with 75 fov
  const fovRadians = (75 * Math.PI) / 180;
  const frustumHeight = 2 * Math.tan(fovRadians / 2) * 15;
  const frustumWidth = frustumHeight * getAspect();

  const geometry = new THREE.PlaneGeometry(frustumWidth, frustumHeight);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });

  const mesh = new THREE.Mesh(geometry, material);

  /**
   * Updates the canvas texture. Call this every frame.
   * @param {number} deltaTime Time elapsed since last frame in milliseconds
   */
  function update(deltaTime) {
    // Probability of a single character changing in this frame
    const changeProbability = deltaTime / CHAR_UPDATE_INTERVAL_MS;

    // Update the underlying grid randomly
    for (let i = 0; i < totalCells; i++) {
      if (Math.random() < changeProbability) {
        charIndices[i] = Math.floor(Math.random() * ACTIVE_CHARSET.length);
      }
    }

    // Clear canvas for streaks
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const deltaSeconds = deltaTime / 1000;

    // 1. Advance all streaks
    for (let i = 0; i < numColumns; i++) {
      streakRow[i] += streakSpeed[i] * deltaSeconds;

      // Reset streak if it completely leaves the screen
      if (streakRow[i] - TRAIL_LENGTH > numRows) {
        streakRow[i] = -Math.random() * TRAIL_LENGTH;
        streakSpeed[i] = Math.random() * 15 + 10;
      }
    }

    // 2. Draw the trails by layer using the ultra-fast Glyph Atlas
    for (let j = 0; j < TRAIL_LENGTH; j++) {
      for (let i = 0; i < numColumns; i++) {
        const headRow = Math.floor(streakRow[i]);
        const row = headRow - j;

        if (row >= 0 && row < numRows) {
          // Use our high-performance inline array utility
          const cellIndex = getIndex2D(i, row, numColumns);
          const charIndex = charIndices[cellIndex];

          // Get pre-calculated source coordinates from the atlas
          const { sx, sy } = getSourceCoords(charIndex, j);

          // Calculate destination center
          const cx = i * charWidth + (charWidth / 2);
          const cy = row * charHeight + (charHeight / 2);

          // Calculate destination top-left based on padded atlas cell size
          // Math.round snaps the draw coordinates to exact integers, completely eliminating sub-pixel jitter!
          const dx = Math.round(cx - (atlasCellWidth / 2));
          const dy = Math.round(cy - (atlasCellHeight / 2));

          // Hardware-accelerated pixel copy (Bit Blit)
          ctx.drawImage(
            atlasCanvas,
            sx, sy, atlasCellWidth, atlasCellHeight, // Source
            dx, dy, atlasCellWidth, atlasCellHeight  // Destination
          );
        }
      }
    }

    texture.needsUpdate = true;
  }

  /**
   * Resizes the canvas and geometry based solely on the new aspect ratio.
   * @param {number} newAspect 
   */
  function resize(newAspect) {
    canvasWidth = Math.floor(CANVAS_BASE_HEIGHT * newAspect);
    canvas.width = canvasWidth;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Recalculate grid dimensions on resize
    numColumns = Math.max(1, Math.ceil(canvasWidth / charWidth));
    numRows = Math.max(1, Math.ceil(canvasHeight / charHeight));
    totalCells = numColumns * numRows;

    charIndices = new Uint16Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      charIndices[i] = Math.floor(Math.random() * ACTIVE_CHARSET.length);
    }

    initStreaks();

    // Force WebGL to re-allocate the texture for the new canvas size
    texture.dispose();

    mesh.geometry.dispose();
    const newFrustumWidth = frustumHeight * newAspect;
    mesh.geometry = new THREE.PlaneGeometry(newFrustumWidth, frustumHeight);
  }

  return { mesh, update, resize };
}
