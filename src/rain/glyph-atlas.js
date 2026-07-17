/**
 * Generates an offscreen Canvas Sprite Atlas containing all permutations
 * of the character set and trail styles (gradients and glows).
 */
export function createGlyphAtlas(
  charSet,
  cellWidth,
  cellHeight,
  fontSize,
  trailLength,
  headColor,
  startColor,
  endColor,
  glowColor,
  maxGlowBlur
) {
  const canvas = document.createElement('canvas');

  // Dimensions: X axis = characters, Y axis = trail depth
  canvas.width = charSet.length * cellWidth;
  canvas.height = trailLength * cellHeight;
  const ctx = canvas.getContext('2d', { alpha: true }); // Must have alpha for transparent background

  // Configure text styling
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Pre-render every combination
  for (let j = 0; j < trailLength; j++) {
    // 1. Calculate color and glow for this trail depth
    let fillStyle;
    let shadowBlur;

    if (j === 0) {
      fillStyle = headColor;
      shadowBlur = maxGlowBlur * 1.5;
    } else {
      const ratio = j / trailLength;
      // Linear interpolation for color gradient
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
      const a = startColor.a + (endColor.a - startColor.a) * ratio;
      fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
      
      // Exponential glow decay: drops sharply and is practically zero by the halfway mark
      let glowRatio = 0;
      if (ratio < 0.5) {
        // Map ratio from [0, 0.5] to [0, 1.0]
        const halfRatio = ratio * 2.0; 
        // Exponential falloff curve (cubic)
        glowRatio = Math.pow(1.0 - halfRatio, 3.0); 
      }
      shadowBlur = maxGlowBlur * glowRatio;
    }

    ctx.fillStyle = fillStyle;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = shadowBlur;

    // 2. Render each character
    for (let i = 0; i < charSet.length; i++) {
      const char = charSet[i];
      // Coordinates point to the exact center of the cell
      const x = i * cellWidth + (cellWidth / 2) + 2;
      const y = j * cellHeight + (cellHeight / 2) + 2;
      ctx.fillText(char, x, y);
    }
  }

  // Returns the source x and y coordinates for a specific char and trail index
  const getSourceCoords = (charIndex, trailIndex) => {
    return {
      sx: charIndex * cellWidth,
      sy: trailIndex * cellHeight
    };
  };

  return { atlasCanvas: canvas, getSourceCoords };
}
