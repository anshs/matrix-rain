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

/* ========= KEYBOARD CONTROLS ========= */
let debugVisible = false;
let distractionsHidden = false;

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  
  if (key === 'd' && !distractionsHidden) {
    debugVisible = !debugVisible;
    toggleDebug(debugVisible);
    const fpsDiv = document.getElementById('fps-counter');
    if (fpsDiv) fpsDiv.style.visibility = debugVisible ? 'visible' : 'hidden';
  }
  
  if (key === 'f') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }
  
  if (key === 'h') {
    distractionsHidden = !distractionsHidden;
    const footer = document.querySelector('.footer');
    const fpsDiv = document.getElementById('fps-counter');
    
    if (distractionsHidden) {
      if (footer) footer.style.visibility = 'hidden';
      toggleDebug(false);
      if (fpsDiv) fpsDiv.style.visibility = 'hidden';
    } else {
      if (footer) footer.style.visibility = 'visible';
      toggleDebug(debugVisible);
      if (fpsDiv) fpsDiv.style.visibility = debugVisible ? 'visible' : 'hidden';
    }
  }
  
  if (e.key === 'Escape') {
    const helpModal = document.getElementById('help-modal');
    if (helpModal && !helpModal.classList.contains('hidden')) {
      helpModal.classList.add('hidden');
    }
  }
});

/* ========= UI & MODAL LOGIC ========= */
const DEVLOG_URL = '#'; // Update this to actual devlog URL when ready

const devlogFooter = document.getElementById('devlog-link-footer');
const devlogModal = document.getElementById('devlog-link-modal');
if (devlogFooter) devlogFooter.href = DEVLOG_URL;
if (devlogModal) devlogModal.href = DEVLOG_URL;

const helpModal = document.getElementById('help-modal');
const helpToggle = document.getElementById('help-toggle');
const helpModalClose = document.getElementById('help-modal-close');

if (helpToggle && helpModal) {
  helpToggle.addEventListener('click', (e) => {
    e.preventDefault();
    helpModal.classList.toggle('hidden');
  });
}

if (helpModalClose && helpModal) {
  helpModalClose.addEventListener('click', () => {
    helpModal.classList.add('hidden');
  });
}

// Close on backdrop click
if (helpModal) {
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.classList.add('hidden');
    }
  });
}