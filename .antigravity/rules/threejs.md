# Three.js Rules

## Renderer
- Always use WebGL2: `new THREE.WebGLRenderer({ antialias: true })`
- Set `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
- Handle resize: update camera.aspect + renderer.setSize on window resize

## Performance (non-negotiable)
- Use InstancedMesh for any repeated geometry (>10 copies)
- Pre-allocate dummy Object3D for matrix math: `const _dummy = new THREE.Object3D()`
- Call `instancedMesh.instanceMatrix.needsUpdate = true` after matrix writes
- For CanvasTexture: only set `texture.needsUpdate = true` when the canvas actually changed

## Materials
- Use MeshBasicMaterial for unlit surfaces (code rain doesn't need lighting)
- Dispose geometry and materials when removing objects: `.dispose()`

## Camera
- PerspectiveCamera(75, aspect, 0.1, 1000) is the default starting point
- Store camera position/direction in plain objects, not THREE.Vector3, for hot-path code

## Avoid
- `scene.traverse()` in the animation loop
- Creating new objects (new THREE.*, new Array()) inside the render loop
- Using `console.log` in the render loop — it tanks performance