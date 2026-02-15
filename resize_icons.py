from PIL import Image, ImageDraw
import os
import sys

sizes = [16, 32, 48, 128]
# Try to find the source logo
src_candidates = ["icons/logo.png", "logo.png", "dev-memory-logo.png"]
src = None

for path in src_candidates:
    if os.path.exists(path):
        src = path
        break

if not src:
    print("Error: Could not find strict logo file. Please save it as 'icons/logo.png'.")
    sys.exit(1)

try:
    img = Image.open(src)
    print(f"Opened {src} ({img.size})")
    
    for s in sizes:
        out = f"icons/icon{s}.png"
        
        # 1. Resize Step: 125% zoom logic
        zoom_factor = 1.25
        icon_size = int(s * zoom_factor)
        
        resized = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        
        # 2. Crop Step: Center crop to target size 's'
        left = (icon_size - s) // 2
        top = (icon_size - s) // 2
        right = left + s
        bottom = top + s
        cropped = resized.crop((left, top, right, bottom))
        
        # 3. Composite Step: Logo over White Background
        base = Image.new('RGBA', (s, s), (255, 255, 255, 255))
        if cropped.mode != 'RGBA':
            cropped = cropped.convert('RGBA')
        base.paste(cropped, (0, 0), cropped)
        
        # 4. Mask Step: Apply Rounded corners
        mask = Image.new('L', (s, s), 0)
        draw_mask = ImageDraw.Draw(mask)
        radius = int(s * 0.22)
        draw_mask.rounded_rectangle([(0, 0), (s-1, s-1)], radius=radius, fill=255)
        
        # Apply mask
        final = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        final.paste(base, (0, 0), mask)
        
        final.save(out)
        print(f"Generated {out} (Zoomed 110% + Masked)")
        
    print("Success! Icons generated.")

except Exception as e:
    print(f"Error processing image: {e}")
    sys.exit(1)
