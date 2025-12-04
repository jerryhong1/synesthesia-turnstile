# Turnstile Generative Visual Identity - Project Context

## Project Overview

Creating a generative visual identity system for Turnstile (specifically the **TURNSTILE LOVE CONNECTION** album) for a class project. The concept explores the aesthetic intersection of **hardcore/gritty and ethereal/vibes** that characterizes their recent work.

### Core Concept

Text-based shader visualization where track names are displaced/distorted based on audio analysis data. The visual treatment morphs along the track's timeline - e.g., if a song is aggressive until the 40% mark, the first 40% of the text would use an aggressive shader while the remaining 60% would be more ethereal/calm.

### Aesthetic Themes

- Gritty/ethereal duality
- Blur and motion (long-exposure street photography aesthetic)
- Gradient systems (pastels to saturated)
- Analog/film grain texture
- Rhythm and ripple dynamics
- Geometric containment vs. organic overflow
- "Gentrified punk" - polished presentation of raw content

## What We've Built

### 1. Audio Analysis System

**Script: `analyze_audio.py`**
- Extracts time-varying audio features from tracks
- Outputs JSON files with normalized (0-1) data

**Audio Features Extracted:**
- **Energy** (RMS loudness) - 50% weight in aggression score
  - Spectral analysis of overall amplitude/volume
- **Brightness** (Spectral Centroid) - 25% weight
  - "Center of mass" of frequency spectrum
  - Weighted average: Σ(frequency × magnitude) / Σ(magnitude)
  - Higher = more high-frequency/treble content
- **Harshness** (Zero Crossing Rate) - 25% weight
  - Counts zero-amplitude crossings per frame
  - Indicates noisiness/distortion
- **Local Tempo** (NEW - requires reanalysis)
  - Time-varying tempo using tempogram analysis
  - Shows tempo changes throughout the track
- **Beats** - Detected beat timestamps
- **Global Tempo** - Average BPM for entire track

**Aggression Score:**
```python
aggression = (energy * 0.5) + (brightness * 0.25) + (harshness * 0.25)
```

### 2. Batch Processing

**Script: `analyze_all_tracks.py`**
- Processes all tracks in `music/` folder
- Generates individual analysis JSON files in `analysis/` folder
- Creates `analysis_summary.json` index

### 3. Visualization Notebooks

**`visualize_analysis.ipynb`**
- Single track analysis and visualization
- Shows energy, brightness, harshness over time
- Calculates aggression score with color gradient
- Shows percentage breakdown (aggressive vs calm)
- Identifies transitions (intensifying vs mellowing)
- Exports downsampled data for p5.js

**`compare_all_tracks.ipynb`**
- Album-wide analysis of all 14 tracks
- Track statistics ranked by aggression
- Stacked comparison (all tracks on same time scale)
- Continuous album timeline view
- Individual attribute breakdowns (energy/brightness/harshness separately)
- Track boundaries with labels
- Bar chart comparisons
- Exports combined album data: `turnstile_love_connection_p5.json`

## File Structure

```
turnstile/
├── music/                          # Original audio files (14 tracks, .m4a)
│   ├── 01 NEVER ENOUGH.m4a
│   ├── 02 SOLE.m4a
│   └── ... (tracks 03-14)
│
├── analysis/                       # Generated JSON analysis files
│   ├── 01 NEVER ENOUGH_analysis.json
│   ├── 02 SOLE_analysis.json
│   └── ... (all 14 tracks)
│
├── analyze_audio.py                # Single track analysis script
├── analyze_all_tracks.py           # Batch processing script
├── visualize_analysis.ipynb        # Single track visualization
├── compare_all_tracks.ipynb        # Album-wide analysis
├── turnstile_love_connection_p5.json  # Combined export for p5.js
├── requirements.txt                # Python dependencies
├── README.md                       # Basic setup instructions
└── CLAUDE.md                       # This file

Related:
../p5/                              # Existing p5.js projects
  ├── 06_audio_response1/
  ├── 07_audio_response2/
  └── 08_audio_representation/
```

## Key Findings from Analysis

