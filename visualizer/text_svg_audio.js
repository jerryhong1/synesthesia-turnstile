let trackData = null;
let animationId = null;

const container = document.getElementById('container');
const loading = document.getElementById('loading');
const info = document.getElementById('info');
const timelineCanvas = document.getElementById('timeline');
const timelineCtx = timelineCanvas.getContext('2d');
const audioPlayer = document.getElementById('audioPlayer');
const audioControls = document.getElementById('audioControls');
const playPauseBtn = document.getElementById('playPauseBtn');

// SVG filter elements
const turbulence = document.getElementById('turbulence');
const displacement = document.getElementById('displacement');
const blur = document.getElementById('blur');
const offsetR = document.getElementById('offsetR');
const offsetB = document.getElementById('offsetB');
const grain = document.getElementById('grain');

// Load the JSON data
fetch('../turnstile_love_connection_p5.json')
  .then(res => res.json())
  .then(data => {
    trackData = data;
    loading.style.display = 'none';
    container.style.display = 'block';
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
    turbFreqMin: 0.005,
    turbFreqMax: 0.015,
    dispMin: 5,
    dispMax: 50,
    blurMin: 0.5,
    blurMax: 2,
    chromaMin: 2,
    chromaMax: 20,
    grainMin: 0.8,
    grainMax: 1.1,
    normalizeAggression: true
  };

  // Setup control listeners
  const turbFreqMin = document.getElementById('turbFreqMin');
  const turbFreqMax = document.getElementById('turbFreqMax');
  const turbFreqValue = document.getElementById('turbFreqValue');
  const dispMin = document.getElementById('dispMin');
  const dispMax = document.getElementById('dispMax');
  const dispValue = document.getElementById('dispValue');
  const blurMin = document.getElementById('blurMin');
  const blurMax = document.getElementById('blurMax');
  const blurValue = document.getElementById('blurValue');
  const chromaMin = document.getElementById('chromaMin');
  const chromaMax = document.getElementById('chromaMax');
  const chromaValue = document.getElementById('chromaValue');
  const grainMin = document.getElementById('grainMin');
  const grainMax = document.getElementById('grainMax');
  const grainValue = document.getElementById('grainValue');
  const normalizeCheckbox = document.getElementById('normalizeAggression');
  const resetBtn = document.getElementById('resetBtn');

  turbFreqMin.addEventListener('input', () => {
    params.turbFreqMin = parseFloat(turbFreqMin.value);
    turbFreqValue.textContent = `${params.turbFreqMin.toFixed(3)} → ${params.turbFreqMax.toFixed(3)}`;
  });
  turbFreqMax.addEventListener('input', () => {
    params.turbFreqMax = parseFloat(turbFreqMax.value);
    turbFreqValue.textContent = `${params.turbFreqMin.toFixed(3)} → ${params.turbFreqMax.toFixed(3)}`;
  });

  dispMin.addEventListener('input', () => {
    params.dispMin = parseFloat(dispMin.value);
    dispValue.textContent = `${params.dispMin.toFixed(0)} → ${params.dispMax.toFixed(0)}`;
  });
  dispMax.addEventListener('input', () => {
    params.dispMax = parseFloat(dispMax.value);
    dispValue.textContent = `${params.dispMin.toFixed(0)} → ${params.dispMax.toFixed(0)}`;
  });

  blurMin.addEventListener('input', () => {
    params.blurMin = parseFloat(blurMin.value);
    blurValue.textContent = `${params.blurMin.toFixed(1)} → ${params.blurMax.toFixed(1)}`;
  });
  blurMax.addEventListener('input', () => {
    params.blurMax = parseFloat(blurMax.value);
    blurValue.textContent = `${params.blurMin.toFixed(1)} → ${params.blurMax.toFixed(1)}`;
  });

  chromaMin.addEventListener('input', () => {
    params.chromaMin = parseFloat(chromaMin.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(1)} → ${params.chromaMax.toFixed(1)}`;
  });
  chromaMax.addEventListener('input', () => {
    params.chromaMax = parseFloat(chromaMax.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(1)} → ${params.chromaMax.toFixed(1)}`;
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
    turbFreqMin.value = params.turbFreqMin = 0.005;
    turbFreqMax.value = params.turbFreqMax = 0.015;
    dispMin.value = params.dispMin = 5;
    dispMax.value = params.dispMax = 50;
    blurMin.value = params.blurMin = 0.5;
    blurMax.value = params.blurMax = 2;
    chromaMin.value = params.chromaMin = 2;
    chromaMax.value = params.chromaMax = 20;
    grainMin.value = params.grainMin = 0.8;
    grainMax.value = params.grainMax = 1.1;
    normalizeCheckbox.checked = params.normalizeAggression = true;
    turbFreqValue.textContent = '0.005 → 0.015';
    dispValue.textContent = '5 → 50';
    blurValue.textContent = '0.5 → 2.0';
    chromaValue.textContent = '2.0 → 20.0';
    grainValue.textContent = '0.80 → 1.10';
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
  container.addEventListener('click', () => {
    if (audioPlayer.paused) {
      audioPlayer.play();
      playPauseBtn.textContent = '⏸';
    } else {
      audioPlayer.pause();
      playPauseBtn.textContent = '▶';
    }
  });

  // Setup timeline canvas
  function resizeTimeline() {
    timelineCanvas.width = window.innerWidth - 40;
    timelineCanvas.height = 60;
  }
  resizeTimeline();
  window.addEventListener('resize', resizeTimeline);

  // Main animation loop
  function animate() {
    const width = window.innerWidth;
    const time = Date.now() / 1000;

    // Get current time from audio player
    const currentTime = audioPlayer.currentTime;
    const progress = currentTime / trackDuration;
    const index = Math.floor(progress * (aggressionData.length - 1));
    const rawAggression = aggressionData[Math.max(0, Math.min(index, aggressionData.length - 1))];
    const normalizedAggression = normalizedAggressionData[Math.max(0, Math.min(index, normalizedAggressionData.length - 1))];
    const aggression = params.normalizeAggression ? normalizedAggression : rawAggression;

    // Animate SVG filter parameters based on aggression using control parameters

    // 1. Turbulence/Displacement - wave effect
    const turbFreqBase = params.turbFreqMin + aggression * (params.turbFreqMax - params.turbFreqMin);
    const turbFreq = turbFreqBase + Math.sin(time * 2) * 0.002;
    turbulence.setAttribute('baseFrequency', turbFreq.toFixed(4));

    const dispScale = aggression * params.dispMax + (1 - aggression) * params.dispMin;
    displacement.setAttribute('scale', dispScale.toFixed(1));

    // 2. Blur - motion blur effect
    const blurAmount = aggression * params.blurMin + (1 - aggression) * params.blurMax;
    blur.setAttribute('stdDeviation', blurAmount.toFixed(2));

    // 3. Chromatic aberration - RGB offset
    const chromaOffset = aggression * params.chromaMax + (1 - aggression) * params.chromaMin;
    const offsetAmount = chromaOffset + Math.sin(time * 3) * aggression * 5;
    offsetR.setAttribute('dx', (-offsetAmount).toFixed(2));
    offsetB.setAttribute('dx', offsetAmount.toFixed(2));

    // 4. Grain intensity
    const grainFreq = params.grainMin + aggression * (params.grainMax - params.grainMin);
    grain.setAttribute('baseFrequency', grainFreq.toFixed(2));

    // Draw timeline
    const tlWidth = timelineCanvas.width;
    const tlHeight = timelineCanvas.height;

    timelineCtx.fillStyle = '#1e1e1e';
    timelineCtx.fillRect(0, 0, tlWidth, tlHeight);

    // Aggression curve (use current setting)
    const displayData = params.normalizeAggression ? normalizedAggressionData : aggressionData;
    timelineCtx.strokeStyle = '#ff64c8';
    timelineCtx.lineWidth = 2;
    timelineCtx.beginPath();
    for (let i = 0; i < displayData.length; i++) {
      const px = (tlWidth * i) / (displayData.length - 1);
      const py = tlHeight - 10 - (displayData[i] * (tlHeight - 20));
      if (i === 0) timelineCtx.moveTo(px, py);
      else timelineCtx.lineTo(px, py);
    }
    timelineCtx.stroke();

    // Current position marker
    const markerX = tlWidth * progress;
    timelineCtx.strokeStyle = '#ffffff';
    timelineCtx.lineWidth = 3;
    timelineCtx.beginPath();
    timelineCtx.moveTo(markerX, 0);
    timelineCtx.lineTo(markerX, tlHeight);
    timelineCtx.stroke();

    // Update info overlay
    info.innerHTML = `
      <div>AGGRESSION: ${aggression.toFixed(3)}</div>
      <div>PROGRESS: ${(progress * 100).toFixed(1)}%</div>
      <div>TIME: ${currentTime.toFixed(1)}s / ${trackDuration.toFixed(1)}s</div>
      <div style="margin-top: 8px; opacity: 0.6;">${audioPlayer.paused ? 'Paused' : 'Playing'}</div>
      <div style="margin-top: 8px; opacity: 0.4;">SVG Filter Effects + Audio</div>
      <div style="margin-top: 8px; opacity: 0.3;">
        Turb: ${turbFreq.toFixed(4)} | Disp: ${dispScale.toFixed(1)} | Blur: ${blurAmount.toFixed(2)}
      </div>
    `;

    animationId = requestAnimationFrame(animate);
  }

  animate();
}
