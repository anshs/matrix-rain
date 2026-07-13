# Devlog - Milestone 1: CanvasTexture 2D Rain

## What I built
- Set up a Three.js WebGL2 renderer and stripped out the Vite defaults.
- Implemented an offscreen 2D canvas (512x1024) to render a Matrix rain effect.
- Created 40 vertical columns dropping random Katakana characters, mapped as a `CanvasTexture` onto a `PlaneGeometry`.
- Included a custom, minimal-overhead FPS counter attached directly to the DOM to measure performance.

## What I learned
- **Memory Optimization in JS:** Pre-allocating `Float32Array` buffers for column positions and speeds is vastly better than creating objects in the hot-path render loop.
- **Three.js CanvasTexture updates:** Modifying a canvas context requires explicitly setting `texture.needsUpdate = true` on the Three.js side so the GPU pulls the new pixel data.
- **Batched Canvas Calls:** Calling `fillStyle` once per logic phase (one for fading, one for text) prevents unnecessary context switching in the Canvas API.

## What surprised me
- How simple it was to achieve the fading "trail" effect using just a semi-transparent black `fillRect()` rather than tracking historical character positions.
- The `alpha: false` context attribute when creating a 2D canvas can be a slight optimization when dealing with fully opaque backgrounds.

## Learning Notes:
- (canvas-rain.js) Preallocating typed arrays for optimization. 60 fps, memory otherwise will be allocated dynamically inside the render loop, garbage collector has to stop code to clean up memory, leading to micro-stutters called GC Jank. Also, standard JS arrays are hash-map structures, scattered across RAM physically. Preallocating memory ensures memory is allocated outside the loop, and also as a contigious block (Float32Array) of memory in RAM. CPU loads spatially close elements (spatial locality), speeds up loop iterations.
- 
