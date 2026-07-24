# Matrix Rain (using Three.js)
<p>
  <a href="https://anshs.github.io/matrix-rain/">
    <img src="https://img.shields.io/badge/▶_Live_Demo-00FF66?style=for-the-badge&labelColor=003311&color=00FF66" alt="Live Demo" />
  </a>
  &nbsp;
  <a href="https://anshs.github.io/matrix-rain/3d/">
    <img src="https://img.shields.io/badge/3D_Parallax_Rain-22272e?style=for-the-badge&labelColor=1b1f23&color=adbac7" alt="3D Parallax Rain" />
  </a>
  &nbsp;
  <a href="https://anshs.github.io/matrix-rain/2d/">
    <img src="https://img.shields.io/badge/2D_Rain-22272e?style=for-the-badge&labelColor=1b1f23&color=adbac7" alt="2D Rain" />
  </a>
  &nbsp;
  <a href="./devlog/milestone-3.md">
    <img src="https://img.shields.io/badge/Devlog-22272e?style=for-the-badge&labelColor=1b1f23&color=adbac7" alt="Devlog" />
  </a>
</p>

![There is no Spoon](public/matrix-rain-cover.webp)


>“What is real? How do you define real?” — Morpheus, The Matrix

An "almost" faithful reproduction of the iconic Matrix "code rain" built with vanilla JS and Three.js. AI used only for learning and scaffolding the project, rest of the code written manually. I also journal my learning process [on my blog](https://anshulsharma.org/posts/matrix-rain/). A passion project of mine that I wanted to do since I was 14.

## Project Goals
- Stay true to original aesthetic as much as possible and only later experiment with new variations
- Highly performant across most modern desktop and mobile browsers. I would like to support 99% of the active browsers. Use GPU when available.
- Learn vector math, specially for 3D (I know, I know... 3blue1brown exists for a reason and there is AI. But still...)
- It has been solved (see [rezmason](https://github.com/Rezmason/matrix)), so I would like to give it a new twist at the end.

## Tech Stack
- **Three.js** (r170+) - 3D rendering library
- **Vite** (8+) - Frontend tooling and development server
- **Vanilla JS** - Core logic implemented without frameworks like React or Vue
- **Target:** Most modern desktop and mobile browsers (Chrome, Firefox, Safari)
- **Deployment:** Static build suitable for GitHub Pages or Cloudflare Pages

## Milestones
- [x] **Milestone 1:** CanvasTexture 2D rain on a flat plane 
- [x] **Milestone 2:** **InstancedMesh true 3D rain columns**
- [ ] **Milestone 3:** Interaction and movement using a first-person WASD + mouse-look camera + Glich in the Matrix ⏳ *(In Progress)*
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

# Matrix Rain 3D: Architecture & Function Cheat Sheet

This document breaks down how the 3D Matrix Rain is built, detailing what each function does and how they interact to render the final infinite scene.

## Core Flow Chart

The application follows a standard game loop architecture: Initialization first, followed by a continuous Render/Update loop.

```mermaid
graph TD
    subgraph Initialization [1. Initialization Phase]
        M[main.js] -->|Calls| SFC[setupFPSCamera]
        M -->|Calls| SR[setupRain3D]
        SR -->|Calls| CGA[createGlyphAtlas]
        SR -->|Creates| T[Trail Instances]
    end

    subgraph GameLoop [2. Render / Update Loop]
        A[animate in main.js] -->|Calls| UFC[updateFPSCamera]
        A -->|Calls| UR[updateRain]
        UR -->|Calls| TU[Trail.update]
        UR -->|Calls| GCI[getCharIndex]
    end

    Initialization --> GameLoop
```

---

## 1. The Entry Point: `main.js`

This file is the nervous system of the application. It creates the Three.js scene, renderer, and cameras, and orchestrates the animation loop.

*   `animate(now)`: The continuous game loop powered by `requestAnimationFrame`. This function fires roughly 60-144 times a second. It delegates updates to all the moving parts of the system by calling their respective `update` functions.
*   `toggleFullscreen()`, `toggleHUD()`: Simple UI helpers bound to keyboard keys and mobile gestures.

---

## 2. The Rain System: `src/rain/matrix-3d.js`

This is the most complex file in the project. It handles the GPU instantiation and the "Sparse Instance Pool" logic.

*   **`setupRain3D(scene, initialCamera)`**: The initializer. 
    *   **What it does**: It builds a custom texture atlas using `createGlyphAtlas`. It then creates the `THREE.InstancedMesh` (the massive pool of clones) and heavily injects custom WebGL shader code (`material.onBeforeCompile`) to achieve the Y-Axis Billboarding effect.
    *   **What it returns**: It returns an object containing an `update` function (which gets assigned to `updateRain` in `main.js`) and a `resize` function.
*   **`spawnTrail(index, cameraPos)`** *(internal)*: 
    *   **What it does**: Drops a new rain "trail" into the world. It calculates a random position near the camera, a random falling speed, and a trail length. If the trail falls below the camera's view, this function is called again to "teleport" it back up.
*   **`getCharIndex(cx, cy, cz)`** *(internal)*: 
    *   **What it does**: The mathematical brain for stable characters. Instead of storing random characters in an enormous array, it takes a physical 3D world coordinate and mathematically hashes it into a specific character index from the texture atlas. 
    *   **Glitch logic**: It also uses the global time to make ~20% of the grid "glitch" and flip to a new character randomly.
*   **`update(deltaTime, camera)`** *(returned to main)*: 
    *   **What it does**: The engine room. Every frame, it checks every trail. If a trail is inside the camera's view frustum, it calculates where the trail's trailing characters should physically exist in 3D space, snaps those positions to a mathematical grid, and updates the `InstancedMesh` GPU buffers so they render.

---

## 3. Support Functions

### `src/utils/fps-camera.js`
Handles the First Person movement (zero-gravity flying).
*   **`setupFPSCamera(camera, domElement)`**: Initializes the `THREE.Euler` rotation variables and hooks up the browser's Pointer Lock API so that mouse movements translate into pitch and yaw. It also tracks W/A/S/D and Space/Shift key presses.
*   **`updateFPSCamera(deltaTime, camera)`**: Called every frame. It translates the camera forward, backward, left, right, up, or down along the camera's *local* axes based on which keys are currently held down.

### `src/rain/glyph-atlas.js`
*   **`createGlyphAtlas(...)`**: A pure 2D Canvas utility. Before Three.js even renders a 3D frame, this function draws every single Matrix character in varying states of brightness (from glowing green to completely faded) onto a hidden 2D canvas. This canvas is then converted into a texture map and fed to the GPU, allowing the 3D planes to simply "look up" the character they need.

### `src/rain/trails.js`
*   **`class Trail`**: A very simple data structure holding a `position`, `direction`, `speed`, and `length`. 
*   **`Trail.update(deltaTime)`**: Merely advances the trail's invisible "head" downward based on its speed. The `matrix-3d.js` script handles drawing the visual tail behind this head.
