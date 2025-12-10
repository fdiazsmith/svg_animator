import potrace from 'potrace';

/**
 * Convert array of images to SVG path strings
 * @param {string[]} imagePaths
 * @param {Object} options
 * @returns {Promise<{paths: string[], width: number, height: number}>}
 */
export async function convertImages(imagePaths, options = {}) {
  const results = [];
  let width = options.width || 512;
  let height = options.height || 512;

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const result = await convertSingleImage(imagePath, options);
    results.push(result.path);

    // Use first image dimensions as reference if not specified
    if (i === 0 && !options.width) {
      width = result.width;
      height = result.height;
    }

    process.stdout.write(`\rConverting: ${i + 1}/${imagePaths.length}`);
  }
  console.log('');

  return { paths: results, width, height };
}

/**
 * Convert single image to SVG path
 * @param {string} imagePath
 * @param {Object} options
 * @returns {Promise<{path: string, width: number, height: number}>}
 */
export function convertSingleImage(imagePath, options = {}) {
  return new Promise((resolve, reject) => {
    const threshold = options.threshold ?? 128;
    const invert = options.invert ?? false;

    attemptTrace(imagePath, threshold, invert, options, (err, result) => {
      if (err) {
        // If empty path with default threshold, retry with higher threshold
        // (helps with transparent PNGs where shapes are light)
        if (err.message.includes('No path data') && threshold < 200) {
          attemptTrace(imagePath, 250, invert, options, (err2, result2) => {
            if (err2) return reject(err);
            resolve(result2);
          });
        } else {
          return reject(err);
        }
      } else {
        resolve(result);
      }
    });
  });
}

function attemptTrace(imagePath, threshold, invert, options, callback) {
  const trace = new potrace.Potrace();

  // blackOnWhite: true = trace dark shapes on light background (default)
  // blackOnWhite: false = trace light shapes on dark background (use --invert)
  trace.setParameters({
    turdSize: options.turdSize ?? 2,
    optCurve: true,
    optTolerance: options.tolerance ?? 1,
    threshold: threshold,
    blackOnWhite: !invert
  });

  trace.loadImage(imagePath, (err) => {
    if (err) return callback(new Error(`Failed to load ${imagePath}: ${err.message}`));

    const svg = trace.getSVG();
    const pathTag = trace.getPathTag();

    // Extract path d attribute
    const pathMatch = pathTag.match(/d="([^"]+)"/);
    if (!pathMatch || !pathMatch[1] || pathMatch[1].trim() === '') {
      return callback(new Error(`No path data found in ${imagePath}`));
    }

    // Extract dimensions from SVG
    const widthMatch = svg.match(/width="(\d+)"/);
    const heightMatch = svg.match(/height="(\d+)"/);
    const w = widthMatch ? parseInt(widthMatch[1]) : 512;
    const h = heightMatch ? parseInt(heightMatch[1]) : 512;

    // Filter out background rectangle paths (paths that span the entire canvas)
    const filteredPath = filterBackgroundPaths(pathMatch[1], w, h);

    if (!filteredPath || filteredPath.trim() === '') {
      return callback(new Error(`No valid path data after filtering in ${imagePath}`));
    }

    // Optimize path: reduce decimal precision
    const optimizedPath = optimizePath(filteredPath, options.precision ?? 0);

    callback(null, {
      path: optimizedPath,
      width: w,
      height: h
    });
  });
}

/**
 * Filter out background/artifact paths
 * Only removes paths that are clearly full-canvas rectangles or tiny edge artifacts
 * @param {string} pathData
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function filterBackgroundPaths(pathData, width, height) {
  // Split into subpaths (each starts with M)
  const subPaths = [];
  const regex = /M[^M]+/gi;
  let match;
  while ((match = regex.exec(pathData)) !== null) {
    subPaths.push(match[0].trim());
  }

  if (subPaths.length === 0) return pathData;
  if (subPaths.length === 1) return pathData; // Single path, keep it

  // Calculate bounds for each subpath
  const pathsWithBounds = subPaths.map(subPath => {
    const nums = subPath.match(/-?\d+\.?\d*/g);
    if (!nums || nums.length < 4) return { path: subPath, pathWidth: 0, pathHeight: 0, minX: 0, minY: 0 };

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

    return {
      path: subPath,
      pathWidth: maxX - minX,
      pathHeight: maxY - minY,
      minX, minY, maxX, maxY
    };
  });

  // Only filter out very specific cases:
  // 1. Full-canvas rectangles (>98% of canvas)
  // 2. Tiny edge artifacts (<3px in any dimension, touching edge)
  const filtered = pathsWithBounds.filter(p => {
    // Full canvas background rectangle
    if (p.pathWidth > width * 0.98 && p.pathHeight > height * 0.98) return false;

    // Tiny edge artifacts
    const touchesEdge = p.minX < 1 || p.minY < 1 || p.maxX > width - 1 || p.maxY > height - 1;
    if (touchesEdge && (p.pathWidth < 3 || p.pathHeight < 3)) return false;

    return true;
  });

  // If all filtered out, return original (don't lose data)
  if (filtered.length === 0) return pathData;

  return filtered.map(p => p.path).join(' ');
}

/**
 * Optimize path by reducing decimal precision
 * @param {string} pathData
 * @param {number} precision - decimal places (0 = integers)
 * @returns {string}
 */
function optimizePath(pathData, precision = 0) {
  // Round numbers to reduce file size
  return pathData.replace(/-?\d+\.?\d*/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    if (precision === 0) return Math.round(num).toString();
    return num.toFixed(precision);
  });
}
