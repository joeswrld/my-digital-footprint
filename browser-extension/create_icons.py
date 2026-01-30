from PIL import Image, ImageDraw
import os

# Create icons directory
os.makedirs('icons', exist_ok=True)

# List of possible source image filenames to look for
possible_sources = [
    'android-chrome-512x512.png',
    'logo.png',
    'icon.png',
    'favicon.png'
]

# Try to find an existing image
logo = None
source_file = None

for filename in possible_sources:
    if os.path.exists(filename):
        try:
            logo = Image.open(filename)
            source_file = filename
            print(f"✅ Found source image: {filename}")
            break
        except Exception as e:
            print(f"⚠️ Could not open {filename}: {e}")

# If no image found, create a simple default icon
if logo is None:
    print("📝 No source image found. Creating a default icon...")
    # Create a simple gradient icon as placeholder
    size = 512
    logo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)
    
    # Draw a rounded rectangle with gradient effect
    for i in range(size//2):
        color = (100 + i//3, 150 + i//4, 255 - i//3, 255)
        draw.ellipse([i, i, size-i, size-i], fill=color)
    
    # Add a simple "DF" text (Digital Footprint)
    from PIL import ImageFont
    try:
        # Try to use a system font
        font = ImageFont.truetype("arial.ttf", 200)
    except:
        font = ImageFont.load_default()
    
    # Draw text
    text = "DF"
    draw.text((size//2, size//2), text, fill=(255, 255, 255, 255), 
              anchor="mm", font=font)
    
    source_file = "generated_default_icon.png"
    logo.save(source_file)
    print(f"✅ Created default icon: {source_file}")

# Generate icons at required sizes
sizes = [16, 48, 128]
for size in sizes:
    resized = logo.resize((size, size), Image.Resampling.LANCZOS)
    output_path = f'icons/icon{size}.png'
    resized.save(output_path, 'PNG')
    print(f"✅ Created {output_path}")

print("\n🎉 Done! Icon files created successfully.")
print("\n📋 Next steps:")
print("1. If you want a custom icon, replace the source image with your logo")
print("2. Re-run this script to regenerate the icons")
print("3. Reload your browser extension to see the new icons")