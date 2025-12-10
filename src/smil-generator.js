import fs from 'fs';

/**
 * Generate standalone SMIL-animated SVG
 * Uses calcMode="discrete" for reliable frame-by-frame playback
 * @param {Frame[]} frames
 * @param {Object} config
 */
export function generateSMIL(frames, config) {
  const paths = frames.map(f => f.path);
  const duration = frames.length / config.fps;

  // SMIL requires semicolon-separated values
  const valuesAttr = paths.join('; ');

  // KeyTimes: evenly distributed 0 to 1
  const keyTimes = paths.map((_, i) =>
    (i / (paths.length - 1)).toFixed(6)
  ).join('; ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${config.width}"
     height="${config.height}"
     viewBox="0 0 ${config.width} ${config.height}">
  <path fill="${config.color}" fill-rule="evenodd">
    <animate
      attributeName="d"
      dur="${duration.toFixed(2)}s"
      repeatCount="indefinite"
      calcMode="discrete"
      values="${valuesAttr}"
      keyTimes="${keyTimes}"
    />
  </path>
</svg>`;

  fs.writeFileSync(config.output + '.svg', svg);
}

/**
 * Generate SMIL with linear interpolation
 * Note: Only works if paths have compatible structures
 * Most potrace outputs will NOT work with linear mode
 * @param {Frame[]} frames
 * @param {Object} config
 */
export function generateSMILLinear(frames, config) {
  const paths = frames.map(f => f.path);
  const duration = frames.length / config.fps;

  const valuesAttr = paths.join('; ');
  const keyTimes = paths.map((_, i) =>
    (i / (paths.length - 1)).toFixed(6)
  ).join('; ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${config.width}"
     height="${config.height}"
     viewBox="0 0 ${config.width} ${config.height}">
  <path fill="${config.color}" fill-rule="evenodd">
    <animate
      attributeName="d"
      dur="${duration.toFixed(2)}s"
      repeatCount="indefinite"
      calcMode="linear"
      values="${valuesAttr}"
      keyTimes="${keyTimes}"
    />
  </path>
</svg>`;

  fs.writeFileSync(config.output + '-linear.svg', svg);
}
