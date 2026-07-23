import * as THREE from 'three';
import { getAspect } from '../utils/viewport.js';
import { ACTIVE_CHARSET } from './characters.js';
import { createGlyphAtlas } from './glyph-atlas.js';
import { Trail } from './trails.js';

// Configuration
const FONT_SIZE = 32;
const TRAIL_LENGTH = 30; // Length of trail in atlas
const TRAIL_HEAD_COLOR = '#d0ff00ff';
const TRAIL_START_COLOR = { r: 50, g: 255, b: 0, a: 1 };
const TRAIL_END_COLOR = { r: 0, g: 64, b: 0, a: 0 };
const GLOW_COLOR = '#0F0';
const GLOW_MAX_BLUR = 5;

// Grid configuration
const CHAR_WIDTH = 1.0;
const CHAR_HEIGHT = 1.0;
const SPACING_Z = 1.0;
const DEPTHS = 60;

let COLS = 60;
let ROWS = 60;
let TOTAL_CELLS = COLS * ROWS * DEPTHS;
let NUM_TRAILS = 150;

/**
 * Initializes the 3D InstancedMesh for Matrix Rain.
 * @param {THREE.Scene} scene The scene to add the mesh to
 * @param {THREE.Camera} initialCamera The camera for initial sizing
 */
