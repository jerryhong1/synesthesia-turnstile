import os
import json
from pathlib import Path
from analyze_audio import analyze_track

# Find all audio files in the music directory
music_dir = Path("music")
audio_files = sorted(music_dir.glob("*.m4a"))

print(f"Found {len(audio_files)} tracks to analyze\n")

results = []
for i, audio_file in enumerate(audio_files, 1):
    print(f"[{i}/{len(audio_files)}] Processing: {audio_file.name}")
    try:
        analysis = analyze_track(str(audio_file))
        if analysis:
            results.append({
                'file': audio_file.name,
                'analysis_file': f"{audio_file.stem}_analysis.json"
            })
    except Exception as e:
        print(f"  ERROR: {e}")
    print()

print(f"\n{'='*60}")
print(f"✓ Successfully analyzed {len(results)} tracks")
print(f"{'='*60}")

# Save a summary
summary = {
    'total_tracks': len(results),
    'tracks': results
}

with open('analysis_summary.json', 'w') as f:
    json.dump(summary, f, indent=2)

print("\nSummary saved to analysis_summary.json")