### Track Rankings by Aggression:
1. **DREAMING** (0.54 avg, 74% aggressive) - Most intense
2. **LIGHT DESIGN** (0.52 avg, 76.8% aggressive)
3. **I CARE** (0.43 avg, 37.1% aggressive)
...
14. **CEILING** (0.23 avg, 0.8% aggressive) - Most ethereal

### Album Duration:
- Total: ~48 minutes across 14 tracks
- Longest: **LOOK OUT FOR ME** (6.7 min)
- Shortest: **CEILING** (1.2 min)

### Album Average Aggression: 0.37
- Shows good balance between hardcore energy and atmospheric moments
- Validates the "gritty/ethereal intersection" concept

## Data Format for p5.js

The exported JSON contains:

```json
{
  "album": "TURNSTILE LOVE CONNECTION",
  "total_duration": 2873.5,
  "tracks": [
    {
      "title": "NEVER ENOUGH",
      "tempo": 152.0,
      "duration": 287.2,
      "frames": {
        "times": [...],           // Timestamps
        "energy": [...],          // 0-1 normalized
        "brightness": [...],      // 0-1 normalized
        "harshness": [...],       // 0-1 normalized
        "aggression": [...],      // 0-1 combined score
        "local_tempo": [...],     // BPM values (after reanalysis)
        "local_tempo_normalized": [...]  // 0-1 normalized
      },
      "beats": [...],             // Beat timestamps
      "stats": {
        "avg_aggression": 0.34,
        "aggressive_percentage": 13.1
      }
    }
    // ... more tracks
  ]
}
```

## Technical Setup

### Dependencies:
```bash
conda create -n turnstile python=3.10
conda activate turnstile
pip install -r requirements.txt
```

**Required packages:**
- librosa (audio analysis)
- numpy (numerical operations)
- scipy (smoothing filters)
- matplotlib (visualization)
- jupyter (notebooks)

### Running Analysis:
```bash
# Single track
python analyze_audio.py "music/01 NEVER ENOUGH.m4a"

# All tracks
python analyze_all_tracks.py

# Visualize
jupyter notebook visualize_analysis.ipynb
jupyter notebook compare_all_tracks.ipynb
```

## Next Steps: Building the Shader Visualization

### Target Platform: p5.js

**Planned Implementation:**
1. Load track analysis JSON data
2. Create GLSL shader with two "states":
   - **Aggressive shader**: Harsh displacement, RGB separation, motion blur, high contrast
   - **Ethereal shader**: Soft blur, gentle distortion, pastel glow, dreamy
3. Map aggression score to shader interpolation
4. Apply to track name typography
5. Animate based on time position in track

**Shader Parameters to Consider:**
- Displacement amount (driven by energy)
- Blur radius (inverse of harshness?)
- Color separation/chromatic aberration
- Grain/noise texture
- Gradient intensity
- Motion direction (from local tempo changes?)

**Aesthetic References:**
- Motion blur from mosh pit photography
- Long-exposure street photography
- VHS/analog distortion
- Y2K gradients
- Rinko Kawauchi's soft focus work

### Questions to Explore:
- Should tempo changes affect animation speed or visual rhythm?
- How to visualize transitions between aggressive/calm sections?
- Static frames vs. real-time animation?
- One shader system or multiple presets per track?
- How much of the Turnstile visual identity (colors, typography) to incorporate?

## Design Philosophy

**"Energy state visualization"** - Same underlying generative system produces infinite variations by responding to audio input. The packaging/visual output exists in different states from calm to chaotic, all from the same procedural logic.

**Duality** - Every element sits between opposing forces:
- Gritty ↔ Ethereal
- Analog ↔ Digital
- Contained ↔ Explosive
- Harsh ↔ Beautiful
- Underground ↔ Polished

This tension IS Turnstile's aesthetic.

---

## For Claude in Next Session:

You're helping build a p5.js shader-based generative visual system that uses the audio analysis data described above. The user has experience with p5.js (see `../p5/` folder) and wants to create text displacement effects that respond to track energy/aggression over time.

The data is ready. Time to make it move.
