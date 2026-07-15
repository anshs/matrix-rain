import * as THREE from 'three';
import { getAspect } from '../utils/viewport.js';

// Base internal resolution for the canvas
const CANVAS_BASE_HEIGHT = 1024;
const FONT_SIZE = 32;

// Padding between rows (percentage of character height)
const ROW_PADDING_PERCENTAGE = 0.2;
// Time in milliseconds for each character to update on average
const CHAR_UPDATE_INTERVAL_MS = 500;

// === Streak Configuration ===
const TRAIL_LENGTH = 20; // Length of the trail in characters
const TRAIL_HEAD_COLOR = '#8DFF8D'; // Bright neon green for the leading character
const TRAIL_START_COLOR = { r: 0, g: 255, b: 0, a: 1 }; // Gradient start
const TRAIL_END_COLOR = { r: 0, g: 64, b: 0, a: 0 };    // Gradient end
const GLOW_COLOR = '#0F0';
const GLOW_MAX_BLUR = 10;

// Pre-computed Trail Characteristics
const trailColors = new Array(TRAIL_LENGTH);
const trailGlows = new Float32Array(TRAIL_LENGTH);

function initTrailStyles() {
  for (let j = 0; j < TRAIL_LENGTH; j++) {
    if (j === 0) {
      trailColors[j] = TRAIL_HEAD_COLOR;
      trailGlows[j] = GLOW_MAX_BLUR * 1.5; // Head glows brighter
    } else {
      const ratio = j / TRAIL_LENGTH;
      // Linear interpolation for color
      const r = Math.round(TRAIL_START_COLOR.r + (TRAIL_END_COLOR.r - TRAIL_START_COLOR.r) * ratio);
      const g = Math.round(TRAIL_START_COLOR.g + (TRAIL_END_COLOR.g - TRAIL_START_COLOR.g) * ratio);
      const b = Math.round(TRAIL_START_COLOR.b + (TRAIL_END_COLOR.b - TRAIL_START_COLOR.b) * ratio);
      const a = TRAIL_START_COLOR.a + (TRAIL_END_COLOR.a - TRAIL_START_COLOR.a) * ratio;
      trailColors[j] = `rgba(${r}, ${g}, ${b}, ${a})`;
      trailGlows[j] = GLOW_MAX_BLUR * (1 - ratio);
    }
  }
}
initTrailStyles();

// Width and Height based on aspect ratio of the screen/window
let canvasWidth = Math.floor(CANVAS_BASE_HEIGHT * getAspect());
let canvasHeight = CANVAS_BASE_HEIGHT;

// Grid configuration
let charWidth, charHeight, numColumns, numRows, totalCells;
let charCodes; // 1D typed array representing the 2D grid

// Streaks state
let streakRow; // Float32Array: Current fractional row position of the streak head
let streakSpeed; // Float32Array: Speed in rows per second

function initStreaks() {
  streakRow = new Float32Array(numColumns);
  streakSpeed = new Float32Array(numColumns);
  for (let i = 0; i < numColumns; i++) {
    // Start at random position, some offscreen to stagger them
    streakRow[i] = Math.random() * (numRows + TRAIL_LENGTH * 2) - TRAIL_LENGTH;
    streakSpeed[i] = Math.random() * 15 + 10; // Speed between 10 and 25 rows per second
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

  // Set font before measuring text metrics
  ctx.font = `${FONT_SIZE}px monospace`;

  // Measure font metrics to derive grid size
  const metrics = ctx.measureText('ア'); // Measure a typical full-width character
  // TODO: Remove hardcoding and extract values by sampling the selected character set or font
  charWidth = metrics.width;

  // Use exact bounding box for height, and apply padding
  const rawCharHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || FONT_SIZE;
  charHeight = rawCharHeight * (1 + ROW_PADDING_PERCENTAGE);

  // Calculate grid dimensions
  numColumns = Math.max(1, Math.ceil(canvasWidth / charWidth));
  numRows = Math.max(1, Math.ceil(canvasHeight / charHeight));
  totalCells = numColumns * numRows;

  // Allocate arrays
  charCodes = new Uint16Array(totalCells);
  initStreaks();

  for (let i = 0; i < totalCells; i++) {
    charCodes[i] = 0x30A0 + Math.floor(Math.random() * 96);
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
        charCodes[i] = 0x30A0 + Math.floor(Math.random() * 96);
      }
    }

    // Clear canvas for streaks
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0; // Disable shadow for clear
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = GLOW_COLOR;

    const deltaSeconds = deltaTime / 1000;

    // Draw streaks
    for (let i = 0; i < numColumns; i++) {
      streakRow[i] += streakSpeed[i] * deltaSeconds;

      // Reset streak if it completely leaves the screen
      if (streakRow[i] - TRAIL_LENGTH > numRows) {
        streakRow[i] = -Math.random() * TRAIL_LENGTH;
        streakSpeed[i] = Math.random() * 15 + 10;
      }

      const headRow = Math.floor(streakRow[i]);

      // Draw the trail
      for (let j = 0; j < TRAIL_LENGTH; j++) {
        const row = headRow - j;

        if (row >= 0 && row < numRows) {
          const charIndex = row * numColumns + i;
          const text = String.fromCharCode(charCodes[charIndex]);

          const x = i * charWidth + (charWidth / 2);
          const y = row * charHeight + (charHeight / 2);

          ctx.fillStyle = trailColors[j];
          ctx.shadowBlur = trailGlows[j];
          ctx.fillText(text, x, y);
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

    // Canvas context state is reset on resize, re-apply initial clear
    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Recalculate grid dimensions on resize
    numColumns = Math.max(1, Math.ceil(canvasWidth / charWidth));
    numRows = Math.max(1, Math.ceil(canvasHeight / charHeight));
    totalCells = numColumns * numRows;

    charCodes = new Uint16Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      charCodes[i] = 0x30A0 + Math.floor(Math.random() * 96);
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
