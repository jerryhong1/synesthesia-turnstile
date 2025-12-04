let trackData = null;
let animationId = null;

const canvas = document.getElementById('visualizer');
const loading = document.getElementById('loading');
const info = document.getElementById('info');
const timelineCanvas = document.getElementById('timeline');
const timelineCtx = timelineCanvas.getContext('2d');
const audioPlayer = document.getElementById('audioPlayer');
const audioControls = document.getElementById('audioControls');
const playPauseBtn = document.getElementById('playPauseBtn');

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
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    alert('WebGL not supported');
    return;
  }

  const neverEnough = trackData.tracks.find(t => t.title === "NEVER ENOUGH");
  let aggressionData = neverEnough.frames.aggression;
  const trackDuration = neverEnough.duration;

  // Find max aggression for normalization
  const maxAggression = Math.max(...aggressionData);
  let normalizedAggressionData = aggressionData.map(a => a / maxAggression);

  // Controls
  const params = {
    waveFreqMin: 5,
    waveFreqMax: 25,
    waveAmpMin: 0.01,
    waveAmpMax: 0.08,
    noiseScaleMin: 3,
    noiseScaleMax: 13,
    chromaMin: 0.003,
    chromaMax: 0.02,
    grainMin: 0.03,
    grainMax: 0.2,
    normalizeAggression: true
  };

  // Setup control listeners
  const waveFreqMin = document.getElementById('waveFreqMin');
  const waveFreqMax = document.getElementById('waveFreqMax');
  const waveFreqValue = document.getElementById('waveFreqValue');
  const waveAmpMin = document.getElementById('waveAmpMin');
  const waveAmpMax = document.getElementById('waveAmpMax');
  const waveAmpValue = document.getElementById('waveAmpValue');
  const noiseScaleMin = document.getElementById('noiseScaleMin');
  const noiseScaleMax = document.getElementById('noiseScaleMax');
  const noiseScaleValue = document.getElementById('noiseScaleValue');
  const chromaMin = document.getElementById('chromaMin');
  const chromaMax = document.getElementById('chromaMax');
  const chromaValue = document.getElementById('chromaValue');
  const grainMin = document.getElementById('grainMin');
  const grainMax = document.getElementById('grainMax');
  const grainValue = document.getElementById('grainValue');
  const normalizeCheckbox = document.getElementById('normalizeAggression');
  const resetBtn = document.getElementById('resetBtn');

  waveFreqMin.addEventListener('input', () => {
    params.waveFreqMin = parseFloat(waveFreqMin.value);
    waveFreqValue.textContent = `${params.waveFreqMin.toFixed(1)} → ${params.waveFreqMax.toFixed(1)}`;
  });
  waveFreqMax.addEventListener('input', () => {
    params.waveFreqMax = parseFloat(waveFreqMax.value);
    waveFreqValue.textContent = `${params.waveFreqMin.toFixed(1)} → ${params.waveFreqMax.toFixed(1)}`;
  });

  waveAmpMin.addEventListener('input', () => {
    params.waveAmpMin = parseFloat(waveAmpMin.value);
    waveAmpValue.textContent = `${params.waveAmpMin.toFixed(3)} → ${params.waveAmpMax.toFixed(3)}`;
  });
  waveAmpMax.addEventListener('input', () => {
    params.waveAmpMax = parseFloat(waveAmpMax.value);
    waveAmpValue.textContent = `${params.waveAmpMin.toFixed(3)} → ${params.waveAmpMax.toFixed(3)}`;
  });

  noiseScaleMin.addEventListener('input', () => {
    params.noiseScaleMin = parseFloat(noiseScaleMin.value);
    noiseScaleValue.textContent = `${params.noiseScaleMin.toFixed(1)} → ${params.noiseScaleMax.toFixed(1)}`;
  });
  noiseScaleMax.addEventListener('input', () => {
    params.noiseScaleMax = parseFloat(noiseScaleMax.value);
    noiseScaleValue.textContent = `${params.noiseScaleMin.toFixed(1)} → ${params.noiseScaleMax.toFixed(1)}`;
  });

  chromaMin.addEventListener('input', () => {
    params.chromaMin = parseFloat(chromaMin.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(3)} → ${params.chromaMax.toFixed(3)}`;
  });
  chromaMax.addEventListener('input', () => {
    params.chromaMax = parseFloat(chromaMax.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(3)} → ${params.chromaMax.toFixed(3)}`;
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
    waveFreqMin.value = params.waveFreqMin = 5;
    waveFreqMax.value = params.waveFreqMax = 25;
    waveAmpMin.value = params.waveAmpMin = 0.01;
    waveAmpMax.value = params.waveAmpMax = 0.08;
    noiseScaleMin.value = params.noiseScaleMin = 3;
    noiseScaleMax.value = params.noiseScaleMax = 13;
    chromaMin.value = params.chromaMin = 0.003;
    chromaMax.value = params.chromaMax = 0.02;
    grainMin.value = params.grainMin = 0.03;
    grainMax.value = params.grainMax = 0.2;
    normalizeCheckbox.checked = params.normalizeAggression = true;
    waveFreqValue.textContent = '5.0 → 25.0';
    waveAmpValue.textContent = '0.010 → 0.080';
    noiseScaleValue.textContent = '3.0 → 13.0';
    chromaValue.textContent = '0.003 → 0.020';
    grainValue.textContent = '0.03 → 0.20';
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

  // Vertex shader - simple quad
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader - text effects
  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform float u_time;
    uniform float u_aggression;
    uniform vec2 u_resolution;
    uniform float u_waveFreqMin;
    uniform float u_waveFreqMax;
    uniform float u_waveAmpMin;
    uniform float u_waveAmpMax;
    uniform float u_noiseScaleMin;
    uniform float u_noiseScaleMax;
    uniform float u_chromaMin;
    uniform float u_chromaMax;
    uniform float u_grainMin;
    uniform float u_grainMax;

    varying vec2 v_texCoord;

    // Simplex noise (simplified 2D version)
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = v_texCoord;
      vec2 center = vec2(0.5, 0.5);

      // === WAVE DISPLACEMENT ===
      float waveFreq = u_waveFreqMin + u_aggression * (u_waveFreqMax - u_waveFreqMin);
      float waveAmp = u_aggression * u_waveAmpMax + (1.0 - u_aggression) * u_waveAmpMin;
      float wave = sin(uv.y * waveFreq + u_time * (1.0 + u_aggression * 3.0)) * waveAmp;
      uv.x += wave;

      // Add noise-based displacement
      float noiseScale = u_noiseScaleMin + u_aggression * (u_noiseScaleMax - u_noiseScaleMin);
      float noiseAmp = u_aggression * 0.05 + (1.0 - u_aggression) * 0.005;
      vec2 noiseDisp = vec2(
        snoise(uv * noiseScale + u_time * 0.5),
        snoise(uv * noiseScale + u_time * 0.5 + 100.0)
      ) * noiseAmp;
      uv += noiseDisp;

      // === CHROMATIC ABERRATION ===
      float chromaOffset = u_aggression * u_chromaMax + (1.0 - u_aggression) * u_chromaMin;
      float dynamicOffset = sin(u_time * 2.0) * u_aggression * 0.01;

      vec2 rOffset = vec2(-chromaOffset - dynamicOffset, 0.0);
      vec2 gOffset = vec2(0.0, 0.0);
      vec2 bOffset = vec2(chromaOffset + dynamicOffset, 0.0);

      float r = texture2D(u_texture, uv + rOffset).r;
      float g = texture2D(u_texture, uv + gOffset).g;
      float b = texture2D(u_texture, uv + bOffset).b;
      float a = max(
        texture2D(u_texture, uv + rOffset).a,
        max(
          texture2D(u_texture, uv + gOffset).a,
          texture2D(u_texture, uv + bOffset).a
        )
      );

      vec3 color = vec3(r, g, b);

      // === GRAIN ===
      float grainIntensity = u_aggression * u_grainMax + (1.0 - u_aggression) * u_grainMin;
      float grain = snoise(uv * 500.0 + u_time * 10.0) * grainIntensity;
      color += grain;

      // === COLOR GRADING ===
      // Aggressive: high contrast, saturated, vibrant
      // Ethereal: soft, pastel, desaturated
      float brightness = u_aggression * 0.2 + (1.0 - u_aggression) * 0.1;
      color += brightness;

      // Contrast
      float contrast = u_aggression * 0.3 + (1.0 - u_aggression) * -0.1;
      color = (color - 0.5) * (1.0 + contrast) + 0.5;

      // Saturation
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      float saturation = u_aggression * 0.5 + (1.0 - u_aggression) * -0.3;
      color = mix(vec3(gray), color, 1.0 + saturation);

      // === MOTION BLUR (approximation using multi-sampling) ===
      if (u_aggression < 0.5) {
        // More ethereal = more blur
        float blurAmount = (1.0 - u_aggression) * 0.01;
        vec3 blurred = color;
        for (int i = 1; i <= 4; i++) {
          float offset = float(i) * blurAmount;
          blurred += texture2D(u_texture, uv + vec2(offset, 0.0)).rgb;
          blurred += texture2D(u_texture, uv - vec2(offset, 0.0)).rgb;
        }
        color = blurred / 9.0;
      }

      gl_FragColor = vec4(color, a);
    }
  `;

  // Compile shaders
  function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

  // Create program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  // Create quad
  const positions = new Float32Array([
    -1, -1,  0, 1,
     1, -1,  1, 1,
    -1,  1,  0, 0,
     1,  1,  1, 0,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const a_position = gl.getAttribLocation(program, 'a_position');
  const a_texCoord = gl.getAttribLocation(program, 'a_texCoord');

  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(a_texCoord);
  gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 16, 8);

  // Create texture from text
  const textCanvas = document.createElement('canvas');
  const textCtx = textCanvas.getContext('2d');

  function createTextTexture(text, fontSize) {
    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;

    textCtx.fillStyle = '#000';
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    textCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    textCtx.fillStyle = '#fff';
    textCtx.textAlign = 'center';
    textCtx.textBaseline = 'middle';
    textCtx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  // Get uniform locations
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_aggression = gl.getUniformLocation(program, 'u_aggression');
  const u_resolution = gl.getUniformLocation(program, 'u_resolution');
  const u_texture = gl.getUniformLocation(program, 'u_texture');
  const u_waveFreqMin = gl.getUniformLocation(program, 'u_waveFreqMin');
  const u_waveFreqMax = gl.getUniformLocation(program, 'u_waveFreqMax');
  const u_waveAmpMin = gl.getUniformLocation(program, 'u_waveAmpMin');
  const u_waveAmpMax = gl.getUniformLocation(program, 'u_waveAmpMax');
  const u_noiseScaleMin = gl.getUniformLocation(program, 'u_noiseScaleMin');
  const u_noiseScaleMax = gl.getUniformLocation(program, 'u_noiseScaleMax');
  const u_chromaMin = gl.getUniformLocation(program, 'u_chromaMin');
  const u_chromaMax = gl.getUniformLocation(program, 'u_chromaMax');
  const u_grainMin = gl.getUniformLocation(program, 'u_grainMin');
  const u_grainMax = gl.getUniformLocation(program, 'u_grainMax');

  let texture = null;

  // Handle resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Recreate texture with new size
    const fontSize = Math.floor(canvas.width / 8);
    texture = createTextTexture('NEVER ENOUGH', fontSize);

    // Resize timeline
    timelineCanvas.width = window.innerWidth - 40;
    timelineCanvas.height = 60;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Main render loop
  function render() {
    const time = Date.now() / 1000;
    const width = canvas.width;

    // Get current time from audio player
    const currentTime = audioPlayer.currentTime;
    const progress = currentTime / trackDuration;
    const index = Math.floor(progress * (aggressionData.length - 1));
    const rawAggression = aggressionData[Math.max(0, Math.min(index, aggressionData.length - 1))];
    const normalizedAggression = normalizedAggressionData[Math.max(0, Math.min(index, normalizedAggressionData.length - 1))];
    const aggression = params.normalizeAggression ? normalizedAggression : rawAggression;

    // Update uniforms
    gl.uniform1f(u_time, time);
    gl.uniform1f(u_aggression, aggression);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1i(u_texture, 0);
    gl.uniform1f(u_waveFreqMin, params.waveFreqMin);
    gl.uniform1f(u_waveFreqMax, params.waveFreqMax);
    gl.uniform1f(u_waveAmpMin, params.waveAmpMin);
    gl.uniform1f(u_waveAmpMax, params.waveAmpMax);
    gl.uniform1f(u_noiseScaleMin, params.noiseScaleMin);
    gl.uniform1f(u_noiseScaleMax, params.noiseScaleMax);
    gl.uniform1f(u_chromaMin, params.chromaMin);
    gl.uniform1f(u_chromaMax, params.chromaMax);
    gl.uniform1f(u_grainMin, params.grainMin);
    gl.uniform1f(u_grainMax, params.grainMax);

    // Clear and draw
    gl.clearColor(0.06, 0.06, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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
      <div style="margin-top: 8px; opacity: 0.4;">WebGL GLSL Shaders + Audio</div>
    `;

    animationId = requestAnimationFrame(render);
  }

  render();
}
