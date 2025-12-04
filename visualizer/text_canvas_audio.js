let trackData = null;
let animationId = null;

const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const loading = document.getElementById('loading');
const info = document.getElementById('info');
const audioPlayer = document.getElementById('audioPlayer');
const audioControls = document.getElementById('audioControls');
const playPauseBtn = document.getElementById('playPauseBtn');

// Offscreen canvas for text rendering
const textCanvas = document.createElement('canvas');
const textCtx = textCanvas.getContext('2d');

// Load the JSON data
fetch('../turnstile_love_connection_p5.json')
  .then(res => res.json())
  .then(data => {
    trackData = data;
    loading.style.display = 'none';
    canvas.style.display = 'block';
    audioControls.style.display = 'flex';
    init();
  })
  .catch(err => {
    console.error('Error loading data:', err);
    loading.textContent = 'Error loading data. Check console.';
  });

function init() {
  const neverEnough = trackData.tracks.find(t => t.title === "NEVER ENOUGH");
  let aggressionData = neverEnough.frames.aggression;
  const trackDuration = neverEnough.duration;

  // Find max aggression for normalization
  const maxAggression = Math.max(...aggressionData);
  let normalizedAggressionData = aggressionData.map(a => a / maxAggression);

  // Controls
  const params = {
    chromaMin: 2,
    chromaMax: 8,
    waveFreqMin: 0.01,
    waveFreqMax: 0.03,
    waveAmpMin: 3,
    waveAmpMax: 15,
    blurAmount: 3,
    grainMin: 0.03,
    grainMax: 0.15,
    normalizeAggression: true
  };

  // Setup control listeners
  const chromaMin = document.getElementById('chromaMin');
  const chromaMax = document.getElementById('chromaMax');
  const chromaValue = document.getElementById('chromaValue');
  const waveFreqMin = document.getElementById('waveFreqMin');
  const waveFreqMax = document.getElementById('waveFreqMax');
  const waveFreqValue = document.getElementById('waveFreqValue');
  const waveAmpMin = document.getElementById('waveAmpMin');
  const waveAmpMax = document.getElementById('waveAmpMax');
  const waveAmpValue = document.getElementById('waveAmpValue');
  const blurAmountSlider = document.getElementById('blurAmount');
  const blurValue = document.getElementById('blurValue');
  const grainMin = document.getElementById('grainMin');
  const grainMax = document.getElementById('grainMax');
  const grainValue = document.getElementById('grainValue');
  const normalizeCheckbox = document.getElementById('normalizeAggression');
  const resetBtn = document.getElementById('resetBtn');

  chromaMin.addEventListener('input', () => {
    params.chromaMin = parseFloat(chromaMin.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(1)} → ${params.chromaMax.toFixed(1)}`;
  });
  chromaMax.addEventListener('input', () => {
    params.chromaMax = parseFloat(chromaMax.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(1)} → ${params.chromaMax.toFixed(1)}`;
  });

  waveFreqMin.addEventListener('input', () => {
    params.waveFreqMin = parseFloat(waveFreqMin.value);
    waveFreqValue.textContent = `${params.waveFreqMin.toFixed(3)} → ${params.waveFreqMax.toFixed(3)}`;
  });
  waveFreqMax.addEventListener('input', () => {
    params.waveFreqMax = parseFloat(waveFreqMax.value);
    waveFreqValue.textContent = `${params.waveFreqMin.toFixed(3)} → ${params.waveFreqMax.toFixed(3)}`;
  });

  waveAmpMin.addEventListener('input', () => {
    params.waveAmpMin = parseFloat(waveAmpMin.value);
    waveAmpValue.textContent = `${params.waveAmpMin.toFixed(1)} → ${params.waveAmpMax.toFixed(1)}`;
  });
  waveAmpMax.addEventListener('input', () => {
    params.waveAmpMax = parseFloat(waveAmpMax.value);
    waveAmpValue.textContent = `${params.waveAmpMin.toFixed(1)} → ${params.waveAmpMax.toFixed(1)}`;
  });

  blurAmountSlider.addEventListener('input', () => {
    params.blurAmount = parseFloat(blurAmountSlider.value);
    blurValue.textContent = params.blurAmount.toFixed(1);
  });

  grainMin.addEventListener('input', () => {
    params.grainMin = parseFloat(grainMin.value);
    grainValue.textContent = `${params.grainMin.toFixed(2)} → ${params.grainMax.toFixed(2)}`;
  });
  grainMax.addEventListener('input', () => {
    params.grainMax = parseFloat(grainMax.value);
    grainValue.textContent = `${params.grainMin.toFixed(2)} → ${params.grainMax.toFixed(2)}`;
  });

  normalizeCheckbox.addEventListener('change', () => {
    params.normalizeAggression = normalizeCheckbox.checked;
  });

  resetBtn.addEventListener('click', () => {
    chromaMin.value = params.chromaMin = 2;
    chromaMax.value = params.chromaMax = 8;
    waveFreqMin.value = params.waveFreqMin = 0.01;
    waveFreqMax.value = params.waveFreqMax = 0.03;
    waveAmpMin.value = params.waveAmpMin = 3;
    waveAmpMax.value = params.waveAmpMax = 15;
    blurAmountSlider.value = params.blurAmount = 3;
    grainMin.value = params.grainMin = 0.03;
    grainMax.value = params.grainMax = 0.15;
    normalizeCheckbox.checked = params.normalizeAggression = true;
    chromaValue.textContent = '2.0 → 8.0';
    waveFreqValue.textContent = '0.010 → 0.030';
    waveAmpValue.textContent = '3.0 → 15.0';
    blurValue.textContent = '3.0';
    grainValue.textContent = '0.03 → 0.15';
  });

  // Audio controls
  playPauseBtn.addEventListener('click', () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
      playPauseBtn.textContent = '⏸';
    } else {
      audioPlayer.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  // Canvas click to play/pause
  canvas.addEventListener('click', () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
      playPauseBtn.textContent = '⏸';
    } else {
      audioPlayer.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  // Handle window resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Resize text canvas
    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Render text to offscreen canvas
  function renderTextToCanvas(text, fontSize) {
    textCtx.fillStyle = '#000';
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    textCtx.fillStyle = '#fff';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

    return textCtx.getImageData(0, 0, textCanvas.width, textCanvas.height);
  }

  // Apply chromatic aberration
  function chromaticAberration(imageData, offsetR, offsetG, offsetB) {
    const output = ctx.createImageData(imageData.width, imageData.height);
    const w = imageData.width;
    const h = imageData.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;

        // Sample R channel with offset
        const xR = Math.min(Math.max(x + offsetR, 0), w - 1);
        const iR = (y * w + xR) * 4;

        // Sample G channel with offset
        const xG = Math.min(Math.max(x + offsetG, 0), w - 1);
        const iG = (y * w + xG) * 4;

        // Sample B channel with offset
        const xB = Math.min(Math.max(x + offsetB, 0), w - 1);
        const iB = (y * w + xB) * 4;

        output.data[i] = imageData.data[iR];
        output.data[i + 1] = imageData.data[iG + 1];
        output.data[i + 2] = imageData.data[iB + 2];
        output.data[i + 3] = Math.max(
          imageData.data[iR + 3],
          imageData.data[iG + 3],
          imageData.data[iB + 3]
        );
      }
    }

    return output;
  }

  // Apply wave displacement
  function waveDisplacement(imageData, amplitude, frequency, time) {
    const output = ctx.createImageData(imageData.width, imageData.height);
    const w = imageData.width;
    const h = imageData.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wave = Math.sin(y * frequency + time) * amplitude;
        const sourceX = Math.min(Math.max(Math.floor(x + wave), 0), w - 1);

        const i = (y * w + x) * 4;
        const si = (y * w + sourceX) * 4;

        output.data[i] = imageData.data[si];
        output.data[i + 1] = imageData.data[si + 1];
        output.data[i + 2] = imageData.data[si + 2];
        output.data[i + 3] = imageData.data[si + 3];
      }
    }

    return output;
  }

  // Apply grain/noise
  function addGrain(imageData, intensity) {
    const output = ctx.createImageData(imageData.width, imageData.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity * 255;

      output.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
      output.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
      output.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      output.data[i + 3] = imageData.data[i + 3];
    }

    return output;
  }

  // Motion blur (directional blur approximation)
  function applyMotionBlur(imageData, direction, amount) {
    if (amount === 0) return imageData;

    const output = ctx.createImageData(imageData.width, imageData.height);
    const w = imageData.width;
    const h = imageData.height;

    // Copy original data first
    for (let i = 0; i < imageData.data.length; i++) {
      output.data[i] = imageData.data[i];
    }

    // Apply directional blur by averaging neighboring pixels
    const samples = Math.floor(amount);
    if (samples === 0) return imageData;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        // Sample along direction
        for (let s = -samples; s <= samples; s++) {
          const sx = Math.min(Math.max(x + s * direction, 0), w - 1);
          const i = (y * w + sx) * 4;

          r += imageData.data[i];
          g += imageData.data[i + 1];
          b += imageData.data[i + 2];
          a += imageData.data[i + 3];
          count++;
        }

        const i = (y * w + x) * 4;
        output.data[i] = r / count;
        output.data[i + 1] = g / count;
        output.data[i + 2] = b / count;
        output.data[i + 3] = a / count;
      }
    }

    return output;
  }

  // Main draw loop
  function draw() {
    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now() / 1000;

    // Get current time from audio player
    const currentTime = audioPlayer.currentTime;
    const progress = currentTime / trackDuration;
    const index = Math.floor(progress * (aggressionData.length - 1));
    const rawAggression = aggressionData[Math.max(0, Math.min(index, aggressionData.length - 1))];
    const normalizedAggression = normalizedAggressionData[Math.max(0, Math.min(index, normalizedAggressionData.length - 1))];
    const aggression = params.normalizeAggression ? normalizedAggression : rawAggression;

    // Clear main canvas
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    // Calculate font size based on canvas width
    const fontSize = Math.floor(width / 8);

    // Render base text
    let imageData = renderTextToCanvas('NEVER ENOUGH', fontSize);

    // Apply effects based on aggression using control parameters

    // 1. Chromatic aberration first (before displacement)
    const chromaticOffset = aggression * params.chromaMax + (1 - aggression) * params.chromaMin;
    const offsetR = Math.floor(-chromaticOffset + Math.sin(time * 2) * aggression * 3);
    const offsetG = 0;
    const offsetB = Math.floor(chromaticOffset + Math.cos(time * 2) * aggression * 3);
    imageData = chromaticAberration(imageData, offsetR, offsetG, offsetB);

    // 2. Wave displacement
    const waveFreq = params.waveFreqMin + aggression * (params.waveFreqMax - params.waveFreqMin);
    const waveAmp = aggression * params.waveAmpMax + (1 - aggression) * params.waveAmpMin;
    imageData = waveDisplacement(imageData, waveAmp, waveFreq, time * (1 + aggression * 2));

    // 3. Motion blur (directional)
    const blurAmount = (1 - aggression) * params.blurAmount; // More blur when ethereal
    const blurDirection = 1; // Horizontal blur
    imageData = applyMotionBlur(imageData, blurDirection, blurAmount);

    // 4. Grain
    const grainIntensity = aggression * params.grainMax + (1 - aggression) * params.grainMin;
    imageData = addGrain(imageData, grainIntensity);

    // Put processed image on main canvas
    ctx.putImageData(imageData, 0, 0);

    // Draw timeline at bottom
    const timelineY = height - 100;
    const timelineHeight = 60;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(20, timelineY, width - 40, timelineHeight);

    // Aggression curve (use current setting)
    const displayData = params.normalizeAggression ? normalizedAggressionData : aggressionData;
    ctx.strokeStyle = '#ff64c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < displayData.length; i++) {
      const px = 20 + ((width - 40) * i) / (displayData.length - 1);
      const py = timelineY + timelineHeight - 10 - (displayData[i] * (timelineHeight - 20));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current position marker
    const markerX = 20 + ((width - 40) * progress);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(markerX, timelineY);
    ctx.lineTo(markerX, timelineY + timelineHeight);
    ctx.stroke();

    // Update info overlay
    info.innerHTML = `
      <div>AGGRESSION: ${aggression.toFixed(3)}</div>
      <div>PROGRESS: ${(progress * 100).toFixed(1)}%</div>
      <div>TIME: ${currentTime.toFixed(1)}s / ${trackDuration.toFixed(1)}s</div>
      <div style="margin-top: 8px; opacity: 0.6;">${audioPlayer.paused ? 'Paused' : 'Playing'}</div>
      <div style="margin-top: 8px; opacity: 0.4;">Canvas Pixel Manipulation + Audio</div>
    `;

    animationId = requestAnimationFrame(draw);
  }

  draw();
}
