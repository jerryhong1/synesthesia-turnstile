import librosa
import numpy as np
import json
import sys
import os

def analyze_track(audio_path, output_path=None):
    """
    Extract energy/intensity data from an audio track
    """
    if not os.path.exists(audio_path):
        print(f"Error: File not found: {audio_path}")
        return None

    if output_path is None:
        # Auto-generate output name based on input
        # Save to analysis/ folder
        os.makedirs('analysis', exist_ok=True)
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        output_path = f"analysis/{base_name}_analysis.json"

    print(f"Loading {audio_path}...")
    y, sr = librosa.load(audio_path)

    print("Analyzing audio features...")

    # RMS Energy (overall loudness/intensity)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]

    # Spectral Centroid (brightness - higher = more intense/harsh)
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

    # Zero Crossing Rate (noisiness/distortion - good for hardcore intensity)
    zcr = librosa.feature.zero_crossing_rate(y)[0]

    # Harmonic-Percussive Source Separation for percussion ratio
    print("Separating harmonic and percussive components...")
    y_harmonic, y_percussive = librosa.effects.hpss(y)

    # Get RMS of each component
    rms_percussive = librosa.feature.rms(y=y_percussive, frame_length=2048, hop_length=512)[0]

    # Percussion ratio (how much of the signal is percussive)
    percussion_ratio = rms_percussive / (rms + 1e-8)
    # Clip to 0-1 range (can exceed 1 in edge cases)
    percussion_ratio = np.clip(percussion_ratio, 0, 1)

    # Tempo and beat frames
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.asarray(tempo).item())  # Ensure scalar
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    # Local tempo - calculated from beat intervals
    print("Calculating local tempo...")
    from scipy.ndimage import gaussian_filter1d

    if len(beat_times) > 1:
        # Calculate tempo from consecutive beat intervals
        beat_intervals = np.diff(beat_times)  # Time between beats
        beat_tempos = 60.0 / beat_intervals   # Convert to BPM

        # Clip extreme values
        beat_tempos = np.clip(beat_tempos, 30, 300)

        # Create time points for each tempo measurement (midpoint between beats)
        beat_tempo_times = beat_times[:-1] + beat_intervals / 2

        # Interpolate to get tempo at each RMS frame time
        frame_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)

        # Extend beat tempo to cover full track duration
        extended_times = np.concatenate([[0], beat_tempo_times, [frame_times[-1]]])
        extended_tempos = np.concatenate([[tempo], beat_tempos, [tempo]])

        local_tempo_resampled = np.interp(frame_times, extended_times, extended_tempos)

        # Smooth to reduce jitter
        local_tempo_resampled = gaussian_filter1d(local_tempo_resampled, sigma=5)
    else:
        # Not enough beats detected, use global tempo
        local_tempo_resampled = np.full(len(rms), tempo)

    # Normalize everything to 0-1 range
    def normalize(arr):
        if arr.max() == arr.min():
            return [0.5] * len(arr)  # Handle constant arrays
        return ((arr - arr.min()) / (arr.max() - arr.min())).tolist()

    # Get timestamps for each frame
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)

    # Downsample local tempo for smaller file size (keep every 10th point)
    tempo_downsample = 10
    local_tempo_downsampled = local_tempo_resampled[::tempo_downsample]
    times_tempo = times[::tempo_downsample]

    # Package it all up
    analysis = {
        'filename': os.path.basename(audio_path),
        'tempo': tempo,  # Global tempo (BPM)
        'duration': float(librosa.get_duration(y=y, sr=sr)),
        'sample_rate': sr,
        'frames': {
            'times': times.tolist(),
            'energy': normalize(rms),
            'brightness': normalize(centroid),
            'harshness': normalize(zcr),
            'percussion': normalize(percussion_ratio)
        },
        'local_tempo': {
            'times': times_tempo.tolist(),
            'bpm': local_tempo_downsampled.tolist(),
            'normalized': normalize(local_tempo_downsampled)
        },
        'beats': beat_times.tolist()
    }

    # Save to JSON
    with open(output_path, 'w') as f:
        json.dump(analysis, f, indent=2)

    print(f"\n✓ Analysis saved to {output_path}")
    print(f"  Tempo: {tempo:.1f} BPM")
    print(f"  Duration: {analysis['duration']:.1f}s")
    print(f"  Total frames: {len(rms)}")
    print(f"  Total beats: {len(beat_times)}")
    print(f"  Avg percussion: {np.mean(percussion_ratio):.1%}")

    return analysis

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_audio.py <audio_file.mp3> [output.json]")
        print("\nExample:")
        print("  python analyze_audio.py turnstile_track.mp3")
        sys.exit(1)

    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    analyze_track(audio_file, output_file)
