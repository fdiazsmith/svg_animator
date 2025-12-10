import flubber from 'flubber';
const { interpolate } = flubber;

/**
 * @typedef {Object} Frame
 * @property {string} path - SVG path d attribute
 * @property {number} index - Frame index
 * @property {boolean} isKeyframe - Whether this is an original keyframe
 */

/**
 * Generate interpolated frames between keyframes
 * @param {string[]} keyframePaths
 * @param {number} tweenCount - Number of frames between each keyframe
 * @returns {Frame[]}
 */
export function interpolateFrames(keyframePaths, tweenCount) {
  if (tweenCount <= 0) {
    return keyframePaths.map((path, i) => ({
      path,
      index: i,
      isKeyframe: true
    }));
  }

  const frames = [];
  let frameIndex = 0;

  for (let i = 0; i < keyframePaths.length; i++) {
    // Add keyframe
    frames.push({
      path: keyframePaths[i],
      index: frameIndex++,
      isKeyframe: true
    });

    // Add tween frames (except after last keyframe)
    if (i < keyframePaths.length - 1) {
      const tweens = generateTweens(
        keyframePaths[i],
        keyframePaths[i + 1],
        tweenCount
      );

      for (const tweenPath of tweens) {
        frames.push({
          path: tweenPath,
          index: frameIndex++,
          isKeyframe: false
        });
      }

      process.stdout.write(`\rInterpolating: ${i + 1}/${keyframePaths.length - 1}`);
    }
  }
  console.log('');

  return frames;
}

/**
 * Generate tween frames between two paths
 * @param {string} fromPath
 * @param {string} toPath
 * @param {number} count
 * @returns {string[]}
 */
export function generateTweens(fromPath, toPath, count) {
  const tweens = [];

  try {
    // Create flubber interpolator
    // maxSegmentLength: lower = smoother but more points
    const interp = interpolate(fromPath, toPath, {
      string: true,
      maxSegmentLength: 10
    });

    // Generate intermediate frames
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1); // Exclude 0 and 1 (keyframes)
      tweens.push(interp(t));
    }
  } catch (err) {
    // If interpolation fails, just duplicate the from path
    console.warn(`\nInterpolation warning: ${err.message}`);
    for (let i = 0; i < count; i++) {
      tweens.push(fromPath);
    }
  }

  return tweens;
}

/**
 * Generate interpolated path at specific progress
 * @param {string} fromPath
 * @param {string} toPath
 * @param {number} t - Progress 0-1
 * @returns {string}
 */
export function interpolatePath(fromPath, toPath, t) {
  const interp = interpolate(fromPath, toPath, {
    string: true,
    maxSegmentLength: 10
  });
  return interp(t);
}
