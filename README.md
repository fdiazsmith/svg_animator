# SVG Animator

Convert image sequences or videos to animated SVGs with frame interpolation.

## Installation

```bash
npm install
```

Requires [ffmpeg](https://ffmpeg.org/) for video input.

## Usage

```bash
# Basic - image sequence
node bin/svg-animator.js -i "./frames/*.png" -o "./out/animation" -f 24

# Video input (mp4, mov, avi, webm, mkv)
node bin/svg-animator.js -i video.mp4 -o "./out/animation" -f 24

# With frame interpolation (smoother animation)
node bin/svg-animator.js -i "./frames/*.png" -o "./out/animation" -f 24 -t 2
```

## Output

Generates two files:
- `animation.html` - Self-contained web player with controls
- `animation.svg` - Standalone SMIL-animated SVG

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input <pattern>` | Input glob pattern or video file (required) | - |
| `-o, --output <path>` | Output path without extension (required) | - |
| `-f, --fps <n>` | Frames per second | 12 |
| `-t, --tween <n>` | Interpolated frames between keyframes | 0 |
| `--threshold <0-255>` | Potrace threshold for tracing | 128 |
| `--color <hex>` | Fill color | #000000 |
| `--width <n>` | Output width in pixels | auto |
| `--height <n>` | Output height in pixels | auto |
| `--precision <n>` | Decimal precision (0=integers) | 0 |
| `--tolerance <n>` | Curve simplification (0.2-2) | 1 |
| `--invert` | Trace light shapes on dark background | false |
| `--video-fps <n>` | Extract frames at this fps from video | all |
| `--player-only` | Generate web player only | false |
| `--smil-only` | Generate SMIL SVG only | false |

## Examples

### Dark shapes on light/transparent background (default)
```bash
node bin/svg-animator.js -i "./frames/*.png" -o "./out/anim" -f 24
```

### Light shapes on dark background
```bash
node bin/svg-animator.js -i "./frames/*.png" -o "./out/anim" -f 24 --invert --threshold 250
```

### Video with reduced frame rate
```bash
node bin/svg-animator.js -i video.mp4 -o "./out/anim" -f 12 --video-fps 12
```

### Smaller file size (more curve simplification)
```bash
node bin/svg-animator.js -i "./frames/*.png" -o "./out/anim" --tolerance 2
```

### Smoother animation with interpolation
```bash
node bin/svg-animator.js -i "./frames/*.png" -o "./out/anim" -f 30 -t 3
```

## How it works

1. **Input**: Reads image sequence (PNG/JPG) or extracts frames from video using ffmpeg
2. **Trace**: Converts each frame to SVG paths using [potrace](https://github.com/tooolbox/node-potrace)
3. **Interpolate**: Optionally generates tween frames using [flubber](https://github.com/veltman/flubber)
4. **Output**: Generates web player (HTML/JS) and/or SMIL-animated SVG

## License

MIT
