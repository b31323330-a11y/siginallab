import os
import numpy as np
from PIL import Image, ImageDraw
import wave
import struct

samples_dir = r"C:\Users\User\.gemini\antigravity\scratch\signallab\content\samples"
os.makedirs(samples_dir, exist_ok=True)

# 1. Create Cameraman benchmark grayscale image (256x256)
w, h = 256, 256
cam_arr = np.zeros((h, w), dtype=np.uint8)
# Sky gradient
for y in range(h):
    cam_arr[y, :] = int(180 + 50 * np.sin(y / 40.0))
# Ground
cam_arr[160:, :] = 70
# Cameraman silhouette + coat
cam_img = Image.fromarray(cam_arr)
draw = ImageDraw.Draw(cam_img)
# Draw figure
draw.ellipse([90, 40, 130, 80], fill=40)  # Head
draw.polygon([(85, 80), (145, 80), (160, 200), (75, 200)], fill=30)  # Coat
draw.line([(140, 70), (190, 110)], fill=20, width=6)  # Tripod arm
draw.line([(190, 110), (160, 240)], fill=20, width=4)  # Leg 1
draw.line([(190, 110), (190, 240)], fill=20, width=4)  # Leg 2
draw.line([(190, 110), (220, 240)], fill=20, width=4)  # Leg 3
draw.rectangle([175, 95, 205, 120], fill=50)  # Camera
cam_img.save(os.path.join(samples_dir, "cameraman.png"))
cam_img.save(os.path.join(samples_dir, "cameraman.tif"))

# 2. Create Peppers color benchmark image (256x256)
pep_arr = np.zeros((h, w, 3), dtype=np.uint8)
# Deep green background
pep_arr[:, :] = [30, 60, 30]
pep_img = Image.fromarray(pep_arr)
draw = ImageDraw.Draw(pep_img)
# Red pepper
draw.ellipse([30, 60, 130, 180], fill=(220, 30, 30))
draw.line([(80, 60), (75, 30)], fill=(40, 140, 40), width=6)
# Yellow pepper
draw.ellipse([110, 80, 210, 200], fill=(230, 190, 30))
draw.line([(160, 80), (165, 45)], fill=(40, 140, 40), width=6)
# Green pepper
draw.ellipse([70, 130, 170, 230], fill=(30, 170, 50))
pep_img.save(os.path.join(samples_dir, "peppers.png"))

# 3. Create Mother grayscale benchmark image (256x256)
mother_arr = np.zeros((h, w), dtype=np.uint8)
# Portrait soft lighting
for y in range(h):
    for x in range(w):
        r = np.sqrt((x - 128)**2 + (y - 120)**2)
        val = 140 - int(r * 0.5) + int(20 * np.sin(x / 10.0))
        mother_arr[y, x] = np.clip(val, 20, 240)
mother_img = Image.fromarray(mother_arr)
draw = ImageDraw.Draw(mother_img)
draw.ellipse([95, 70, 160, 150], fill=190)  # Face
draw.ellipse([110, 100, 120, 110], fill=60)  # Eye L
draw.ellipse([135, 100, 145, 110], fill=60)  # Eye R
draw.arc([115, 120, 140, 135], 0, 180, fill=80, width=2)  # Smile
mother_img.save(os.path.join(samples_dir, "mother.png"))
mother_img.save(os.path.join(samples_dir, "mother.tif"))

# 4. Generate Speech audio sample (Fs=16000, 2 seconds, synthetic vowel formants + fundamental pitch ~130 Hz)
fs = 16000
duration = 2.0
t = np.linspace(0, duration, int(fs * duration), endpoint=False)
f0 = 130.0  # Male pitch
# Formants for vowel /a/: F1~730Hz, F2~1090Hz, F3~2440Hz
glottal = (t * f0) % 1.0  # Sawtooth-like glottal pulse
speech = 0.6 * np.sin(2 * np.pi * 730 * t) + 0.3 * np.sin(2 * np.pi * 1090 * t) + 0.15 * np.sin(2 * np.pi * 2440 * t)
speech = speech * (0.5 + 0.5 * np.sin(2 * np.pi * f0 * t))
# Envelope fade in/out
env = np.sin(np.pi * t / duration)
speech = speech * env
speech = speech / (np.max(np.abs(speech)) + 1e-6) * 0.8
speech_int16 = (speech * 32767).astype(np.int16)

with wave.open(os.path.join(samples_dir, "speech_sample.wav"), "w") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(fs)
    wav_file.writeframes(speech_int16.tobytes())

# 5. Generate Music audio sample (Fs=44100, 2 seconds, pleasant chord C-E-G-C with vibrato)
fs_m = 44100
t_m = np.linspace(0, duration, int(fs_m * duration), endpoint=False)
chord = (
    0.3 * np.sin(2 * np.pi * 261.63 * t_m) +  # C4
    0.25 * np.sin(2 * np.pi * 329.63 * t_m) +  # E4
    0.25 * np.sin(2 * np.pi * 392.00 * t_m) +  # G4
    0.2 * np.sin(2 * np.pi * 523.25 * t_m)    # C5
)
music = chord * np.sin(np.pi * t_m / duration)
music = music / (np.max(np.abs(music)) + 1e-6) * 0.8
music_int16 = (music * 32767).astype(np.int16)

with wave.open(os.path.join(samples_dir, "music_sample.wav"), "w") as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(fs_m)
    wav_file.writeframes(music_int16.tobytes())

print("All sample benchmark files (cameraman, peppers, mother, speech_sample, music_sample) generated successfully!")

