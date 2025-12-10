import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff', '.webp'];

function isVideoFile(input) {
  const ext = path.extname(input).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

async function detectInputType(inputPath) {
  // Clean up input path
  let cleanInput = inputPath.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\/+$/, '')
    .replace(/\\ /g, ' ');

  if (isVideoFile(cleanInput)) {
    const resolvedPath = path.resolve(cleanInput);
    if (fs.existsSync(resolvedPath)) {
      return { type: 'video', exists: true, path: resolvedPath };
    }
    if (fs.existsSync(cleanInput)) {
      return { type: 'video', exists: true, path: cleanInput };
    }
    return { type: 'video', exists: false, path: cleanInput };
  }

  // Check if it's a directory
  let globPattern = cleanInput;
  try {
    const stats = fs.statSync(cleanInput);
    if (stats.isDirectory()) {
      globPattern = path.join(cleanInput, '*');
    }
  } catch (e) {
    // Not a file/directory, treat as glob pattern
  }

  // Try as glob pattern
  try {
    let files = await glob(globPattern);
    files = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    }).sort();

    if (files.length > 0) {
      return { type: 'sequence', exists: true, count: files.length, path: globPattern };
    }
  } catch (e) {}

  return { type: 'unknown', exists: false, path: cleanInput };
}

function cleanPath(val) {
  return val.trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\ /g, ' ');
}

/**
 * Run interactive TUI
 */
export async function runTUI() {
  console.log('\n🎬 SVG Animator');
  console.log('   Press Enter to use defaults\n');

  // Input (required)
  const inputPath = await input({
    message: 'Input:',
    validate: async (val) => {
      if (!val.trim()) return 'Required';
      const info = await detectInputType(val);
      if (!info.exists) return `Not found: ${info.path}`;
      return true;
    },
    transformer: cleanPath
  });

  const inputInfo = await detectInputType(inputPath);
  const cleanedInput = inputInfo.path;

  if (inputInfo.type === 'video') {
    console.log(`   📹 Video file\n`);
  } else {
    console.log(`   🖼️  ${inputInfo.count} images\n`);
  }

  // Output path
  const originalInput = cleanedInput.replace(/\*.*$/, '').replace(/\/+$/, '');
  const inputBasename = path.basename(originalInput, path.extname(originalInput));
  const defaultOutput = `./out/${inputBasename}`;

  const outputPath = await input({
    message: 'Output:',
    default: defaultOutput
  });

  // FPS
  const fps = await input({
    message: 'FPS:',
    default: '24',
    transformer: (val) => parseInt(val) || 24
  });

  // Trace mode
  const traceMode = await select({
    message: 'Trace mode:',
    choices: [
      { name: 'Dark on light', value: 'default' },
      { name: 'Light on dark (transparent PNGs)', value: 'invert' }
    ],
    default: 'default'
  });

  // Skip
  const skip = await input({
    message: 'Keep every Nth frame:',
    default: '1',
    transformer: (val) => parseInt(val) || 1
  });

  // Tween
  const tween = await input({
    message: 'Tween frames (0=none):',
    default: '0',
    transformer: (val) => parseInt(val) || 0
  });

  // Video FPS extraction
  let videoFps = null;
  if (inputInfo.type === 'video') {
    const limitFps = await confirm({
      message: 'Limit video extraction FPS?',
      default: false
    });
    if (limitFps) {
      const vfps = await input({
        message: 'Extract FPS:',
        default: '12'
      });
      videoFps = parseInt(vfps) || 12;
    }
  }

  // Advanced
  const showAdvanced = await confirm({
    message: 'Advanced options?',
    default: false
  });

  let threshold = 128;
  let color = '#000000';
  let tolerance = 1;
  let precision = 0;
  let outputType = 'both';

  if (showAdvanced) {
    threshold = parseInt(await input({ message: 'Threshold (0-255):', default: '128' })) || 128;
    color = await input({ message: 'Color:', default: '#000000' });
    tolerance = parseFloat(await input({ message: 'Tolerance (0.2-2):', default: '1' })) || 1;
    precision = parseInt(await input({ message: 'Precision:', default: '0' })) || 0;
    outputType = await select({
      message: 'Output:',
      choices: [
        { name: 'Both (HTML + SVG)', value: 'both' },
        { name: 'HTML only', value: 'player' },
        { name: 'SVG only', value: 'smil' }
      ]
    });
  }

  const options = {
    input: cleanedInput,
    output: outputPath,
    fps: parseInt(fps) || 24,
    tween: parseInt(tween) || 0,
    skip: parseInt(skip) || 1,
    threshold,
    color,
    tolerance,
    precision,
    invert: traceMode === 'invert',
    playerOnly: outputType === 'player',
    smilOnly: outputType === 'smil',
    videoFps
  };

  // Summary
  console.log('\n📋 Config:');
  console.log(`   ${inputInfo.type}: ${path.basename(originalInput)}`);
  console.log(`   → ${options.output}`);
  console.log(`   ${options.fps}fps, skip:${options.skip}, tween:${options.tween}`);
  if (options.invert) console.log(`   trace: light on dark`);
  if (videoFps) console.log(`   extract: ${videoFps}fps`);
  console.log('');

  const run = await confirm({ message: 'Run?', default: true });

  if (!run) {
    console.log('Cancelled.');
    process.exit(0);
  }

  return options;
}
