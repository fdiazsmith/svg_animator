import flubber from 'flubber';
const { interpolate, separate, combine } = flubber;

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
 * Split compound path into subpaths, sorted by area (largest first)
 * @param {string} path
 * @returns {string[]}
 */
function splitPath(path) {
  const subPaths = [];
  const regex = /M[^M]+/gi;
  let match;
  while ((match = regex.exec(path)) !== null) {
    subPaths.push(match[0].trim());
  }
  if (subPaths.length === 0) return [path];

  // Sort by bounding area (largest first) for consistent ordering
  return subPaths.sort((a, b) => getPathArea(b) - getPathArea(a));
}

/**
 * Estimate bounding box area of a path
 * @param {string} path
 * @returns {number}
 */
function getPathArea(path) {
  const nums = path.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return 0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  return (maxX - minX) * (maxY - minY);
}

/**
 * Generate tween frames between two paths
 * Handles compound paths (with holes) by interpolating each subpath separately
 * @param {string} fromPath
 * @param {string} toPath
 * @param {number} count
 * @returns {string[]}
 */
export function generateTweens(fromPath, toPath, count) {
  const tweens = [];

  try {
    const fromSubPaths = splitPath(fromPath);
    const toSubPaths = splitPath(toPath);

    // If both have same number of subpaths, interpolate each separately
    if (fromSubPaths.length === toSubPaths.length && fromSubPaths.length > 1) {
      // Create interpolators for each subpath pair
      const interpolators = fromSubPaths.map((fromSub, idx) => {
        return interpolate(fromSub, toSubPaths[idx], {
          string: true,
          maxSegmentLength: 10
        });
      });

      // Generate tween frames
      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        const tweenSubPaths = interpolators.map(interp => interp(t));
        tweens.push(tweenSubPaths.join(' '));
      }
    } else {
      // Single path or mismatched subpath count - use simple interpolation
      const interp = interpolate(fromPath, toPath, {
        string: true,
        maxSegmentLength: 10
      });

      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1);
        tweens.push(interp(t));
      }
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
