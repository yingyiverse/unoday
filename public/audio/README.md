# Audio Files for Focus Mode

This directory contains all audio files required for the Focus Mode timer feature.

## Required Audio Files

### Environment Sounds

1. **Countryside Night.wav** - Peaceful countryside night ambiance
2. **Beach Waves.wav** - Soothing beach waves sound
3. **Ocean.wav** - Deep ocean soundscape
4. **Snow.wav** - Gentle snow falling sounds
5. **Snow Falling_Under_Rock_Himalaya.wav** - Himalayan snow ambiance
6. **Light_Rain_Forest_Brazil_Increasing_Intensity.wav** - Light rain in forest
7. **Downpour01.wav** through **Downpour08.wav** - Sequential downpour sounds (8 files)
8. **Gentle Lake.wav** - Calm lake water sounds

### Bell Sounds

1. **Entrance Bell1.wav** - Sound played when starting countdown
2. **Entrance Bell2.wav** - Sound played when countdown ends (at 3 seconds remaining)

## File Structure

```
public/
└── audio/
    ├── README.md (this file)
    ├── Countryside Night.wav
    ├── Beach Waves.wav
    ├── Ocean.wav
    ├── Snow.wav
    ├── Snow Falling_Under_Rock_Himalaya.wav
    ├── Light_Rain_Forest_Brazil_Increasing_Intensity.wav
    ├── Downpour01.wav
    ├── Downpour02.wav
    ├── Downpour03.wav
    ├── Downpour04.wav
    ├── Downpour05.wav
    ├── Downpour06.wav
    ├── Downpour07.wav
    ├── Downpour08.wav
    ├── Gentle Lake.wav
    ├── Entrance Bell1.wav
    └── Entrance Bell2.wav
```

## Audio Playback Logic

### Environment Sounds
- All environment sounds except Downpour loop continuously
- **Downpour**: Plays files sequentially from 01 to 08, then loops back to 01
- Ambient sounds start playing after Entrance Bell1 finishes
- All sounds stop when Exit Bell (Entrance Bell2) starts

### Bell Sounds
- **Entrance Bell1**: Plays when user clicks "开始" button, with Bell animation displayed
- **Entrance Bell2**: Plays when countdown reaches 3 seconds remaining
- After Entrance Bell2 finishes, the view returns to time selection

## Notes

- All audio files should be in WAV format for best quality
- Recommended volume levels:
  - Bell sounds: 70% (0.7)
  - Ambient sounds: 50% (0.5)
