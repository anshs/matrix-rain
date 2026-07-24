import * as THREE from 'three';
import { getAspect } from '../utils/viewport.js';
import { ACTIVE_CHARSET } from './characters.js';
import { createGlyphAtlas } from './glyph-atlas.js';
import { Trail } from './trails.js';

// Configuration
const FONT_SIZE = 32;
const TRAIL_LENGTH = 30;
const TRAIL_HEAD_COLOR = '#d0ff00ff';
const TRAIL_START_COLOR = { r: 50, g: 255, b: 0, a: 1 };
const TRAIL_END_COLOR = { r: 0, g: 64, b: 0, a: 0 };
const GLOW_COLOR = '#0F0';
const GLOW_MAX_BLUR = 5;

// Grid configuration
const CHAR_WIDTH = 1.0;
const CHAR_HEIGHT = 1.0;
const SPACING_Z = 1.0;

const NUM_TRAILS = 750;
const MAX_INSTANCES = NUM_TRAILS * TRAIL_LENGTH;
const SPAWN_RANGE = 120; // How far around the camera trails spawn

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
       } else {
           gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
           return;
       }
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
       vec4 instanceWorldPos = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
       
       vec3 toCamera = cameraPosition - instanceWorldPos.xyz;
       toCamera.y = 0.0;
       
       if (length(toCamera) > 0.0001) {
           toCamera = normalize(toCamera);
       } else {
           toCamera = vec3(0.0, 0.0, 1.0);
       }
       
       vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCamera));
       mat3 rot = mat3(right, vec3(0.0, 1.0, 0.0), toCamera);
       
       vec3 billboardedPos = rot * transformed;
       
       vec4 mvPosition = viewMatrix * vec4(billboardedPos + instanceWorldPos.xyz, 1.0);
       gl_Position = projectionMatrix * mvPosition;
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

  // Create an InstancedMesh EXACTLY the size of the maximum visible characters
  let mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES);
  mesh.frustumCulled = false;

  const instanceUvInfo = new Float32Array(MAX_INSTANCES * 2);
  const uvAttribute = new THREE.InstancedBufferAttribute(instanceUvInfo, 2);
  uvAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('instanceUvInfo', uvAttribute);

  // Initialize with hidden state
  for (let i = 0; i < MAX_INSTANCES; i++) {
    instanceUvInfo[i * 2 + 0] = 0;
    instanceUvInfo[i * 2 + 1] = -1;
  }
  uvAttribute.needsUpdate = true;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const trails = [];

  let globalTime = 0;

  function getCharIndex(cx, cy, cz) {
    const hash = Math.abs(((cx + 1000000) * 73856093) ^ ((cy + 1000000) * 19349663) ^ ((cz + 1000000) * 83492791));

    // 20% of characters are "glitchy" and flip in place
    const flipChance = hash % 100;
    if (flipChance > 70) {
      // Each glitchy character flips at a different random interval (between 100ms and 900ms)
      const flipPeriod = 100 + (hash % 800);
      const timeOffset = Math.floor(globalTime / flipPeriod);
      const dynamicHash = hash ^ (timeOffset * 104729);
      return Math.abs(dynamicHash) % ACTIVE_CHARSET.length;
    }

    return hash % ACTIVE_CHARSET.length;
  }

  function spawnTrail(index, cameraPos) {
    const startPos = new THREE.Vector3(
      cameraPos.x + (Math.random() - 0.5) * SPAWN_RANGE,
      cameraPos.y + (Math.random() - 0.5) * SPAWN_RANGE + (SPAWN_RANGE / 2),
      cameraPos.z + (Math.random() - 0.5) * SPAWN_RANGE
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

  // Initial dummy trails
  for (let i = 0; i < NUM_TRAILS; i++) {
    spawnTrail(i, initialCamera.position);
  }

  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  const sqSpawnRange = SPAWN_RANGE * SPAWN_RANGE;

  function update(deltaTime, camera) {
    globalTime += deltaTime;

    // Calculate Frustum for culling trails
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    let instanceCount = 0;

    for (let i = 0; i < trails.length; i++) {
      const trail = trails[i];
      trail.update(deltaTime);

      // Respawn if trail falls way below camera, or gets left behind horizontally
      const distSq = trail.position.distanceToSquared(camera.position);
      if (trail.position.y < camera.position.y - SPAWN_RANGE || distSq > sqSpawnRange * 1.5) {
        spawnTrail(i, camera.position);
        continue;
      }

      // Check if trail intersects Frustum
      const trailCenter = new THREE.Vector3().addVectors(trail.position, trail.direction.clone().multiplyScalar(-trail.length / 2));
      const sphere = new THREE.Sphere(trailCenter, trail.length / 2 + CHAR_HEIGHT);
      if (!frustum.intersectsSphere(sphere)) continue;

      const samples = Math.floor(trail.length / CHAR_HEIGHT);

      for (let j = 0; j <= samples; j++) {
        // Prevent exceeding max instances
        if (instanceCount >= MAX_INSTANCES) break;

        const px = trail.position.x - trail.direction.x * (j * CHAR_HEIGHT);
        const py = trail.position.y - trail.direction.y * (j * CHAR_HEIGHT);
        const pz = trail.position.z - trail.direction.z * (j * CHAR_HEIGHT);

        // Snap coordinates to grid for matrix rain aesthetic
        const snappedX = Math.round(px / CHAR_WIDTH) * CHAR_WIDTH;
        const snappedY = Math.round(py / CHAR_HEIGHT) * CHAR_HEIGHT;
        const snappedZ = Math.round(pz / SPACING_Z) * SPACING_Z;

        dummy.position.set(snappedX, snappedY, snappedZ);
        dummy.updateMatrix();
        mesh.setMatrixAt(instanceCount, dummy.matrix);

        // Spatial hash for stable character
        const worldCx = Math.round(px / CHAR_WIDTH);
        const worldCy = Math.round(py / CHAR_HEIGHT);
        const worldCz = Math.round(pz / SPACING_Z);

        instanceUvInfo[instanceCount * 2 + 0] = getCharIndex(worldCx, worldCy, worldCz);
        instanceUvInfo[instanceCount * 2 + 1] = Math.floor((j / samples) * (TRAIL_LENGTH - 1));

        instanceCount++;
      }
    }

    mesh.count = instanceCount;
    mesh.instanceMatrix.needsUpdate = true;
    uvAttribute.needsUpdate = true;
  }

  function resize(camera) {
    // Not needed anymore
  }

  return { update, resize, getMesh: () => mesh };
}
