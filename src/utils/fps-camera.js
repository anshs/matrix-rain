import * as THREE from 'three';

let isLocked = false;
let pitch = 0;
let yaw = 0;

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  shift: false,
};

// Movement speed
const speed = 30.0;
// Mouse sensitivity
const sensitivity = 0.002;

/**
 * Initializes the FPS camera controls.
 * @param {THREE.Camera} camera The main camera to control
 * @param {HTMLElement} domElement The element to attach pointer lock
 */
export function setupFPSCamera(camera, domElement) {
  // Extract initial rotation
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  euler.setFromQuaternion(camera.quaternion);
  pitch = euler.x;
  yaw = euler.y;

  // Request pointer lock on click
  domElement.addEventListener('click', () => {
    if (!isLocked) {
      domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === domElement;
  });

  document.addEventListener('mousemove', (event) => {
    if (!isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    yaw -= movementX * sensitivity;
    pitch -= movementY * sensitivity;

    // Constrain pitch to avoid flipping over
    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    euler.set(pitch, yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (key === ' ') keys.space = true;
    if (key === 'shift') keys.shift = true;
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (key === ' ') keys.space = false;
    if (key === 'shift') keys.shift = false;
  });
}

/**
 * Updates the camera position based on active keys.
 * @param {number} deltaTime Time elapsed since last frame in milliseconds
 * @param {THREE.Camera} camera The camera to move
 */
export function updateFPSCamera(deltaTime, camera) {
  if (!isLocked) return;

  const dt = deltaTime / 1000;
  const currentSpeed = speed * dt;

  // Translate relative to camera's local axes (free-floating)
  if (keys.w) camera.translateZ(-currentSpeed);
  if (keys.s) camera.translateZ(currentSpeed);
  if (keys.a) camera.translateX(-currentSpeed);
  if (keys.d) camera.translateX(currentSpeed);
  
  // Space moves up (local Y), Shift moves down (local Y)
  if (keys.space) camera.translateY(currentSpeed);
  if (keys.shift) camera.translateY(-currentSpeed);
}
