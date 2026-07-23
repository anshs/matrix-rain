# Matrix Rain (using Three.js)

[]

>“What is real? How do you define real?” — Morpheus, The Matrix

An "almost" faithful reproduction of the iconic Matrix "code rain" built with vanilla JS and Three.js. AI used only for learning and scaffolding the project, rest of the code written manually. I also journal my learning process [on my blog](https://anshulsharma.org/posts/matrix-rain/). A passion project of mine that I wanted to do since I was 14.

## Project Goals
- Stay true to original aesthetic as much as possible and only later experiment with new variations
- Highly performant across most modern desktop and mobile browsers. I would like to support 99% of the active browsers. Use GPU when available.
- Learn vector math, specially for 3D (I know, I know... 3blue1brown exists for a reason and there is AI. But still...)
- It has been solved (see [rezmason] (https://github.com/Rezmason/matrix)), so I would like to give it a new twise at the end.

## Tech Stack
- **Three.js** (r170+) - 3D rendering library
- **Vite** (8+) - Frontend tooling and development server
- **Vanilla JS** - Core logic implemented without frameworks like React or Vue
- **Target:** Most modern desktop and mobile browsers (Chrome, Firefox, Safari)
- **Deployment:** Static build suitable for GitHub Pages or Cloudflare Pages

## Milestones
- [x] **Milestone 1:** CanvasTexture 2D rain on a flat plane 
- [ ] **Milestone 2:** **InstancedMesh true 3D rain columns**⏳ *(In Progress)*
- [ ] **Milestone 3:** Interaction and movement using a first-person WASD + mouse-look camera + Glich in the Matrix
- [ ] **Milestone 4:** Devanagari/Sanskrit character set (there is a Mahabharata concept I have in mind for Hindu Mythology, something the Wachowskis' were fond of)
- [ ] **Milestone 5:** "Ghost" image encoded in rain density and other use-cases for this.  

## TODO
- Browser check: Ensure compatability with p99 browsers
- Use of shaders and three js bloom effect instead of shadow and blur
- Multiple rain-drops per column
- Explore and learn vector math

## Architecture & Code Style (with heavy help from AI coding agent)
- Modular architecture with logic broken down under `src/` as appropriate.
- State is passed explicitly; no global variables.
- Main animation loop is strictly handled in `main.js`.
- Performance-conscious object creation (e.g., geometries and materials are mutated each frame instead of recreated, avoiding `new THREE.Vector3()` in requestAnimationFrame).
- Strict ES Modules usage (import/export).
- Using AI for creating documentation via JSDoc, github commits, and taking notes that I refer later for writing my blogposts.

## Inspiration and Lots of Learning from the OG "Architect" - [rezmason] (https://github.com/Rezmason/matrix). This is the most complete bible on the Matrix digital code rain.
