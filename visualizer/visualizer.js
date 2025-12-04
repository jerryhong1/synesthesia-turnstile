let trackData = null;
let animationId = null;
let mouseX = 0;

const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');

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
  // Find NEVER ENOUGH track
  const neverEnough = trackData.tracks.find(t => t.title === "NEVER ENOUGH");
  const aggressionData = neverEnough.frames.aggression;
  const trackDuration = neverEnough.duration;

  // Handle mouse movement
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
  });

  // Handle window resize
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Main draw loop
  function draw() {
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, width, height);

    // Calculate current time and aggression
    const currentTime = (mouseX / width) * trackDuration;
    const progress = currentTime / trackDuration;
    const index = Math.floor(progress * (aggressionData.length - 1));
    const aggression = aggressionData[Math.max(0, Math.min(index, aggressionData.length - 1))];

    // Draw displaced grid
    const cols = 30;
    const rows = 15;
    const spacing = 40;
    const time = Date.now() / 1000;

    ctx.save();
    ctx.translate(width / 2 - (cols * spacing) / 2, height / 2 - (rows * spacing) / 2);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * spacing;
        const y = j * spacing;
        const nx = i / cols;
        const ny = j / rows;

        const centerDist = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.5, 2));

        // Aggressive displacement
        const noiseVal = (Math.sin(nx * 5 + time) + Math.cos(ny * 5 + time)) / 2;
        let aggressiveX = Math.sin(ny * 15 + time * 3) * 20 * aggression;
        let aggressiveY = Math.cos(nx * 15 + time * 3) * 20 * aggression;
        aggressiveX += noiseVal * 40 * aggression;
        aggressiveY += noiseVal * 40 * aggression;

        // Ethereal displacement
        const etherealAmp = (1 - aggression);
        let etherealX = Math.sin(ny * 3 + time * 0.5) * 8 * etherealAmp;
        let etherealY = Math.cos(nx * 3 + time * 0.5) * 8 * etherealAmp;
        const breathe = Math.sin(time * 0.8 + centerDist * 3) * 5 * etherealAmp;
        etherealX += breathe * (nx - 0.5);
        etherealY += breathe * (ny - 0.5);

        const dispX = aggressiveX + etherealX;
        const dispY = aggressiveY + etherealY;

        // Size
        const aggressiveSize = 15 + Math.abs(noiseVal) * 20 * aggression;
        const etherealSize = 20 + Math.sin(time * 0.5 + centerDist * 2) * 3 * etherealAmp;
        const size = aggressiveSize * aggression + etherealSize * (1 - aggression);

        // Color
        const aggressiveR = 255 * (Math.abs(noiseVal) + aggression * 0.3);
        const aggressiveG = 100 * aggression;
        const aggressiveB = 200 * (1 - Math.abs(noiseVal) * aggression);

        const etherealR = 150 + Math.sin(time + centerDist * 2) * 50;
        const etherealG = 180 + Math.cos(time * 0.7) * 40;
        const etherealB = 220 + Math.sin(time * 0.5 + centerDist) * 35;

        const r = etherealR + (aggressiveR - etherealR) * aggression;
        const g = etherealG + (aggressiveG - etherealG) * aggression;
        const b = etherealB + (aggressiveB - etherealB) * aggression;

        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2;

        ctx.save();
        ctx.translate(x + dispX, y + dispY);

        if (aggression > 0.5) {
          const rotation = noiseVal * Math.PI * aggression;
          ctx.rotate(rotation);
          ctx.strokeRect(-size/2, -size/2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, size/2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    ctx.restore();

    // Draw debug info
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Aggression: ${aggression.toFixed(3)}`, 20, 30);
    ctx.fillText(`Progress: ${(progress * 100).toFixed(1)}%`, 20, 50);
    ctx.fillText(`Time: ${currentTime.toFixed(1)}s / ${trackDuration.toFixed(1)}s`, 20, 70);
    ctx.fillText(`Move mouse to scrub timeline`, 20, 90);

    // Timeline
    const timelineY = height - 100;
    const timelineHeight = 60;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(20, timelineY, width - 40, timelineHeight);

    // Aggression curve
    ctx.strokeStyle = '#ff64c8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < aggressionData.length; i++) {
      const px = 20 + ((width - 40) * i) / (aggressionData.length - 1);
      const py = timelineY + timelineHeight - 10 - (aggressionData[i] * (timelineHeight - 20));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Dropoff highlight
    const dropStart = 20 + (width - 40) * 0.75;
    const dropEnd = 20 + (width - 40) * 0.80;
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    ctx.fillRect(dropStart, timelineY, dropEnd - dropStart, timelineHeight);

    // Current position
    const markerX = 20 + ((width - 40) * mouseX) / width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(markerX, timelineY);
    ctx.lineTo(markerX, timelineY + timelineHeight);
    ctx.stroke();

    animationId = requestAnimationFrame(draw);
  }

  draw();
}
