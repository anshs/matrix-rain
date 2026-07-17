/**
 * High-performance array index conversion utilities.
 * Modern JavaScript engines aggressively inline these arrow functions,
 * resulting in zero overhead while providing clean 2D/3D syntax.
 */

/**
 * Maps a 2D coordinate to a 1D flat array index.
 * @param {number} x - The x coordinate (column).
 * @param {number} y - The y coordinate (row).
 * @param {number} width - The width (number of columns) of the 2D grid.
 * @returns {number} The 1D index.
 */
export const getIndex2D = (x, y, width) => y * width + x;

/**
 * Maps a 3D coordinate to a 1D flat array index.
 * @param {number} x - The x coordinate (column).
 * @param {number} y - The y coordinate (row).
 * @param {number} z - The z coordinate (depth).
 * @param {number} width - The width (number of columns).
 * @param {number} height - The height (number of rows).
 * @returns {number} The 1D index.
 */
export const getIndex3D = (x, y, z, width, height) => z * (width * height) + y * width + x;
