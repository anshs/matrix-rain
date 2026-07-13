# Performance Rules

## Memory
- Pre-allocate all arrays and buffers at startup
- Use typed arrays: Float32Array for positions/transforms, Uint8Array for character indices
- Object pool pattern for anything created/destroyed frequently

## Render Loop
- Target 60fps: each frame budget = ~16ms
- Profile with Firefox Profiler / DevTools Performance tab before optimizing
- Use `performance.now()` delta timing, not a fixed timestep

## Canvas 2D (for CanvasTexture)
- Keep the offscreen canvas the smallest resolution that looks good (512x1024 is a good start)
- Batch all draw calls — one fillRect pass, then one fillText pass
- Use `ctx.save() / ctx.restore()` only when necessary (has a cost)

## Debugging
- Add an FPS counter (simple div updated every 500ms) from Milestone 1
- Use `renderer.info` to monitor draw calls, triangles, textures