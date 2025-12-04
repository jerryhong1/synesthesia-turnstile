# Turnstile Generative Visual Identity

Audio analysis system for extracting energy/intensity data from Turnstile tracks to drive generative visuals.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run analysis on an audio file:
```bash
python analyze_audio.py your_track.mp3
```

This will generate a JSON file with:
- **energy**: RMS loudness (main intensity metric)
- **brightness**: Spectral centroid (higher = more treble/harsh)
- **harshness**: Zero crossing rate (distortion/noise - perfect for hardcore moments)
- **beats**: Exact timestamps of detected beats
- **tempo**: BPM

## Output Format

The JSON output contains normalized (0-1) values you can map directly to visual parameters:
- Blur amount
- Particle speed
- Color saturation
- Motion intensity
- etc.
