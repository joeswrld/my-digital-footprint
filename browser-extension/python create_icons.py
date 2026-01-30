#!/usr/bin/env python3
"""
FixSense Browser Extension - Icon Generator
This script creates the required PNG icons for the browser extension.
Run this script in your browser-extension directory to fix the icon error.
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing Pillow...")
    import subprocess
    import sys
    subprocess.run([sys.executable, "-m", "pip", "install", "pillow"], check=True)
    from PIL import Image, ImageDraw

import os

def create_shield_icon(size):
    """Create a professional shield icon with FixSense branding"""
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Scale factor for consistent proportions
    scale = size / 128
    
    # Define shield dimensions
    padding = int(16 * scale)
    shield_width = size - (2 * padding)
    shield_height = int(shield_width * 1.1)
    
    # Calculate shield points
    top_y = padding
    bottom_y = top_y + shield_height
    left_x = padding
    right_x = padding + shield_width
    center_x = size // 2
    
    # Shield outline (polygon points)
    shield_points = [
        (center_x, top_y),  # Top center
        (right_x, top_y + int(shield_height * 0.2)),  # Top right
        (right_x, top_y + int(shield_height * 0.6)),  # Mid right
        (center_x, bottom_y),  # Bottom point
        (left_x, top_y + int(shield_height * 0.6)),  # Mid left
        (left_x, top_y + int(shield_height * 0.2)),  # Top left
    ]
    
    # Draw filled shield - main color (indigo #6366f1)
    draw.polygon(shield_points, fill=(99, 102, 241, 255))
    
    # Add lighter accent layer (purple #8b5cf6)
    accent_points = [
        (center_x, top_y + int(10 * scale)),
        (right_x - int(5 * scale), top_y + int(shield_height * 0.25)),
        (right_x - int(5 * scale), top_y + int(shield_height * 0.55)),
        (center_x, bottom_y - int(10 * scale)),
        (left_x + int(5 * scale), top_y + int(shield_height * 0.55)),
        (left_x + int(5 * scale), top_y + int(shield_height * 0.25)),
    ]
    draw.polygon(accent_points, fill=(139, 92, 246, 255))
    
    # Add "F" letter for larger icons
    if size >= 48:
        letter_size = int(size * 0.4)
        letter_x = center_x - int(letter_size * 0.2)
        letter_y = center_x - int(letter_size * 0.3)
        
        # F - horizontal top bar
        draw.rectangle(
            [letter_x, letter_y, 
             letter_x + int(letter_size * 0.6), 
             letter_y + int(letter_size * 0.12)],
            fill=(255, 255, 255, 255)
        )
        
        # F - vertical bar
        draw.rectangle(
            [letter_x, letter_y, 
             letter_x + int(letter_size * 0.12), 
             letter_y + letter_size],
            fill=(255, 255, 255, 255)
        )
        
        # F - horizontal middle bar
        draw.rectangle(
            [letter_x, letter_y + int(letter_size * 0.4), 
             letter_x + int(letter_size * 0.45), 
             letter_y + int(letter_size * 0.52)],
            fill=(255, 255, 255, 255)
        )
    
    return img

def main():
    """Generate all required icon sizes"""
    # Create icons directory if it doesn't exist
    icons_dir = 'icons'
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
        print(f"Created {icons_dir}/ directory")
    
    # Generate each required size
    sizes = [16, 48, 128]
    
    print("\n🎨 Generating FixSense extension icons...\n")
    
    for size in sizes:
        icon = create_shield_icon(size)
        filepath = os.path.join(icons_dir, f'icon{size}.png')
        icon.save(filepath, 'PNG')
        print(f"✅ Created {filepath} ({size}x{size}px)")
    
    print("\n✨ All icons created successfully!")
    print("\n📋 Next steps:")
    print("   1. Open your browser and go to chrome://extensions/")
    print("   2. Enable 'Developer mode' (top-right toggle)")
    print("   3. Click 'Load unpacked'")
    print("   4. Select the browser-extension folder")
    print("\n🎉 Your extension should now load without errors!\n")

if __name__ == "__main__":
    main()