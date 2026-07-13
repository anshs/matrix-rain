import * as THREE from 'three';
import { setupRain } from './rain/canvas-rain.js';
import { setupFPS, updateFPS } from './utils/fps.js';
import { debug, toggleDebug } from './utils/debug.js';
import { getAspect, onResize } from './utils/viewport.js';
import './style.css';

// Scene, Camera, Renderer Setup
const scene = new THREE.Scene();

// PerspectiveCamera: fov, aspect, near, far
const camera = new THREE.PerspectiveCamera(75, getAspect(), 1, 10000);
// Move camera back to see the plane
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Setup FPS counter
setupFPS();

// Setup Matrix Rain
const { mesh, update: updateRain, resize: resizeRain } = setupRain();
scene.add(mesh);

// Handle Window Resize via viewport source of truth
onResize((newAspect) => {
  camera.aspect = newAspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeRain(newAspect);
});

// Render Loop
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const deltaTime = now - lastTime;
  lastTime = now;

  // Update FPS counter
  updateFPS(now);

  // Update Rain Canvas
  updateRain(deltaTime);

  debug('Frame Time', deltaTime.toFixed(2) + ' ms');
  debug('Draw Calls', renderer.info.render.calls);
  debug('Triangles', renderer.info.render.triangles);

  // Track JS Heap Memory if supported by the browser (mostly Chrome/Edge)
  if (performance.memory) {
    debug('Memory (MB)', (performance.memory.usedJSHeapSize / 1048576).toFixed(1));
  }

  renderer.render(scene, camera);
}

// Start loop
animate(performance.now());

/* ========= DEBUG ========= */
// Debug initialization
window.addEventListener('keydown', (e) => {
  if (e.key === 'd' || e.key === 'D') toggleDebug();
});
debug('Press D [X]');