# Matrix Rain (Three.js)

>“What is real? How do you define real?” — Morpheus, The Matrix

## Project Goal
A passion project of mine that I wanted to do since I was 14. Enter the Matrix. 
A faithful reproduction of the iconic Matrix "code rain" built with vanilla JS and Three.js. This is a learning project aimed at creating readable and performant code, not just a functional end product.

## Tech Stack
- **Three.js** (r170+) - 3D rendering library
- **Vite** (8+) - Frontend tooling and development server
- **Vanilla JS** - Core logic implemented without frameworks like React or Vue
- **Target:** Modern browsers (Chrome, Firefox, Safari)
- **Deployment:** Static build suitable for GitHub Pages or Cloudflare Pages

## Milestones

- [x] **Milestone 1: CanvasTexture 2D rain on a flat plane** ⏳ *(In Progress)*
- [ ] **Milestone 2:** InstancedMesh true 3D rain columns
- [ ] **Milestone 3:** First-person WASD + mouse-look camera
- [ ] **Milestone 4:** Devanagari/Sanskrit character set (there is a Mahabharata concept I have in mind for Hindu Mythology, something the Wachowskis' were fond of)
- [ ] **Milestone 5:** Image ghost encoded in rain density

## Architecture & Code Style (with heavy help from AI coding agent)
- Modular architecture with logic broken down under `src/` as appropriate.
- State is passed explicitly; no global variables.
- Main animation loop is strictly handled in `main.js`.
- Performance-conscious object creation (e.g., geometries and materials are mutated each frame instead of recreated, avoiding `new THREE.Vector3()` in requestAnimationFrame).
- Strict ES Modules usage (import/export).
- Fully documented via JSDoc.

## Inspiration and Lots of Learning from the OG "Architect" - (https://github.com/Rezmason/matrix)[rezmason]
