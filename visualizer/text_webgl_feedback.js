let trackData = null;
let animationId = null;
let mouseX = 0;
let currentDisplayText = 'NEVER ENOUGH';
let currentFont = 'Pitch';
let paused = false;
let frameCount = 0;

const canvas = document.getElementById('visualizer');
const loading = document.getElementById('loading');
const info = document.getElementById('info');
const timelineCanvas = document.getElementById('timeline');
const timelineCtx = timelineCanvas.getContext('2d');

// Load the JSON data
fetch('../turnstile_love_connection_p5.json')
  .then(res => res.json())
  .then(data => {
    trackData = data;
    loading.style.display = 'none';
    canvas.style.display = 'block';
    init();
  })
  .catch(err => {
    console.error('Error loading data:', err);
    loading.textContent = 'Error loading data. Check console.';
  });

function init() {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) || 
             canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    alert('WebGL not supported');
    return;
  }

  // Manual scaling overrides for tracks where analysis seems off
  const trackScaling = {
    'CEILING': 0.3  // Chill song, scale down to 30%
  };

  // Track data - will be updated when track selection changes
  let currentTrack = trackData.tracks[0];
  let aggressionData = currentTrack.frames.aggression.slice();
  let trackDuration = currentTrack.duration;
  
  // Apply initial scaling if needed
  if (trackScaling[currentTrack.title]) {
    aggressionData = aggressionData.map(a => a * trackScaling[currentTrack.title]);
  }
  
  let minAggression = Math.min(...aggressionData);
  let maxAggression = Math.max(...aggressionData);
  const deadZoneThreshold = 0.1;
  let clampFloor = minAggression + deadZoneThreshold;
  let aggressionRange = maxAggression - clampFloor;
  let normalizedAggressionData = aggressionData.map(a => Math.max(0, (a - clampFloor) / aggressionRange));

  function selectTrack(trackTitle) {
    const track = trackData.tracks.find(t => t.title === trackTitle);
    if (!track) return;
    
    currentTrack = track;
    aggressionData = track.frames.aggression.slice();
    trackDuration = track.duration;
    
    const scale = trackScaling[trackTitle];
    if (scale !== undefined) {
      aggressionData = aggressionData.map(a => a * scale);
    }
    
    minAggression = Math.min(...aggressionData);
    maxAggression = Math.max(...aggressionData);
    clampFloor = minAggression + deadZoneThreshold;
    aggressionRange = maxAggression - clampFloor;
    normalizedAggressionData = aggressionData.map(a => Math.max(0, (a - clampFloor) / aggressionRange));
  }

  // Controls - conservative defaults for feedback mode
  const params = {
    waveFreqMin: 2,
    waveFreqMax: 10,
    waveAmpMin: 0.005,
    waveAmpMax: 0.03,
    noiseScaleMin: 1,
    noiseScaleMax: 5,
    chromaMin: 0.001,
    chromaMax: 0.005,
    grainMin: 0.01,
    grainMax: 0.05,
    normalizeAggression: true,
    trimStart: 0.0,
    trimEnd: 1.0,
    blurMin: 0.0,
    blurMax: 0.001,
    vertDispMin: 0.0,
    vertDispMax: 0.05,
    feedbackAmount: 0.5,
    decay: 0.95
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
  const trimStartSlider = document.getElementById('trimStart');
  const trimEndSlider = document.getElementById('trimEnd');
  const trimValue = document.getElementById('trimValue');
  const textInput = document.getElementById('textInput');
  const blurMinSlider = document.getElementById('blurMin');
  const blurMaxSlider = document.getElementById('blurMax');
  const blurValue = document.getElementById('blurValue');
  const vertDispMinSlider = document.getElementById('vertDispMin');
  const vertDispMaxSlider = document.getElementById('vertDispMax');
  const vertDispValue = document.getElementById('vertDispValue');
  const trackSelect = document.getElementById('trackSelect');
  const downloadBtn = document.getElementById('downloadBtn');
  const toggleChromeBtn = document.getElementById('toggleChromeBtn');
  const fontSelect = document.getElementById('fontSelect');
  const feedbackAmountSlider = document.getElementById('feedbackAmount');
  const feedbackAmountValue = document.getElementById('feedbackAmountValue');
  const decaySlider = document.getElementById('decay');
  const decayValue = document.getElementById('decayValue');
  const clearFeedbackBtn = document.getElementById('clearFeedbackBtn');

  // Populate track selector
  trackData.tracks.forEach((track, index) => {
    const option = document.createElement('option');
    option.value = track.title;
    option.textContent = track.title;
    if (index === 0) option.selected = true;
    trackSelect.appendChild(option);
  });

  // Feedback controls
  feedbackAmountSlider.addEventListener('input', () => {
    params.feedbackAmount = parseFloat(feedbackAmountSlider.value);
    feedbackAmountValue.textContent = params.feedbackAmount.toFixed(2);
  });
  decaySlider.addEventListener('input', () => {
    params.decay = parseFloat(decaySlider.value);
    decayValue.textContent = params.decay.toFixed(3);
  });

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
    updateAggressionTexture();
  });

  trackSelect.addEventListener('change', () => {
    selectTrack(trackSelect.value);
    currentDisplayText = trackSelect.value;
    textInput.value = currentDisplayText;
    recreateTextTexture();
    updateAggressionTexture();
  });

  trimStartSlider.addEventListener('input', () => {
    params.trimStart = parseFloat(trimStartSlider.value);
    if (params.trimStart >= params.trimEnd) {
      params.trimStart = params.trimEnd - 0.01;
      trimStartSlider.value = params.trimStart;
    }
    trimValue.textContent = `${(params.trimStart * 100).toFixed(0)}% → ${(params.trimEnd * 100).toFixed(0)}%`;
  });
  trimEndSlider.addEventListener('input', () => {
    params.trimEnd = parseFloat(trimEndSlider.value);
    if (params.trimEnd <= params.trimStart) {
      params.trimEnd = params.trimStart + 0.01;
      trimEndSlider.value = params.trimEnd;
    }
    trimValue.textContent = `${(params.trimStart * 100).toFixed(0)}% → ${(params.trimEnd * 100).toFixed(0)}%`;
  });

  textInput.addEventListener('input', () => {
    currentDisplayText = textInput.value || 'NEVER ENOUGH';
    recreateTextTexture();
  });

  fontSelect.addEventListener('change', () => {
    currentFont = fontSelect.value;
    recreateTextTexture();
  });

  blurMinSlider.addEventListener('input', () => {
    params.blurMin = parseFloat(blurMinSlider.value);
    blurValue.textContent = `${params.blurMin.toFixed(3)} → ${params.blurMax.toFixed(3)}`;
  });
  blurMaxSlider.addEventListener('input', () => {
    params.blurMax = parseFloat(blurMaxSlider.value);
    blurValue.textContent = `${params.blurMin.toFixed(3)} → ${params.blurMax.toFixed(3)}`;
  });

  vertDispMinSlider.addEventListener('input', () => {
    params.vertDispMin = parseFloat(vertDispMinSlider.value);
    vertDispValue.textContent = `${params.vertDispMin.toFixed(2)} → ${params.vertDispMax.toFixed(2)}`;
  });
  vertDispMaxSlider.addEventListener('input', () => {
    params.vertDispMax = parseFloat(vertDispMaxSlider.value);
    vertDispValue.textContent = `${params.vertDispMin.toFixed(2)} → ${params.vertDispMax.toFixed(2)}`;
  });

  resetBtn.addEventListener('click', () => {
    waveFreqMin.value = params.waveFreqMin = 2;
    waveFreqMax.value = params.waveFreqMax = 10;
    waveAmpMin.value = params.waveAmpMin = 0.005;
    waveAmpMax.value = params.waveAmpMax = 0.03;
    noiseScaleMin.value = params.noiseScaleMin = 1;
    noiseScaleMax.value = params.noiseScaleMax = 5;
    chromaMin.value = params.chromaMin = 0.001;
    chromaMax.value = params.chromaMax = 0.005;
    grainMin.value = params.grainMin = 0.01;
    grainMax.value = params.grainMax = 0.05;
    normalizeCheckbox.checked = params.normalizeAggression = true;
    trimStartSlider.value = params.trimStart = 0.0;
    trimEndSlider.value = params.trimEnd = 1.0;
    blurMinSlider.value = params.blurMin = 0.0;
    blurMaxSlider.value = params.blurMax = 0.001;
    vertDispMinSlider.value = params.vertDispMin = 0.0;
    vertDispMaxSlider.value = params.vertDispMax = 0.05;
    feedbackAmountSlider.value = params.feedbackAmount = 0.5;
    decaySlider.value = params.decay = 0.95;
    waveFreqValue.textContent = '2.0 → 10.0';
    waveAmpValue.textContent = '0.005 → 0.030';
    noiseScaleValue.textContent = '1.0 → 5.0';
    chromaValue.textContent = '0.001 → 0.005';
    grainValue.textContent = '0.01 → 0.05';
    trimValue.textContent = '0% → 100%';
    blurValue.textContent = '0.000 → 0.001';
    vertDispValue.textContent = '0.00 → 0.05';
    feedbackAmountValue.textContent = '0.50';
    decayValue.textContent = '0.950';
    trackSelect.value = trackData.tracks[0].title;
    selectTrack(trackData.tracks[0].title);
    textInput.value = currentDisplayText = trackData.tracks[0].title;
    fontSelect.value = currentFont = 'Pitch';
    recreateTextTexture();
    updateAggressionTexture();
    clearFeedbackBuffers();
  });

  // Chrome visibility toggle
  let chromeVisible = true;
  const chromeElements = [info, timelineCanvas, document.getElementById('controls')];

  function toggleChrome() {
    chromeVisible = !chromeVisible;
    chromeElements.forEach(el => {
      el.style.display = chromeVisible ? '' : 'none';
    });
    toggleChromeBtn.textContent = chromeVisible ? 'HIDE UI (H)' : 'SHOW UI (H)';
  }

  toggleChromeBtn.addEventListener('click', toggleChrome);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (document.activeElement === textInput) return;
    
    if (e.key === 'h' || e.key === 'H') {
      toggleChrome();
    } else if (e.key === 'c' || e.key === 'C') {
      clearFeedbackBuffers();
    } else if (e.key === ' ') {
      e.preventDefault();
      paused = !paused;
      console.log('Paused:', paused);
      if (!paused) render();
    } else if (e.key === 'n' || e.key === 'N') {
      // Step one frame
      if (paused) {
        console.log('Stepping frame', frameCount);
        renderOneFrame();
      }
    }
  });

  // Download PNG
  downloadBtn.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${currentDisplayText.replace(/[^a-zA-Z0-9]/g, '_')}_feedback_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  });

  // Vertex shader
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader with feedback
  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform sampler2D u_feedbackTexture;
    uniform sampler2D u_aggressionData;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_trimRange;
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
    uniform float u_blurMin;
    uniform float u_blurMax;
    uniform float u_vertDispMin;
    uniform float u_vertDispMax;
    uniform float u_feedbackAmount;
    uniform float u_decay;

    varying vec2 v_texCoord;

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

    float getLocalAggression(float x) {
      float t = mix(u_trimRange.x, u_trimRange.y, x);
      return texture2D(u_aggressionData, vec2(t, 0.5)).r;
    }

    void main() {
      vec2 uv = v_texCoord;

      float localAggression = getLocalAggression(v_texCoord.x);
      float avgAggression = getLocalAggression(0.5);

      // === WAVE DISPLACEMENT ===
      float waveFreq = u_waveFreqMin + avgAggression * (u_waveFreqMax - u_waveFreqMin);
      float waveAmp = avgAggression * u_waveAmpMax + (1.0 - avgAggression) * u_waveAmpMin;
      float wave = sin(uv.y * waveFreq + u_time * (1.0 + avgAggression * 3.0)) * waveAmp;
      uv.x += wave;

      // Noise displacement
      float noiseScale = u_noiseScaleMin + avgAggression * (u_noiseScaleMax - u_noiseScaleMin);
      float noiseAmp = avgAggression * 0.02 + (1.0 - avgAggression) * 0.002;
      vec2 noiseDisp = vec2(
        snoise(uv * noiseScale + u_time * 0.5),
        snoise(uv * noiseScale + u_time * 0.5 + 100.0)
      ) * noiseAmp;
      uv += noiseDisp;

      // === CHROMATIC ABERRATION ===
      float chromaOffset = localAggression * u_chromaMax + (1.0 - localAggression) * u_chromaMin;
      float dynamicOffset = sin(u_time * 2.0) * localAggression * 0.005;

      float chromaX = chromaOffset + dynamicOffset;
      float chromaY = chromaOffset * 0.5;

      vec2 rOffset = vec2(-chromaX, -chromaY);
      vec2 gOffset = vec2(0.0, 0.0);
      vec2 bOffset = vec2(chromaX, chromaY);

      // === VERTICAL DISPLACEMENT ===
      float vertDisp = localAggression * u_vertDispMax + (1.0 - localAggression) * u_vertDispMin;
      
      // === BLUR ===
      float blurAmount = (1.0 - localAggression) * u_blurMax + localAggression * u_blurMin;
      
      vec3 colorR = vec3(0.0);
      vec3 colorG = vec3(0.0);
      vec3 colorB = vec3(0.0);
      float alphaAccum = 0.0;
      float totalWeight = 0.0;

      const int BLUR_SAMPLES = 3;
      const int VERT_SAMPLES = 4;
      
      for (int i = -BLUR_SAMPLES; i <= BLUR_SAMPLES; i++) {
        float hOffset = float(i) * blurAmount / float(BLUR_SAMPLES);
        float hWeight = 1.0 - abs(float(i)) / float(BLUR_SAMPLES + 1);
        
        for (int j = -VERT_SAMPLES; j <= VERT_SAMPLES; j++) {
          float vOffset = float(j) * vertDisp / float(VERT_SAMPLES);
          float vWeight = 1.0 - abs(float(j)) / float(VERT_SAMPLES + 1);
          vWeight = vWeight * vWeight;
          
          float weight = hWeight * vWeight;
          vec2 sampleOffset = vec2(hOffset, vOffset);
          
          colorR += texture2D(u_texture, uv + rOffset + sampleOffset).rgb * weight;
          colorG += texture2D(u_texture, uv + gOffset + sampleOffset).rgb * weight;
          colorB += texture2D(u_texture, uv + bOffset + sampleOffset).rgb * weight;
          
          alphaAccum += max(
            texture2D(u_texture, uv + rOffset + sampleOffset).a,
            max(
              texture2D(u_texture, uv + gOffset + sampleOffset).a,
              texture2D(u_texture, uv + bOffset + sampleOffset).a
            )
          ) * weight;
          
          totalWeight += weight;
        }
      }

      colorR /= totalWeight;
      colorG /= totalWeight;
      colorB /= totalWeight;
      float a = alphaAccum / totalWeight;

      float r = colorR.r;
      float g = colorG.g;
      float b = colorB.b;

      vec3 currentColor = vec3(r, g, b);

      // === FEEDBACK BLEND ===
      // Sample from previous frame with slight offset for movement
      vec2 feedbackUV = v_texCoord;
      // Add subtle drift to feedback
      feedbackUV += vec2(
        sin(u_time * 0.3) * 0.002,
        cos(u_time * 0.2) * 0.001
      ) * localAggression;
      
      vec4 feedbackColor = texture2D(u_feedbackTexture, feedbackUV);
      
      // Apply decay to feedback
      feedbackColor.rgb *= u_decay;
      
      // Blend current frame with decayed feedback
      vec3 color = mix(currentColor, feedbackColor.rgb, u_feedbackAmount);
      
      // Ensure we always add some of the current text
      float textPresence = max(max(currentColor.r, currentColor.g), currentColor.b);
      color = max(color, currentColor * 0.3);

      // === GRAIN ===
      float grainIntensity = localAggression * u_grainMax + (1.0 - localAggression) * u_grainMin;
      float grain = snoise(v_texCoord * 500.0 + u_time * 10.0) * grainIntensity;
      color += grain;

      // === COLOR GRADING ===
      float brightness = localAggression * 0.1 + (1.0 - localAggression) * 0.05;
      color += brightness;

      float contrast = localAggression * 0.2 + (1.0 - localAggression) * -0.05;
      color = (color - 0.5) * (1.0 + contrast) + 0.5;

      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      float saturation = localAggression * 0.3 + (1.0 - localAggression) * -0.2;
      color = mix(vec3(gray), color, 1.0 + saturation);

      // Clamp to prevent blowout
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, max(a, feedbackColor.a * u_feedbackAmount));
    }
  `;

  // Simple passthrough shader for blitting to screen
  const blitFragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
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
  const blitFragmentShader = compileShader(blitFragmentShaderSource, gl.FRAGMENT_SHADER);

  // Create main program
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  // Create blit program
  const blitProgram = gl.createProgram();
  gl.attachShader(blitProgram, vertexShader);
  gl.attachShader(blitProgram, blitFragmentShader);
  gl.linkProgram(blitProgram);

  if (!gl.getProgramParameter(blitProgram, gl.LINK_STATUS)) {
    console.error('Blit program link error:', gl.getProgramInfoLog(blitProgram));
    return;
  }

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

  // Ping-pong framebuffers
  let fboA, fboB;
  let readFBO, writeFBO;

  function createFramebuffer(width, height) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer: fbo, texture: texture };
  }

  function initFramebuffers() {
    if (fboA) {
      gl.deleteFramebuffer(fboA.framebuffer);
      gl.deleteTexture(fboA.texture);
    }
    if (fboB) {
      gl.deleteFramebuffer(fboB.framebuffer);
      gl.deleteTexture(fboB.texture);
    }

    fboA = createFramebuffer(canvas.width, canvas.height);
    fboB = createFramebuffer(canvas.width, canvas.height);
    readFBO = fboA;
    writeFBO = fboB;
    
    console.log('FBOs initialized:', canvas.width, 'x', canvas.height);
    console.log('fboA:', fboA);
    console.log('fboB:', fboB);
  }

  function clearFeedbackBuffers() {
    // Clear both FBOs
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  clearFeedbackBtn.addEventListener('click', clearFeedbackBuffers);

  // Create texture from text
  const textCanvas = document.createElement('canvas');
  const textCtx = textCanvas.getContext('2d');

  function createTextTexture(text) {
    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;

    textCtx.fillStyle = '#000';
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    const padding = 0.05;
    const targetWidth = textCanvas.width * (1 - padding * 2);
    
    const testSize = 100;
    const fontFamily = currentFont === 'Pitch' ? '"Pitch", monospace' : currentFont;
    textCtx.font = `600 ${testSize}px ${fontFamily}`;
    const measuredWidth = textCtx.measureText(text).width;
    
    const maxFontSize = textCanvas.height * 0.7;
    const fontSize = Math.min(Math.floor((targetWidth / measuredWidth) * testSize), maxFontSize);

    textCtx.font = `600 ${fontSize}px ${fontFamily}`;
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

  function createAggressionTexture(data) {
    const texData = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      texData[i] = Math.floor(data[i] * 255);
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, data.length, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, texData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
  }

  // Get uniform locations for main program
  gl.useProgram(program);
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_resolution = gl.getUniformLocation(program, 'u_resolution');
  const u_texture = gl.getUniformLocation(program, 'u_texture');
  const u_feedbackTexture = gl.getUniformLocation(program, 'u_feedbackTexture');
  const u_aggressionData = gl.getUniformLocation(program, 'u_aggressionData');
  const u_trimRange = gl.getUniformLocation(program, 'u_trimRange');
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
  const u_blurMin = gl.getUniformLocation(program, 'u_blurMin');
  const u_blurMax = gl.getUniformLocation(program, 'u_blurMax');
  const u_vertDispMin = gl.getUniformLocation(program, 'u_vertDispMin');
  const u_vertDispMax = gl.getUniformLocation(program, 'u_vertDispMax');
  const u_feedbackAmount = gl.getUniformLocation(program, 'u_feedbackAmount');
  const u_decay = gl.getUniformLocation(program, 'u_decay');

  // Get attribute and uniform locations for blit program
  gl.useProgram(blitProgram);
  const blit_a_position = gl.getAttribLocation(blitProgram, 'a_position');
  const blit_a_texCoord = gl.getAttribLocation(blitProgram, 'a_texCoord');
  const u_blitTexture = gl.getUniformLocation(blitProgram, 'u_texture');
  
  console.log('Blit program attributes:', blit_a_position, blit_a_texCoord);

  let texture = null;
  let aggressionTexture = null;

  function updateAggressionTexture() {
    const data = params.normalizeAggression ? normalizedAggressionData : aggressionData;
    aggressionTexture = createAggressionTexture(data);
  }

  function recreateTextTexture() {
    texture = createTextTexture(currentDisplayText);
  }

  // Handle resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    recreateTextTexture();
    initFramebuffers();

    timelineCanvas.width = window.innerWidth - 40;
    timelineCanvas.height = 60;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  mouseX = canvas.width / 2;
  updateAggressionTexture();

  // Core render function (one frame)
  function renderOneFrame() {
    const time = Date.now() / 1000;
    frameCount++;

    // Check FBO status
    if (frameCount === 1) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.framebuffer);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      console.log('FBO status:', status === gl.FRAMEBUFFER_COMPLETE ? 'COMPLETE' : status);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // === PASS 1: Render to writeFBO ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.framebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);

    // Setup attributes for main program
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(a_texCoord);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 16, 8);

    // Update uniforms
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform2f(u_trimRange, params.trimStart, params.trimEnd);
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
    gl.uniform1f(u_blurMin, params.blurMin);
    gl.uniform1f(u_blurMax, params.blurMax);
    gl.uniform1f(u_vertDispMin, params.vertDispMin);
    gl.uniform1f(u_vertDispMax, params.vertDispMax);
    gl.uniform1f(u_feedbackAmount, params.feedbackAmount);
    gl.uniform1f(u_decay, params.decay);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u_texture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, readFBO.texture);
    gl.uniform1i(u_feedbackTexture, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, aggressionTexture);
    gl.uniform1i(u_aggressionData, 2);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // === PASS 2: Blit to screen ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(blitProgram);

    // Setup attributes for blit program
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(blit_a_position);
    gl.vertexAttribPointer(blit_a_position, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(blit_a_texCoord);
    gl.vertexAttribPointer(blit_a_texCoord, 2, gl.FLOAT, false, 16, 8);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, writeFBO.texture);
    gl.uniform1i(u_blitTexture, 0);

    gl.clearColor(0.06, 0.06, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Swap FBOs for next frame
    const temp = readFBO;
    readFBO = writeFBO;
    writeFBO = temp;

    if (frameCount <= 3) {
      console.log('Frame', frameCount, '- readFBO:', readFBO === fboA ? 'A' : 'B', 'writeFBO:', writeFBO === fboA ? 'A' : 'B');
    }
  }

  // Main render loop
  function render() {
    renderOneFrame();

    // Draw timeline
    const tlWidth = timelineCanvas.width;
    const tlHeight = timelineCanvas.height;

    timelineCtx.fillStyle = '#1e1e1e';
    timelineCtx.fillRect(0, 0, tlWidth, tlHeight);

    const trimStartX = params.trimStart * tlWidth;
    const trimEndX = params.trimEnd * tlWidth;
    timelineCtx.fillStyle = 'rgba(255, 100, 200, 0.15)';
    timelineCtx.fillRect(trimStartX, 0, trimEndX - trimStartX, tlHeight);

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

    timelineCtx.strokeStyle = '#00ff88';
    timelineCtx.lineWidth = 2;
    timelineCtx.setLineDash([4, 4]);
    timelineCtx.beginPath();
    timelineCtx.moveTo(trimStartX, 0);
    timelineCtx.lineTo(trimStartX, tlHeight);
    timelineCtx.moveTo(trimEndX, 0);
    timelineCtx.lineTo(trimEndX, tlHeight);
    timelineCtx.stroke();
    timelineCtx.setLineDash([]);

    const trimDuration = (params.trimEnd - params.trimStart) * trackDuration;
    info.innerHTML = `
      <div style="color: #00ff88;">FEEDBACK MODE ${paused ? '(PAUSED)' : ''}</div>
      <div style="color: #ff64c8;">${currentTrack.title}</div>
      <div>FRAME: ${frameCount} | FEEDBACK: ${(params.feedbackAmount * 100).toFixed(0)}% | DECAY: ${params.decay.toFixed(3)}</div>
      <div>TRIM: ${(params.trimStart * 100).toFixed(0)}% → ${(params.trimEnd * 100).toFixed(0)}% (${trimDuration.toFixed(1)}s)</div>
      <div style="margin-top: 8px; opacity: 0.6;">SPACE=pause, N=step, C=clear</div>
    `;

    if (!paused) {
      animationId = requestAnimationFrame(render);
    }
  }

  render();
}

