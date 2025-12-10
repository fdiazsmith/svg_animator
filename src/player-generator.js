import fs from 'fs';

/**
 * Generate self-contained HTML player
 * @param {Frame[]} frames
 * @param {Object} config
 */
export function generatePlayer(frames, config) {
  const pathsJSON = JSON.stringify(frames.map(f => f.path));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SVG Animation</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; font-family: system-ui, sans-serif; }
    .container { text-align: center; }
    svg { background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .controls { margin-top: 20px; display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap; }
    button { padding: 10px 20px; border: none; border-radius: 6px; background: #4a9eff; color: white; font-size: 14px; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #3a8eef; }
    .slider-group { display: flex; align-items: center; gap: 8px; color: #aaa; font-size: 14px; }
    input[type="range"] { width: 120px; accent-color: #4a9eff; }
    .info { margin-top: 16px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <svg id="canvas" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
      <path id="shape" d="" fill="${config.color}" fill-rule="evenodd"/>
    </svg>
    <div class="controls">
      <button id="playPause">Pause</button>
      <button id="reset">Reset</button>
      <div class="slider-group">
        <span>Speed:</span>
        <input type="range" id="speed" min="0.1" max="3" step="0.1" value="1">
        <span id="speedVal">1x</span>
      </div>
      <div class="slider-group">
        <span>Frame:</span>
        <input type="range" id="scrub" min="0" max="${frames.length - 1}" value="0">
        <span id="frameNum">0</span>
      </div>
    </div>
    <div class="info">${frames.length} frames @ ${config.fps} fps</div>
  </div>
  <script>
(function() {
  const paths = ${pathsJSON};
  const fps = ${config.fps};
  const shape = document.getElementById('shape');
  const playPauseBtn = document.getElementById('playPause');
  const resetBtn = document.getElementById('reset');
  const speedSlider = document.getElementById('speed');
  const speedVal = document.getElementById('speedVal');
  const scrubSlider = document.getElementById('scrub');
  const frameNum = document.getElementById('frameNum');

  let frame = 0;
  let playing = true;
  let speed = 1;
  let lastTime = 0;
  let accumulator = 0;

  function render(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;

    if (playing) {
      accumulator += delta * speed;
      const frameTime = 1000 / fps;

      while (accumulator >= frameTime) {
        frame = (frame + 1) % paths.length;
        accumulator -= frameTime;
      }
    }

    shape.setAttribute('d', paths[frame]);
    scrubSlider.value = frame;
    frameNum.textContent = frame;
    requestAnimationFrame(render);
  }

  playPauseBtn.onclick = () => {
    playing = !playing;
    playPauseBtn.textContent = playing ? 'Pause' : 'Play';
  };

  resetBtn.onclick = () => {
    frame = 0;
    accumulator = 0;
  };

  speedSlider.oninput = () => {
    speed = parseFloat(speedSlider.value);
    speedVal.textContent = speed.toFixed(1) + 'x';
  };

  scrubSlider.oninput = () => {
    frame = parseInt(scrubSlider.value);
    playing = false;
    playPauseBtn.textContent = 'Play';
  };

  shape.setAttribute('d', paths[0]);
  requestAnimationFrame(render);
})();
  </script>
</body>
</html>`;

  fs.writeFileSync(config.output + '.html', html);
}
