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
    const trace = new potrace.Potrace();

    trace.setParameters({
      turdSize: 2,
      optCurve: true,
      optTolerance: 0.2,
      threshold: options.threshold ?? 250,  // High threshold to catch light gray
      blackOnWhite: false  // Trace light shapes on dark/transparent background
    });

    trace.loadImage(imagePath, (err) => {
      if (err) return reject(new Error(`Failed to load ${imagePath}: ${err.message}`));

      const svg = trace.getSVG();
      const pathTag = trace.getPathTag();

      // Extract path d attribute
      const pathMatch = pathTag.match(/d="([^"]+)"/);
      if (!pathMatch) {
        return reject(new Error(`No path data found in ${imagePath}`));
      }

      // Extract dimensions from SVG
      const widthMatch = svg.match(/width="(\d+)"/);
      const heightMatch = svg.match(/height="(\d+)"/);
      const w = widthMatch ? parseInt(widthMatch[1]) : 512;
      const h = heightMatch ? parseInt(heightMatch[1]) : 512;

      // Filter out background rectangle paths (paths that span the entire canvas)
      const filteredPath = filterBackgroundPaths(pathMatch[1], w, h);

      resolve({
        path: filteredPath,
        width: w,
        height: h
      });
    });
  });
}

/**
 * Filter out background/artifact paths
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

  // Calculate bounds for each subpath
  const pathsWithBounds = subPaths.map(subPath => {
    const nums = subPath.match(/-?\d+\.?\d*/g);
    if (!nums || nums.length < 4) return { path: subPath, area: 0, isEdge: false };

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

    const pathWidth = maxX - minX;
    const pathHeight = maxY - minY;
    const area = pathWidth * pathHeight;

    // Check if path touches canvas edges (likely background artifact)
    const isEdge = minX < 2 || minY < 2 || maxX > width - 2 || maxY > height - 2;

    return { path: subPath, area, isEdge, pathWidth, pathHeight };
  });

  // Filter: remove edge-touching paths that span large areas
  const filtered = pathsWithBounds.filter(p => {
    // Remove paths that touch edges AND are very thin or span full dimension
    if (p.isEdge) {
      // Thin edge artifacts (like the 0.498 path)
      if (p.pathWidth < 5 || p.pathHeight < 5) return false;
      // Full-canvas spanning
      if (p.pathWidth > width * 0.9 && p.pathHeight > height * 0.9) return false;
    }
    return true;
  });

  return filtered.map(p => p.path).join(' ');
}
