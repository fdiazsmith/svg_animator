import { glob } from 'glob';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';
import { convertImages } from './converter.js';
import { normalizePaths } from './normalizer.js';
import { interpolateFrames } from './interpolator.js';
import { generatePlayer } from './player-generator.js';
import { generateSMIL } from './smil-generator.js';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];

/**
 * Check if input is a video file
 */
function isVideoFile(input) {
  const ext = path.extname(input).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Extract frames from video using ffmpeg
 * @returns {Promise<{frames: string[], tempDir: string}>}
 */
async function extractVideoFrames(videoPath, fps) {
  const tempDir = path.join(os.tmpdir(), `svg-animator-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const outputPattern = path.join(tempDir, 'frame_%05d.png');
  const fpsFilter = fps ? `-vf fps=${fps}` : '';

  console.log(`Extracting frames from video...`);

  try {
    execSync(`ffmpeg -i "${videoPath}" ${fpsFilter} "${outputPattern}" -y 2>/dev/null`, {
      stdio: 'pipe'
    });
  } catch (err) {
    throw new Error('ffmpeg failed. Make sure ffmpeg is installed.');
  }

  const frames = fs.readdirSync(tempDir)
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(tempDir, f));

  console.log(`Extracted ${frames.length} frames`);
  return { frames, tempDir };
}

/**
 * Main animation pipeline
 * @param {Object} options - CLI options
 */
export async function animate(options) {
  console.log('SVG Animator\n');

  let inputFiles;
  let tempDir = null;

  // 1. Handle video or image sequence input
  if (isVideoFile(options.input)) {
    const result = await extractVideoFrames(options.input, options.videoFps);
    inputFiles = result.frames;
    tempDir = result.tempDir;
  } else {
    inputFiles = await glob(options.input);
    inputFiles.sort();
  }

  if (inputFiles.length < 2) {
    throw new Error(`Need at least 2 input frames, found ${inputFiles.length}`);
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

  // Cleanup temp directory if video input
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('\nDone!');
}
