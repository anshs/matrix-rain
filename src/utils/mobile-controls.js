import { keys, setMobileActive, simulateMouseMove } from './fps-camera.js';

export function setupMobileControls() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!isTouchDevice) return;
  
  setMobileActive(true);

  // 1. Create Joystick Elements
  const joystickBase = document.createElement('div');
  joystickBase.id = 'joystick-base';
  
  const joystickStick = document.createElement('div');
  joystickStick.id = 'joystick-stick';
  
  joystickBase.appendChild(joystickStick);
  document.body.appendChild(joystickBase);

  // 2. Create Guide Overlay
  const guide = document.createElement('div');
  guide.id = 'mobile-guide';
  guide.innerHTML = `
    <div class="guide-half left-half">
      <svg class="guide-svg" viewBox="0 0 100 100">
        <rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="#0F0" stroke-width="3" stroke-dasharray="6 4" />
        <rect x="38" y="38" width="24" height="24" rx="4" fill="#0F0" />
        <path d="M50 8 L43 16 L57 16 Z" fill="#0F0" />
        <path d="M50 92 L43 84 L57 84 Z" fill="#0F0" />
        <path d="M8 50 L16 43 L16 57 Z" fill="#0F0" />
        <path d="M92 50 L84 43 L84 57 Z" fill="#0F0" />
      </svg>
      <p>Drag on left to Move</p>
    </div>
    <div class="guide-half right-half">
      <svg class="guide-svg" viewBox="0 0 100 100">
        <path d="M30 70 Q 50 30 70 70" fill="none" stroke="#0F0" stroke-width="3" stroke-dasharray="6 4" />
        <polygon points="70,70 62,62 76,58" fill="#0F0" />
        <rect x="24" y="64" width="12" height="12" rx="3" fill="#0F0" />
        <rect x="18" y="58" width="24" height="24" rx="6" fill="none" stroke="#0F0" stroke-width="2" opacity="0.6" />
      </svg>
      <p>Swipe on right to Look</p>
    </div>
  `;
  document.body.appendChild(guide);

  // Fade out guide after 4 seconds
  setTimeout(() => {
    guide.style.opacity = '0';
    setTimeout(() => guide.remove(), 1000);
  }, 4000);

  // 3. Touch Event Logic
  let moveTouchId = null;
  let lookTouchId = null;
  
  let joystickCenter = { x: 0, y: 0 };
  let lastLookPos = { x: 0, y: 0 };
  
  const JOYSTICK_RADIUS = 50; 
  const DEADZONE = 10; 

  // Prevent default scrolling on canvas
  document.addEventListener('touchmove', (e) => {
    if (e.target.tagName === 'CANVAS' || e.target === joystickBase || e.target === joystickStick || e.target.closest('#mobile-guide')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchstart', (e) => {
    // Ignore touches on UI buttons
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.help-modal-content')) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const isLeftHalf = touch.clientX < window.innerWidth / 2;

      if (isLeftHalf && moveTouchId === null) {
        // Start movement joystick
        moveTouchId = touch.identifier;
        joystickCenter = { x: touch.clientX, y: touch.clientY };
        
        // Show joystick at touch position
        joystickBase.style.display = 'block';
        joystickBase.style.left = `${joystickCenter.x - JOYSTICK_RADIUS}px`;
        joystickBase.style.top = `${joystickCenter.y - JOYSTICK_RADIUS}px`;
        joystickStick.style.transform = `translate(0px, 0px)`;
      } else if (!isLeftHalf && lookTouchId === null) {
        // Start look-around
        lookTouchId = touch.identifier;
        lastLookPos = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === moveTouchId) {
        // Handle Joystick
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const distance = Math.min(Math.sqrt(dx * dx + dy * dy), JOYSTICK_RADIUS);
        
        let angle = Math.atan2(dy, dx);
        
        // Visual update
        const stickX = Math.cos(angle) * distance;
        const stickY = Math.sin(angle) * distance;
        joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // Update WASD keys based on joystick position
        keys.w = false;
        keys.s = false;
        keys.a = false;
        keys.d = false;

        if (distance > DEADZONE) {
           const normX = Math.cos(angle) * (distance / JOYSTICK_RADIUS);
           const normY = Math.sin(angle) * (distance / JOYSTICK_RADIUS);

           if (normX > 0.3) keys.d = true;
           if (normX < -0.3) keys.a = true;
           if (normY > 0.3) keys.s = true;
           if (normY < -0.3) keys.w = true;
        }
      } else if (touch.identifier === lookTouchId) {
        // Handle Look
        const dx = touch.clientX - lastLookPos.x;
        const dy = touch.clientY - lastLookPos.y;
        
        // Multiply by a factor if touch sensitivity feels too high/low compared to mouse
        simulateMouseMove(dx, dy);
        
        lastLookPos = { x: touch.clientX, y: touch.clientY };
      }
    }
  }, { passive: false });

  function endTouch(touchId) {
      if (touchId === moveTouchId) {
        moveTouchId = null;
        joystickBase.style.display = 'none';
        keys.w = false;
        keys.a = false;
        keys.s = false;
        keys.d = false;
      } else if (touchId === lookTouchId) {
        lookTouchId = null;
      }
  }

  document.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) endTouch(e.changedTouches[i].identifier);
  });
  
  document.addEventListener('touchcancel', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) endTouch(e.changedTouches[i].identifier);
  });
}
