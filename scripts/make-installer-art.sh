#!/usr/bin/env bash
# Regenerates the installer artwork in desktop-assets/ from public/favicon.png.
# Needs ffmpeg with drawtext. Run from the repo root: bash scripts/make-installer-art.sh
set -euo pipefail

OUT=desktop-assets
LOGO=public/favicon.png
BOLD="C\\:/Windows/Fonts/segoeuib.ttf"
REGULAR="C\\:/Windows/Fonts/segoeui.ttf"
mkdir -p "$OUT"

# Windows installer sidebar (welcome and finish pages), 164x314, 24-bit BMP.
ffmpeg -loglevel error -y \
  -f lavfi -i "gradients=s=164x314:c0=0x8b3dff:c1=0x4b0d9c:x0=0:y0=0:x1=164:y1=314:d=1" \
  -i "$LOGO" -filter_complex "\
[1:v]scale=72:72[logo];\
[0:v][logo]overlay=(W-w)/2:58,\
drawtext=fontfile='$BOLD':text='Bubble Studio':fontcolor=white:fontsize=19:x=(w-text_w)/2:y=148,\
drawtext=fontfile='$REGULAR':text='Posts and reels':fontcolor=white@0.8:fontsize=12:x=(w-text_w)/2:y=176,\
drawbox=x=52:y=208:w=60:h=1:color=white@0.35:t=fill,\
drawtext=fontfile='$REGULAR':text='by Infiax.com':fontcolor=white@0.9:fontsize=12:x=(w-text_w)/2:y=222,\
drawtext=fontfile='$REGULAR':text='Made by Harindu Jayakody':fontcolor=white@0.6:fontsize=10:x=(w-text_w)/2:y=286,\
format=bgr24" -frames:v 1 "$OUT/installer-sidebar.bmp"

# Windows installer header (inner pages, top right), 150x57, 24-bit BMP.
ffmpeg -loglevel error -y \
  -f lavfi -i "color=c=white:s=150x57:d=1" -i "$LOGO" -filter_complex "\
[1:v]scale=34:34[logo];\
[0:v][logo]overlay=110:11,\
drawtext=fontfile='$BOLD':text='Bubble':fontcolor=0x0e1318:fontsize=14:x=48:y=13,\
drawtext=fontfile='$BOLD':text='Studio':fontcolor=0x7d2ae8:fontsize=14:x=48:y=29,\
format=bgr24" -frames:v 1 "$OUT/installer-header.bmp"

# macOS disk image window background, 540x380 (plus @2x for Retina screens).
for scale in 1 2; do
  w=$((540 * scale)); h=$((380 * scale)); s=$scale
  suffix=$([ "$scale" = 2 ] && echo "@2x" || echo "")
  ffmpeg -loglevel error -y \
    -f lavfi -i "gradients=s=${w}x${h}:c0=0xf6f2ff:c1=0xebecf0:x0=0:y0=0:x1=0:y1=${h}:d=1" -i "$LOGO" -filter_complex "\
[1:v]scale=$((28 * s)):$((28 * s))[logo];\
[0:v][logo]overlay=$((24 * s)):$((22 * s)),\
drawtext=fontfile='$BOLD':text='Bubble Studio':fontcolor=0x0e1318:fontsize=$((15 * s)):x=$((60 * s)):y=$((27 * s)),\
drawtext=fontfile='$REGULAR':text='Drag the app into Applications to install':fontcolor=0x5e6573:fontsize=$((13 * s)):x=(w-text_w)/2:y=$((300 * s)),\
drawtext=fontfile='$BOLD':text='→':fontcolor=0x7d2ae8:fontsize=$((44 * s)):x=(w-text_w)/2:y=$((168 * s)),\
drawtext=fontfile='$REGULAR':text='by Infiax.com':fontcolor=0x5e6573@0.8:fontsize=$((11 * s)):x=w-text_w-$((22 * s)):y=$((28 * s)),\
format=rgb24" -frames:v 1 "$OUT/dmg-background${suffix}.png"
done

echo "Installer artwork written to $OUT/"
