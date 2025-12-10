import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { convertImages } from './converter.js';
import { normalizePaths } from './normalizer.js';
import { interpolateFrames } from './interpolator.js';
import { generatePlayer } from './player-generator.js';
import { generateSMIL } from './smil-generator.js';

/**
 * Main animation pipeline
 * @param {Object} options - CLI options
 */
export async function animate(options) {
  console.log('SVG Animator\n');

  // 1. Resolve input files (sorted)
  const inputFiles = await glob(options.input);
  inputFiles.sort();

  if (inputFiles.length < 2) {
    throw new Error(`Need at least 2 input images, found ${inputFiles.length}`);
  }
  console.log(`Found ${inputFiles.length} input frames`);

  // 2. Convert to SVG paths
  const { paths: rawPaths, width, height } = await convertImages(inputFiles, {
    threshold: options.threshold,
    width: options.width,
    height: options.height
  });

  // 3. Normalize paths for interpolation
  console.log('Normalizing paths...');
  const normalizedPaths = normalizePaths(rawPaths);

  // 4. Generate interpolated frames
  const tweenCount = parseInt(options.tween) || 0;
  let allFrames;

  if (tweenCount > 0) {
    console.log(`Generating ${tweenCount} tween frames between each keyframe...`);
    allFrames = interpolateFrames(normalizedPaths, tweenCount);
  } else {
    allFrames = normalizedPaths.map((p, i) => ({
      path: p,
      index: i,
      isKeyframe: true
    }));
  }
  console.log(`Total frames: ${allFrames.length}`);

  // 5. Prepare config
  const config = {
    output: options.output,
    fps: parseInt(options.fps) || 12,
    color: options.color || '#000000',
    width: width,
    height: height
  };

  // 6. Ensure output directory exists
  const outDir = path.dirname(config.output);
  if (outDir && !fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 7. Generate outputs
  if (!options.smilOnly) {
    generatePlayer(allFrames, config);
    console.log(`Web player: ${config.output}.html`);
  }

  if (!options.playerOnly) {
    generateSMIL(allFrames, config);
    console.log(`SMIL SVG: ${config.output}.svg`);
  }

  console.log('\nDone!');
}
