# Devlog: Milestone 2 - Moving to 3D

Welcome to Milestone 2! In our previous milestone, we successfully created a 2D Matrix Rain effect using a single flat `PlaneGeometry` and a dynamically updating `CanvasTexture`. While that looked cool, the goal of this project is a true, immersive 3D experience.

In this milestone, we've broken the characters out of the 2D plane and placed them in a fully 3D grid. Let's walk through how we accomplished this and the key Three.js features we used to make it performant.

---

## 1. The Performance Challenge: `InstancedMesh`

If we want thousands of characters floating in 3D space, our first thought might be to create thousands of `THREE.Mesh` objects. However, every distinct mesh requires a "draw call" from the CPU to the GPU. If we try to render 10,000 meshes, our framerate will plummet!

**The Solution:** [`THREE.InstancedMesh`](https://threejs.org/docs/#api/en/objects/InstancedMesh)

`InstancedMesh` is a special object that allows you to draw the *same* geometry and material thousands of times with only **one** draw call. 

### Before (Conceptual 10,000 draw calls):
```javascript
for(let i=0; i<10000; i++) {
  const mesh = new THREE.Mesh(planeGeometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}
```

### After (1 draw call!):
```javascript
// We create an InstancedMesh defining the total number of instances
const instancedMesh = new THREE.InstancedMesh(planeGeometry, material, 10000);

const dummy = new THREE.Object3D();
for(let i=0; i<10000; i++) {
  dummy.position.set(x, y, z);
  dummy.updateMatrix(); // Calculates the transform matrix
  
  // Apply this specific position matrix to the instance 'i'
  instancedMesh.setMatrixAt(i, dummy.matrix); 
}
scene.add(instancedMesh);
```
Using `InstancedMesh`, we can easily render a massive 3D grid of characters while keeping our frame rate a buttery smooth 60 FPS.

---

## 2. The Atlas Challenge: `onBeforeCompile`

There's a catch with `InstancedMesh`: all instances share the *same* material. But wait, we want different characters (and different trail glow opacities) on each plane! 

Our glyphs are stored in a Sprite Atlas (a big image containing all character variations). Usually, we'd adjust the `UV` mapping on the geometry to show a specific part of the atlas. But since geometry is shared, how do we give instances different UV offsets?

**The Solution:** Modifying the default Shader with [`Material.onBeforeCompile`](https://threejs.org/docs/#api/en/materials/Material.onBeforeCompile)

Three.js materials (like `MeshBasicMaterial`) are built on underlying GLSL shaders. `onBeforeCompile` gives us a hook to inject our own custom shader code right before Three.js sends it to the GPU.

We create a custom buffer attribute (`InstancedBufferAttribute`) to hold our specific character index and trail index for each instance, and then we inject code into the vertex shader to slide the UVs around!

```javascript
// 1. Create a custom attribute for our instances
// Each instance gets 2 floats (x: character index, y: trail depth)
const instanceUvInfo = new Float32Array(TOTAL_CELLS * 2);
const uvAttribute = new THREE.InstancedBufferAttribute(instanceUvInfo, 2);
geometry.setAttribute('instanceUvInfo', uvAttribute);

// 2. Inject custom GLSL into the material
material.onBeforeCompile = (shader) => {
  // We pass our atlas dimensions to the shader
  shader.uniforms.atlasCells = { value: new THREE.Vector2(numChars, numTrails) };

  // We inject logic to read our custom attribute and shift the vMapUv 
  // which is what Three.js uses to look up the texture!
  shader.vertexShader = shader.vertexShader.replace(
    '#include <uv_vertex>',
    `#include <uv_vertex>
     
     // cellX and cellY represent the size of one character cell in the atlas
     float cellX = 1.0 / atlasCells.x;
     float cellY = 1.0 / atlasCells.y;
     
     // Shift the UV coordinate based on the instance's specific character/trail
     vMapUv.x = (vMapUv.x * cellX) + (instanceUvInfo.x * cellX);
     vMapUv.y = (vMapUv.y * cellY) + (atlasCells.y - 1.0 - instanceUvInfo.y) * cellY;
    `
  );
};
```
By doing this, we keep all the nice built-in features of `MeshBasicMaterial` (like transparent blending) but gain the superpower of per-instance atlas lookups. We also implemented a `discard` logic in the fragment shader for any instance with a trail depth < 0, meaning the characters are completely invisible unless a rain drop trail passes over them!

---

## 3. The Logic Separation: CPU Trails vs GPU Rendering

Instead of tightly coupling our rain drops to the grid, we created a completely independent `Trail` class. 

```javascript
export class Trail {
  constructor(position, direction, length, speed) {
    this.position = position.clone();
    this.direction = direction.clone().normalize();
    // ...
  }
  update(deltaTime) {
    this.position.addScaledVector(this.direction, this.speed * deltaTime);
  }
}
```
A `Trail` is just mathematical vector math floating in space. It doesn't know about meshes or materials. 

In our main update loop, we move the logical trails. Then, we sample points along the length of each trail, figure out which 3D grid cell is closest to that point, and update that specific instance's `instanceUvInfo`. 

This architecture allows us to:
1. Easily change the direction of the rain (they don't have to fall straight down!).
2. Keep performance high (we only update the buffer attributes for instances that are actually illuminated).

---

## 4. Dynamic Screen Coverage

To ensure the 3D grid perfectly covers the entire screen irrespective of the window size, we implemented dynamic grid generation inside our `resize` logic. 

Instead of a fixed `60x60` layout, we calculate the exact width and height of the camera's view frustum at the deepest point of our grid:
```javascript
// Calculate grid size based on camera frustum at distance
const dist = camera.position.length() || 40;
const vFov = (camera.fov * Math.PI) / 180;
const heightAtCenter = 2 * Math.tan(vFov / 2) * dist;
const widthAtCenter = heightAtCenter * camera.aspect;

// We multiply by 1.5 to cover the swinging camera angles!
COLS = Math.ceil((widthAtCenter * 1.5) / CHAR_WIDTH);
ROWS = Math.ceil((heightAtCenter * 1.5) / CHAR_HEIGHT);
```
When the user resizes the window, we recompute these dimensions, dispose of the old `InstancedMesh`, and generate a perfectly sized new one.

---

## 5. CPU Frustum Culling

As our grid scales up to cover massive ultra-wide monitors, we might be rendering tens of thousands of instances and tracking hundreds of trails. To keep performance strictly optimal, we implemented **CPU-side Frustum Culling**.

[`THREE.Frustum`](https://threejs.org/docs/#api/en/math/Frustum) represents the pyramid-shaped volume of space that the camera can actually see. Since we update our instances purely based on proximity to falling trails, we can completely skip calculating characters for trails that are outside this frustum!

```javascript
// Update frustum for culling based on current camera position
projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
frustum.setFromProjectionMatrix(projScreenMatrix);

// Inside the trails loop:
const trailCenter = new THREE.Vector3().addVectors(trail.position, trail.direction.clone().multiplyScalar(-trail.length / 2));
const sphere = new THREE.Sphere(trailCenter, trail.length / 2 + CHAR_HEIGHT);

// Only process CPU proximity mapping if the trail is actually visible to the camera!
if (!frustum.intersectsSphere(sphere)) {
  continue; // Skip all math for this trail!
}
```
With this optimization, even if we have a massive 300,000 cell grid and 500 trails globally, the CPU only processes the Math for the specific trails that are actively visible on screen, keeping our JS thread incredibly lightweight.

---

## Next Steps
We've introduced a sweeping, pendular camera animation using `Math.sin(time)` on `camera.position` and `camera.lookAt()`. The matrix is alive in 3D! Next, we'll implement fully interactive First Person controls in Milestone 3.
