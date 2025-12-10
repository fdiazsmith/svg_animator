/**
 * Normalize SVG paths for consistent interpolation
 * Keeps compound paths intact (preserves holes)
 *
 * @param {string[]} paths - Array of SVG path d attributes
 * @returns {string[]} Normalized paths (unchanged, kept for pipeline compatibility)
 */
export function normalizePaths(paths) {
  // Keep paths as-is to preserve holes/compound shapes
  return paths;
}

/**
 * Split compound path into individual sub-paths
 * Paths are separated by M (moveto) commands
 * @param {string} path
 * @returns {string[]}
 */
function splitPath(path) {
  // Match each subpath starting with M
  const subPaths = [];
  const regex = /M[^M]+/gi;
  let match;

  while ((match = regex.exec(path)) !== null) {
    subPaths.push(match[0].trim());
  }

  return subPaths.length > 0 ? subPaths : [path];
}

/**
 * Get the path with the largest bounding area
 * @param {string[]} paths
 * @returns {string}
 */
function getLargestPath(paths) {
  let largest = paths[0];
  let largestArea = 0;

  for (const path of paths) {
    const area = estimatePathArea(path);
    if (area > largestArea) {
      largestArea = area;
      largest = path;
    }
  }

  return largest;
}

/**
 * Rough estimate of path bounding area
 * @param {string} path
 * @returns {number}
 */
function estimatePathArea(path) {
  // Extract all numeric coordinates
  const nums = path.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return 0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Treat pairs as x,y coordinates
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

  if (!isFinite(minX)) return 0;
  return (maxX - minX) * (maxY - minY);
}

/**
 * Combine multiple sub-paths into single path string
 * @param {string[]} paths
 * @returns {string}
 */
export function combinePaths(paths) {
  return paths.join(' ');
}
