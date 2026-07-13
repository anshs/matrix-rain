import * as THREE from 'three';
import { debug } from '../utils/debug.js';
import { getAspect } from '../utils/viewport.js';

// Base internal resolution for the canvas, keeps crispness constant.
const CANVAS_BASE_HEIGHT = 1024;
const FONT_SIZE = 32;

// These change dynamically strictly based on the aspect ratio
let canvasWidth = Math.floor(CANVAS_BASE_HEIGHT * getAspect());
let canvasHeight = CANVAS_BASE_HEIGHT;
let numColumns = Math.max(1, Math.floor(canvasWidth / FONT_SIZE));
let columnSpacing = canvasWidth / numColumns;

// Pre-allocate typed arrays for positions and speeds
let columnY = new Float32Array(numColumns);
let columnSpeed = new Float32Array(numColumns);

function initColumns() {
  for (let i = 0; i < numColumns; i++) {
    columnY[i] = Math.random() * canvasHeight; // Start at random Y
    columnSpeed[i] = (Math.random() * 0.5 + 0.5); // Speed multiplier per ms
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
  const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false for slight optimization if background is solid black

  // Initialize black background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  initColumns();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Calculate the exact frustum height for a camera at z=15 with 75 fov
  // This physically fills the camera lens without using raw pixel values
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
    // 1. Fade the background slightly
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Draw new characters
    ctx.fillStyle = '#0F0';
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';

    let hasChanged = false;

    for (let i = 0; i < numColumns; i++) {
      // Pick random Katakana character (Unicode 0x30A0 - 0x30FF)
      const charCode = 0x30A0 + Math.floor(Math.random() * 96);
      const text = String.fromCharCode(charCode);

      const x = i * columnSpacing + columnSpacing / 2;
      const y = columnY[i];

      ctx.fillText(text, x, y);

      // Advance column
      columnY[i] += columnSpeed[i] * deltaTime;

      // Reset if it goes off screen and passes random check
      if (columnY[i] > canvasHeight && Math.random() > 0.95) {
        columnY[i] = 0;
      }

      hasChanged = true;
    }

    if (hasChanged) {
      texture.needsUpdate = true;
    }
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

    numColumns = Math.max(1, Math.floor(canvasWidth / FONT_SIZE));
    columnSpacing = canvasWidth / numColumns;

    const oldNumColumns = columnY.length;
    const oldColumnY = columnY;
    const oldColumnSpeed = columnSpeed;

    columnY = new Float32Array(numColumns);
    columnSpeed = new Float32Array(numColumns);
    
    // Preserve existing raindrops to avoid a visual reset
    for (let i = 0; i < numColumns; i++) {
      if (i < oldNumColumns) {
        columnY[i] = oldColumnY[i];
        columnSpeed[i] = oldColumnSpeed[i];
      } else {
        columnY[i] = Math.random() * canvasHeight;
        columnSpeed[i] = Math.random() * 0.5 + 0.5;
      }
    }

    // Force WebGL to re-allocate the texture for the new canvas size
    texture.dispose();

    mesh.geometry.dispose();
    const newFrustumWidth = frustumHeight * newAspect;
    mesh.geometry = new THREE.PlaneGeometry(newFrustumWidth, frustumHeight);
  }

  return { mesh, update, resize };
}
