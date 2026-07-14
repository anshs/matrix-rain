# Matrix Rain (Three.js)

## Project Goal
A progressive 3D Matrix code rain effect built with vanilla JS and Three.js. This is a learning project aimed at creating readable and educational code, not just a functional end product.

## Tech Stack
- **Three.js** (r170+) - 3D rendering library
- **Vite** (8+) - Frontend tooling and development server
- **Vanilla JS** - Core logic implemented without frameworks like React or Vue
- **Target:** Modern browsers (Chrome, Firefox, Safari)
- **Deployment:** Static build suitable for GitHub Pages or Cloudflare Pages

## Milestones

- [ ] **Milestone 1: CanvasTexture 2D rain on a flat plane** ⏳ *(In Progress)*
- [ ] **Milestone 2:** InstancedMesh true 3D rain columns
- [ ] **Milestone 3:** First-person WASD + mouse-look camera
- [ ] **Milestone 4:** Devanagari/Sanskrit character set
- [ ] **Milestone 5:** Image ghost encoded in rain density

## Architecture & Code Style
- Modular architecture with logic broken down under `src/` as appropriate.
- State is passed explicitly; no global variables.
- Main animation loop is strictly handled in `main.js`.
- Performance-conscious object creation (e.g., geometries and materials are mutated each frame instead of recreated, avoiding `new THREE.Vector3()` in requestAnimationFrame).
- Strict ES Modules usage (import/export).
- Fully documented via JSDoc.
