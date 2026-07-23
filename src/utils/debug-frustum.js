import * as THREE from 'three';

let cameraHelper;
let gridBoxHelper;

/**
 * Adds debug visualizers for the camera frustum and grid boundary.
 * @param {THREE.Scene} scene 
 * @param {THREE.Camera} camera 
 * @param {THREE.Object3D} gridMesh 
 */
export function enableFrustumDebug(scene, camera, gridMesh) {
  if (!cameraHelper) {
    cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);
  }
  
  if (!gridBoxHelper && gridMesh) {
    // A red bounding box to show the physical limits of our 3D grid
    gridBoxHelper = new THREE.BoxHelper(gridMesh, 0xff0000);
    scene.add(gridBoxHelper);
  }
}

/**
 * Removes the debug visualizers from the scene.
 * @param {THREE.Scene} scene 
 */
export function disableFrustumDebug(scene) {
  if (cameraHelper) {
    scene.remove(cameraHelper);
    cameraHelper.dispose();
    cameraHelper = null;
  }
  
  if (gridBoxHelper) {
    scene.remove(gridBoxHelper);
    gridBoxHelper.dispose();
    gridBoxHelper = null;
  }
}

/**
 * Must be called in the animation loop if debug is enabled, to update bounds if things move.
 */
export function updateFrustumDebug() {
  if (cameraHelper) cameraHelper.update();
  if (gridBoxHelper) gridBoxHelper.update();
}
