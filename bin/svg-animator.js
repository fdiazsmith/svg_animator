#!/usr/bin/env node

import { program } from 'commander';
import { animate } from '../src/index.js';
import { runTUI } from '../src/tui.js';

// Check if running in interactive mode (no args or just --interactive)
const args = process.argv.slice(2);
const isInteractive = args.length === 0 || args.includes('--interactive') || args.includes('-I');

if (isInteractive) {
  // TUI mode
  runTUI()
    .then(opts => animate(opts))
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
} else {
  // CLI mode
  program
    .name('svg-animator')
    .description('Convert image sequences to animated SVGs with interpolation')
    .version('1.0.0')
    .option('-I, --interactive', 'Run in interactive TUI mode')
    .requiredOption('-i, --input <pattern>', 'Input glob pattern (e.g., "./frames/*.png")')
    .requiredOption('-o, --output <path>', 'Output path without extension')
    .option('-f, --fps <number>', 'Frames per second', '12')
    .option('-t, --tween <number>', 'Interpolation frames between keyframes', '0')
    .option('--threshold <number>', 'Potrace threshold (0-255, auto if omitted)')
    .option('--color <hex>', 'Fill color', '#000000')
    .option('--width <number>', 'Output width in pixels')
    .option('--height <number>', 'Output height in pixels')
    .option('--player-only', 'Generate web player only')
    .option('--smil-only', 'Generate SMIL SVG only')
    .option('--precision <number>', 'Decimal precision for coordinates (0=integers)', '0')
    .option('--tolerance <number>', 'Curve tolerance (higher=simpler, 0.2-2)', '1')
    .option('--video-fps <number>', 'Extract frames at this fps from video input')
    .option('--invert', 'Invert tracing (trace light shapes on dark bg)', false)
    .option('--skip <number>', 'Keep every Nth frame (e.g., 2 = half the frames)', '1')
    .parse();

  const opts = program.opts();

  // Parse numeric options
  if (opts.threshold) opts.threshold = parseInt(opts.threshold);
  if (opts.width) opts.width = parseInt(opts.width);
  if (opts.height) opts.height = parseInt(opts.height);
  if (opts.precision) opts.precision = parseInt(opts.precision);
  if (opts.tolerance) opts.tolerance = parseFloat(opts.tolerance);
  if (opts.videoFps) opts.videoFps = parseInt(opts.videoFps);
  if (opts.skip) opts.skip = parseInt(opts.skip);

  animate(opts).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