export function setupRain3D(scene, initialCamera) {
  const atlasCellWidth = FONT_SIZE + GLOW_MAX_BLUR * 2 + 4;
  const atlasCellHeight = FONT_SIZE + GLOW_MAX_BLUR * 2 + 4;

  const { atlasCanvas } = createGlyphAtlas(
    ACTIVE_CHARSET,
    atlasCellWidth,
    atlasCellHeight,
    FONT_SIZE,
    TRAIL_LENGTH,
    TRAIL_HEAD_COLOR,
    TRAIL_START_COLOR,
    TRAIL_END_COLOR,
    GLOW_COLOR,
    GLOW_MAX_BLUR
  );

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const geometry = new THREE.PlaneGeometry(CHAR_WIDTH, CHAR_HEIGHT);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.atlasCells = { value: new THREE.Vector2(ACTIVE_CHARSET.length, TRAIL_LENGTH) };
    shader.vertexShader = `
      attribute vec2 instanceUvInfo; 
      uniform vec2 atlasCells;
      varying float vVisible;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
       vVisible = instanceUvInfo.y >= 0.0 ? 1.0 : 0.0;
       if (vVisible > 0.0) {
           float cellX = 1.0 / atlasCells.x;
           float cellY = 1.0 / atlasCells.y;
           float atlasY = atlasCells.y - 1.0 - instanceUvInfo.y;
           vMapUv.x = (vMapUv.x * cellX) + (instanceUvInfo.x * cellX);
           vMapUv.y = (vMapUv.y * cellY) + (atlasY * cellY);
       }
      `
    );

    shader.fragmentShader = `
      varying float vVisible;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
       if (vVisible < 0.5) discard;
       #include <map_fragment>
      `
    );
  };

  let mesh;
  let instanceUvInfo;
  let uvAttribute;
  let charIndices;
  let trails = [];
  let activeInstances = [];

  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();

  function buildGrid(camera) {
    if (mesh) {
      scene.remove(mesh);
      mesh.dispose();
    }

    // Calculate grid size based on camera frustum at the FARTHEST distance
    const dist = camera.position.length() || 40;
    const maxDist = dist + (DEPTHS / 2) * SPACING_Z; // The back of the grid
    const vFov = (camera.fov * Math.PI) / 180;

    // The frustum is taller and wider the farther away you go.
    // We must size our grid so that the farthest layer covers the screen!
    const heightAtBack = 2 * Math.tan(vFov / 2) * maxDist;
    const widthAtBack = heightAtBack * camera.aspect;

    // Multiply by 1.5 to cover the swinging camera angles
    COLS = Math.ceil((widthAtBack * 1.5) / CHAR_WIDTH);
    ROWS = Math.ceil((heightAtBack * 1.5) / CHAR_HEIGHT);
    TOTAL_CELLS = COLS * ROWS * DEPTHS;

    // Scale trails proportionally
    NUM_TRAILS = Math.floor((COLS * ROWS) / 20);

    mesh = new THREE.InstancedMesh(geometry, material, TOTAL_CELLS);
    mesh.frustumCulled = false; // We handle culling logically

    const dummy = new THREE.Object3D();
    let index = 0;
    for (let z = 0; z < DEPTHS; z++) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = (x - COLS / 2) * CHAR_WIDTH;
          const py = (y - ROWS / 2) * CHAR_HEIGHT;
          const pz = (z - DEPTHS / 2) * SPACING_Z;
          dummy.position.set(px, py, pz);
          dummy.updateMatrix();
          mesh.setMatrixAt(index++, dummy.matrix);
        }
      }
    }

    instanceUvInfo = new Float32Array(TOTAL_CELLS * 2);
    uvAttribute = new THREE.InstancedBufferAttribute(instanceUvInfo, 2);
    uvAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('instanceUvInfo', uvAttribute);

    charIndices = new Uint16Array(TOTAL_CELLS);
    for (let i = 0; i < TOTAL_CELLS; i++) {
      charIndices[i] = Math.floor(Math.random() * ACTIVE_CHARSET.length);
      instanceUvInfo[i * 2 + 0] = charIndices[i];
      instanceUvInfo[i * 2 + 1] = -1;
    }
    uvAttribute.needsUpdate = true;

    trails = [];
    for (let i = 0; i < NUM_TRAILS; i++) {
      spawnTrail(i);
    }

    scene.add(mesh);
  }

  function spawnTrail(index) {
    // Top of the grid
    const topOfGrid = (ROWS / 2) * CHAR_HEIGHT;
    // Spawn between the top of the grid and 1 screen-height above it
    const startY = topOfGrid + Math.random() * (ROWS * CHAR_HEIGHT);

    const startPos = new THREE.Vector3(
      (Math.random() - 0.5) * COLS * CHAR_WIDTH,
      startY,
      (Math.random() - 0.5) * DEPTHS * SPACING_Z
    );
    const dir = new THREE.Vector3(0, -1, 0);
    const speed = Math.random() * 15 + 10;
    const length = Math.floor(Math.random() * 15 + 15);

    if (trails[index]) {
      trails[index].position.copy(startPos);
      trails[index].direction.copy(dir);
      trails[index].length = length;
      trails[index].speed = speed;
    } else {
      trails.push(new Trail(startPos, dir, length, speed));
    }
  }

  // Initial build
  buildGrid(initialCamera);

  function update(deltaTime, camera) {
    // Update frustum for culling
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const changeProbability = deltaTime / 500;

    for (let i = 0; i < activeInstances.length; i++) {
      const idx = activeInstances[i];
      instanceUvInfo[idx * 2 + 1] = -1;
      if (Math.random() < changeProbability) {
        charIndices[idx] = Math.floor(Math.random() * ACTIVE_CHARSET.length);
      }
    }
    activeInstances.length = 0;

    for (let i = 0; i < trails.length; i++) {
      const trail = trails[i];
      trail.update(deltaTime);

      if (trail.position.y < (-ROWS / 2) * CHAR_HEIGHT - trail.length) {
        spawnTrail(i);
        continue;
      }

      // Frustum Culling Check
      // Calculate a simple bounding sphere for the trail segment
      const trailCenter = new THREE.Vector3().addVectors(trail.position, trail.direction.clone().multiplyScalar(-trail.length / 2));
      const sphere = new THREE.Sphere(trailCenter, trail.length / 2 + CHAR_HEIGHT);

      // Only process CPU proximity mapping if the trail is actually visible to the camera!
      if (!frustum.intersectsSphere(sphere)) {
        continue; // Skip calculating characters for this trail to save massive CPU performance
      }

      const samples = Math.floor(trail.length / CHAR_HEIGHT);

      for (let j = 0; j <= samples; j++) {
        const px = trail.position.x - trail.direction.x * (j * CHAR_HEIGHT);
        const py = trail.position.y - trail.direction.y * (j * CHAR_HEIGHT);
        const pz = trail.position.z - trail.direction.z * (j * CHAR_HEIGHT);

        const cx = Math.round(px / CHAR_WIDTH + COLS / 2);
        const cy = Math.round(py / CHAR_HEIGHT + ROWS / 2);
        const cz = Math.round(pz / SPACING_Z + DEPTHS / 2);

        if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS && cz >= 0 && cz < DEPTHS) {
          const idx = cx + cy * COLS + cz * COLS * ROWS;
          instanceUvInfo[idx * 2 + 0] = charIndices[idx];
          instanceUvInfo[idx * 2 + 1] = Math.floor((j / samples) * (TRAIL_LENGTH - 1));
          activeInstances.push(idx);
        }
      }
    }

    uvAttribute.needsUpdate = true;
  }

  function resize(camera) {
    buildGrid(camera);
  }

  return { update, resize, getMesh: () => mesh };
}
