import * as THREE from 'three';

/**
 * Represents a single rain drop trail in 3D space.
 */
export class Trail {
  /**
   * @param {THREE.Vector3} position Starting position
   * @param {THREE.Vector3} direction Direction of movement (will be normalized)
   * @param {number} length Length of the trail in world units
   * @param {number} speed Units to move per second
   */
  constructor(position, direction, length, speed) {
    this.position = position.clone();
    this.direction = direction.clone().normalize();
    this.length = length;
    this.speed = speed;
  }

  /**
   * Advances the trail position based on time and speed.
   * @param {number} deltaTime Time elapsed since last frame in milliseconds
   */
  update(deltaTime) {
    const deltaSeconds = deltaTime / 1000;
    this.position.addScaledVector(this.direction, this.speed * deltaSeconds);
  }
}
