let trackData = null;
let animationId = null;
let mouseX = 0;
let currentDisplayText = 'NEVER ENOUGH';
let currentFont = 'Pitch';

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
    'CEILING': 0.3,    // Chill song, scale down to 30%
    'MAGIC MAN': 0.3   // Also chill
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
  // Dead zone threshold: values below (min + threshold) map to 0
  const deadZoneThreshold = 0.1;
  let clampFloor = minAggression + deadZoneThreshold;
  let aggressionRange = maxAggression - clampFloor;
  // Clamp normalization with dead zone: anything below floor → 0
  let normalizedAggressionData = aggressionData.map(a => Math.max(0, (a - clampFloor) / aggressionRange));

  function selectTrack(trackTitle) {
    const track = trackData.tracks.find(t => t.title === trackTitle);
    if (!track) return;
    
    currentTrack = track;
    aggressionData = track.frames.aggression.slice(); // Copy array
    trackDuration = track.duration;
    
    // Apply manual scaling if defined for this track
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

  // Controls
  const params = {
    waveFreqMin: 5,
    waveFreqMax: 25,
    waveAmpMin: 0.01,
    waveAmpMax: 0.08,
    noiseScaleMin: 3,
    noiseScaleMax: 13,
    chromaMin: 0.000375,
    chromaMax: 0.0025,
    grainMin: 0.03,
    grainMax: 0.2,
    normalizeAggression: true,
    trimStart: 0.0,
    trimEnd: 1.0,
    blurMin: 0.0,
    blurMax: 0.01,
    vertDispMin: 0.0,
    vertDispMax: 0.15,
    bloomMin: 0.0,
    bloomMax: 1.5,
    smoothing: 0,
    textColor: '#ffffff',
    bgColor: '#000000'
  };

  // Adaptive smoothing: low aggression = more smoothing, high aggression = sharp
  function smoothArray(arr, maxWindowSize) {
    if (maxWindowSize <= 0) return arr.slice();
    const result = new Array(arr.length);
    
    for (let i = 0; i < arr.length; i++) {
      const value = arr[i];
      // Remap: 0-0.5 becomes 0-1, anything 0.5+ becomes 1 (sharp)
      const remapped = Math.min(1, value * 2);
      // Adaptive window with exponential curve: low values get MUCH more smoothing
      // value 0 -> maxWindowSize * 1.5, value 0.5+ -> minimal smoothing
      const smoothFactor = Math.pow(1 - remapped, 2);
      const adaptiveWindow = Math.max(1, Math.round(maxWindowSize * 1.5 * smoothFactor + 1));
      const halfWindow = Math.floor(adaptiveWindow / 2);
      
      let sum = 0;
      let count = 0;
      for (let j = -halfWindow; j <= halfWindow; j++) {
        const idx = i + j;
        if (idx >= 0 && idx < arr.length) {
          // Gaussian-ish weighting: center samples matter more
          const weight = 1.0 - Math.abs(j) / (halfWindow + 1) * 0.5;
          sum += arr[idx] * weight;
          count += weight;
        }
      }
      result[i] = sum / count;
    }
    return result;
  }

  // Setup control listeners
  const chromaMin = document.getElementById('chromaMin');
  const chromaMax = document.getElementById('chromaMax');
  const chromaValue = document.getElementById('chromaValue');
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
  const bloomMinSlider = document.getElementById('bloomMin');
  const bloomMaxSlider = document.getElementById('bloomMax');
  const bloomValue = document.getElementById('bloomValue');
  const smoothingSlider = document.getElementById('smoothing');
  const smoothingValue = document.getElementById('smoothingValue');
  const trackSelect = document.getElementById('trackSelect');
  const downloadBtn = document.getElementById('downloadBtn');
  const textColorInput = document.getElementById('textColor');
  const bgColorInput = document.getElementById('bgColor');
  const randomizeColorsBtn = document.getElementById('randomizeColorsBtn');
  const toggleChromeBtn = document.getElementById('toggleChromeBtn');
  const fontSelect = document.getElementById('fontSelect');

  // Populate track selector
  trackData.tracks.forEach((track, index) => {
    const option = document.createElement('option');
    option.value = track.title;
    option.textContent = track.title;
    if (index === 0) option.selected = true;
    trackSelect.appendChild(option);
  });

  chromaMin.addEventListener('input', () => {
    params.chromaMin = parseFloat(chromaMin.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(3)} → ${params.chromaMax.toFixed(3)}`;
  });
  chromaMax.addEventListener('input', () => {
    params.chromaMax = parseFloat(chromaMax.value);
    chromaValue.textContent = `${params.chromaMin.toFixed(3)} → ${params.chromaMax.toFixed(3)}`;
  });

  normalizeCheckbox.addEventListener('change', () => {
    params.normalizeAggression = normalizeCheckbox.checked;
    updateAggressionTexture();
  });

  trackSelect.addEventListener('change', () => {
    selectTrack(trackSelect.value);
    // Auto-fill display text with track name
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

  textColorInput.addEventListener('input', () => {
    params.textColor = textColorInput.value;
    recreateTextTexture();
  });

  bgColorInput.addEventListener('input', () => {
    params.bgColor = bgColorInput.value;
  });

  randomizeColorsBtn.addEventListener('click', () => {
    // Generate random vibrant colors
    const randomHue = () => Math.floor(Math.random() * 360);
    const hslToHex = (h, s, l) => {
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l - c / 2;
      let r, g, b;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };
    
    // Text: vibrant, high saturation
    const textHue = randomHue();
    params.textColor = hslToHex(textHue, 0.8, 0.6);
    textColorInput.value = params.textColor;
    
    // Background: complementary or dark variant
    const useDark = Math.random() > 0.3;
    if (useDark) {
      params.bgColor = hslToHex((textHue + 180 + Math.random() * 60 - 30) % 360, 0.3, 0.08);
    } else {
      params.bgColor = hslToHex((textHue + 180) % 360, 0.6, 0.5);
    }
    bgColorInput.value = params.bgColor;
    
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

  bloomMinSlider.addEventListener('input', () => {
    params.bloomMin = parseFloat(bloomMinSlider.value);
    bloomValue.textContent = `${params.bloomMin.toFixed(2)} → ${params.bloomMax.toFixed(2)}`;
  });
  bloomMaxSlider.addEventListener('input', () => {
    params.bloomMax = parseFloat(bloomMaxSlider.value);
    bloomValue.textContent = `${params.bloomMin.toFixed(2)} → ${params.bloomMax.toFixed(2)}`;
  });

  smoothingSlider.addEventListener('input', () => {
    params.smoothing = parseInt(smoothingSlider.value);
    smoothingValue.textContent = params.smoothing === 0 ? 'Off' : `${params.smoothing} frames`;
    updateAggressionTexture();
  });

  resetBtn.addEventListener('click', () => {
    params.waveFreqMin = 5;
    params.waveFreqMax = 25;
    params.waveAmpMin = 0.01;
    params.waveAmpMax = 0.08;
    params.noiseScaleMin = 3;
    params.noiseScaleMax = 13;
    chromaMin.value = params.chromaMin = 0.000375;
    chromaMax.value = params.chromaMax = 0.0025;
    params.grainMin = 0.03;
    params.grainMax = 0.2;
    normalizeCheckbox.checked = params.normalizeAggression = true;
    trimStartSlider.value = params.trimStart = 0.0;
    trimEndSlider.value = params.trimEnd = 1.0;
    blurMinSlider.value = params.blurMin = 0.0;
    blurMaxSlider.value = params.blurMax = 0.01;
    vertDispMinSlider.value = params.vertDispMin = 0.0;
    vertDispMaxSlider.value = params.vertDispMax = 0.15;
    bloomMinSlider.value = params.bloomMin = 0.0;
    bloomMaxSlider.value = params.bloomMax = 1.5;
    smoothingSlider.value = params.smoothing = 0;
    chromaValue.textContent = '0.000 → 0.003';
    trimValue.textContent = '0% → 100%';
    blurValue.textContent = '0.000 → 0.010';
    vertDispValue.textContent = '0.00 → 0.15';
    bloomValue.textContent = '0.00 → 1.50';
    smoothingValue.textContent = 'Off';
    // Reset colors
    textColorInput.value = params.textColor = '#ffffff';
    bgColorInput.value = params.bgColor = '#000000';
    // Reset to first track and font
    trackSelect.value = trackData.tracks[0].title;
    selectTrack(trackData.tracks[0].title);
    textInput.value = currentDisplayText = trackData.tracks[0].title;
    fontSelect.value = currentFont = 'Pitch';
    recreateTextTexture();
    updateAggressionTexture();
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

  // Keyboard shortcut for toggle
  document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
      // Don't trigger if typing in text input
      if (document.activeElement !== textInput) {
        toggleChrome();
      }
    }
  });

  // Download PNG
  downloadBtn.addEventListener('click', () => {
    // WebGL canvas needs preserveDrawingBuffer or we render one frame first
    // Render a frame to make sure canvas has content
    const time = Date.now() / 1000;
    gl.uniform1f(u_time, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Get data URL and trigger download
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${currentDisplayText.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
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

  // Fragment shader - text effects with spatial aggression
  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
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
    uniform float u_bloomMin;
    uniform float u_bloomMax;

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

    // Get local aggression based on x-coordinate, mapped through trim range
    float getLocalAggression(float x) {
      float t = mix(u_trimRange.x, u_trimRange.y, x);
      return texture2D(u_aggressionData, vec2(t, 0.5)).r;
    }

    void main() {
      vec2 uv = v_texCoord;
      vec2 center = vec2(0.5, 0.5);

      // Get local aggression for this fragment's x-position
      float localAggression = getLocalAggression(v_texCoord.x);

      // Use average aggression for global effects (wave, noise)
      float avgAggression = getLocalAggression(0.5);

      // === WAVE DISPLACEMENT (uses average aggression) ===
      float waveFreq = u_waveFreqMin + avgAggression * (u_waveFreqMax - u_waveFreqMin);
      float waveAmp = avgAggression * u_waveAmpMax + (1.0 - avgAggression) * u_waveAmpMin;
      float wave = sin(uv.y * waveFreq + u_time * (1.0 + avgAggression * 3.0)) * waveAmp;
      uv.x += wave;

      // Add noise-based displacement
      float noiseScale = u_noiseScaleMin + avgAggression * (u_noiseScaleMax - u_noiseScaleMin);
      float noiseAmp = avgAggression * 0.05 + (1.0 - avgAggression) * 0.005;
      vec2 noiseDisp = vec2(
        snoise(uv * noiseScale + u_time * 0.5),
        snoise(uv * noiseScale + u_time * 0.5 + 100.0)
      ) * noiseAmp;
      uv += noiseDisp;

      // === CHROMATIC ABERRATION (uses LOCAL aggression - varies across x) ===
      float chromaOffset = localAggression * u_chromaMax + (1.0 - localAggression) * u_chromaMin;
      float dynamicOffset = sin(u_time * 2.0) * localAggression * 0.01;

      // Chromatic displacement in both X and Y
      float chromaX = chromaOffset + dynamicOffset;
      float chromaY = chromaOffset * 0.5;

      vec2 rOffset = vec2(-chromaX, -chromaY);
      vec2 gOffset = vec2(0.0, 0.0);
      vec2 bOffset = vec2(chromaX, chromaY);

      // === VERTICAL DISPLACEMENT (uses LOCAL aggression - creates streaky smear effect) ===
      float vertDisp = localAggression * u_vertDispMax + (1.0 - localAggression) * u_vertDispMin;
      
      // === BLUR (inverse quadratic: low aggression = much more blur, high = crisp) ===
      float invAggression = 1.0 - localAggression;
      float blurAmount = invAggression * invAggression * u_blurMax + localAggression * u_blurMin;
      
      vec3 colorR = vec3(0.0);
      vec3 colorG = vec3(0.0);
      vec3 colorB = vec3(0.0);
      float alphaAccum = 0.0;
      float totalWeight = 0.0;

      // 2D Gaussian blur + vertical displacement
      const int BLUR_SAMPLES = 2;  // -2 to 2 = 5x5 = 25 samples
      
      for (int i = -BLUR_SAMPLES; i <= BLUR_SAMPLES; i++) {
        for (int j = -BLUR_SAMPLES; j <= BLUR_SAMPLES; j++) {
          // 2D Gaussian weight
          float nx = float(i) / float(BLUR_SAMPLES);
          float ny = float(j) / float(BLUR_SAMPLES);
          float weight = exp(-0.5 * (nx * nx + ny * ny));
          
          // Blur offset in both X and Y
          vec2 blurOffset = vec2(
            float(i) * blurAmount / float(BLUR_SAMPLES),
            float(j) * blurAmount / float(BLUR_SAMPLES)
          );
          
          // Add vertical displacement (shifts the whole blur down based on aggression)
          blurOffset.y += vertDisp * 0.5;
          
          colorR += texture2D(u_texture, uv + rOffset + blurOffset).rgb * weight;
          colorG += texture2D(u_texture, uv + gOffset + blurOffset).rgb * weight;
          colorB += texture2D(u_texture, uv + bOffset + blurOffset).rgb * weight;
          
          alphaAccum += max(
            texture2D(u_texture, uv + rOffset + blurOffset).a,
            max(
              texture2D(u_texture, uv + gOffset + blurOffset).a,
              texture2D(u_texture, uv + bOffset + blurOffset).a
            )
          ) * weight;
          
          totalWeight += weight;
        }
      }

      colorR /= totalWeight;
      colorG /= totalWeight;
      colorB /= totalWeight;
      float a = alphaAccum / totalWeight;

      // Combine chromatic channels
      float r = colorR.r;
      float g = colorG.g;
      float b = colorB.b;

      vec3 color = vec3(r, g, b);

      // === GLOW/LUMINOSITY (ethereal effect - stronger at low aggression) ===
      float glowIntensity = invAggression * invAggression * u_bloomMax + localAggression * u_bloomMin;
      
      // Only apply glow to text areas
      float textPresence = smoothstep(0.0, 0.2, a);
      float effectiveGlow = glowIntensity * textPresence;
      
      // Calculate luminance of current pixel
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      
      // Soft glow: boost brightness based on existing luminance (bright areas glow more)
      float glowBoost = lum * effectiveGlow * 0.4;
      color += glowBoost;
      
      // Soft highlight compression - let bright areas blow out gently
      vec3 softClip = color / (1.0 + color * effectiveGlow * 0.25);
      color = mix(color, softClip + effectiveGlow * 0.1, effectiveGlow);

      // === GRAIN ===
      float grainIntensity = localAggression * u_grainMax + (1.0 - localAggression) * u_grainMin;
      float grain = snoise(uv * 500.0 + u_time * 10.0) * grainIntensity;
      color += grain;

      // === COLOR GRADING (only on text, not background) ===
      float textMask = smoothstep(0.0, 0.3, a);
      
      // Brightness boost only on text
      float brightness = (localAggression * 0.1 + (1.0 - localAggression) * 0.15) * textMask;
      color += brightness;

      // Contrast - aggressive = harsh contrast, ethereal = softer (on text only)
      float contrast = (localAggression * 0.3 + (1.0 - localAggression) * 0.0) * textMask;
      vec3 contrasted = (color - 0.5) * (1.0 + contrast) + 0.5;
      color = mix(color, contrasted, textMask);

      // === COLOR TEMPERATURE (ethereal = warm golden, aggressive = cool harsh) ===
      // Warm shift for ethereal: boost red/green, reduce blue
      float warmth = invAggression * 0.12 * textMask;
      color.r += warmth * 0.6;   // Peachy/golden red boost
      color.g += warmth * 0.3;   // Slight green for golden tone
      color.b -= warmth * 0.2;   // Reduce blue for warmth
      
      // Cool shift for aggressive: slight blue push, reduce warmth
      float coolness = localAggression * 0.08 * textMask;
      color.b += coolness * 0.15;
      color.r -= coolness * 0.08;

      // === SATURATION (INVERTED: aggressive = desaturated/gritty, ethereal = vibrant) ===
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      // Flip the mapping: low aggression = saturated, high aggression = desaturated
      float saturation = (1.0 - localAggression) * 0.4 + localAggression * -0.4;
      color = mix(vec3(gray), color, 1.0 + saturation);

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

  function createTextTexture(text) {
    textCanvas.width = canvas.width;
    textCanvas.height = canvas.height;

    textCtx.fillStyle = params.bgColor;
    textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    // Auto-fit font size with 5% padding on each side (90% of width)
    const padding = 0.05;
    const targetWidth = textCanvas.width * (1 - padding * 2);
    
    // Measure at test size to calculate ratio
    const testSize = 100;
    const fontFamily = currentFont === 'Pitch' ? '"Pitch", monospace' : currentFont;
    textCtx.font = `600 ${testSize}px ${fontFamily}`;
    const measuredWidth = textCtx.measureText(text).width;
    
    // Calculate font size to fit, with a max cap for very short text
    const maxFontSize = textCanvas.height * 0.7;
    const fontSize = Math.min(Math.floor((targetWidth / measuredWidth) * testSize), maxFontSize);

    textCtx.font = `600 ${fontSize}px ${fontFamily}`;
    textCtx.fillStyle = params.textColor;
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

  // Create 1D aggression data texture
  function createAggressionTexture(data) {
    // Convert normalized 0-1 data to 0-255 for UNSIGNED_BYTE texture
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

  // Get uniform locations
  const u_time = gl.getUniformLocation(program, 'u_time');
  const u_resolution = gl.getUniformLocation(program, 'u_resolution');
  const u_texture = gl.getUniformLocation(program, 'u_texture');
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
  const u_bloomMin = gl.getUniformLocation(program, 'u_bloomMin');
  const u_bloomMax = gl.getUniformLocation(program, 'u_bloomMax');

  let texture = null;
  let aggressionTexture = null;

  function updateAggressionTexture() {
    let data = params.normalizeAggression ? normalizedAggressionData : aggressionData;
    // Apply smoothing if enabled
    if (params.smoothing > 0) {
      data = smoothArray(data, params.smoothing);
    }
    aggressionTexture = createAggressionTexture(data);
  }

  function recreateTextTexture() {
    texture = createTextTexture(currentDisplayText);
  }

  // Handle mouse movement
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  });

  // Handle resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Recreate texture with new size
    recreateTextTexture();

    // Resize timeline
    timelineCanvas.width = window.innerWidth - 40;
    timelineCanvas.height = 60;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Initialize mouse position
  mouseX = canvas.width / 2;

  // Create initial aggression texture
  updateAggressionTexture();

  // Main render loop
  function render() {
    const time = Date.now() / 1000;
    const width = canvas.width;

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
    gl.uniform1f(u_bloomMin, params.bloomMin);
    gl.uniform1f(u_bloomMax, params.bloomMax);

    // Bind text texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u_texture, 0);

    // Bind aggression data texture to unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, aggressionTexture);
    gl.uniform1i(u_aggressionData, 1);

    // Clear and draw with background color
    const bgR = parseInt(params.bgColor.slice(1, 3), 16) / 255;
    const bgG = parseInt(params.bgColor.slice(3, 5), 16) / 255;
    const bgB = parseInt(params.bgColor.slice(5, 7), 16) / 255;
    gl.clearColor(bgR, bgG, bgB, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Draw timeline
    const tlWidth = timelineCanvas.width;
    const tlHeight = timelineCanvas.height;

    timelineCtx.fillStyle = '#1e1e1e';
    timelineCtx.fillRect(0, 0, tlWidth, tlHeight);

    // Draw trim region highlight
    const trimStartX = params.trimStart * tlWidth;
    const trimEndX = params.trimEnd * tlWidth;
    timelineCtx.fillStyle = 'rgba(255, 100, 200, 0.15)';
    timelineCtx.fillRect(trimStartX, 0, trimEndX - trimStartX, tlHeight);

    // Aggression curve (use current setting, with smoothing applied)
    let displayData = params.normalizeAggression ? normalizedAggressionData : aggressionData;
    if (params.smoothing > 0) {
      displayData = smoothArray(displayData, params.smoothing);
    }
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

    // Trim markers
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

    // Update info overlay
    const trimDuration = (params.trimEnd - params.trimStart) * trackDuration;
    info.innerHTML = `
      <div style="color: #ff64c8;">${currentTrack.title}</div>
      <div>DURATION: ${trackDuration.toFixed(1)}s</div>
      <div>TRIM: ${(params.trimStart * 100).toFixed(0)}% → ${(params.trimEnd * 100).toFixed(0)}% (${trimDuration.toFixed(1)}s)</div>
      <div style="margin-top: 8px; opacity: 0.6;">X-axis maps to energy timeline</div>
    `;

    animationId = requestAnimationFrame(render);
  }

  render();
}
