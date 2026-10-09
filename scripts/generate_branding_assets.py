import os
from PIL import Image, ImageDraw, ImageFont

# Brand Colors
EARTH_BROWN = (60, 17, 0, 255)       # #3C1100
SOLAR_GOLD = (252, 185, 116, 255)    # #FCB974
WHITE = (255, 255, 255, 255)
LIGHT_GOLD = (254, 243, 199, 255)    # #FEF3C7
MUTED_TEXT = (190, 140, 120, 255)
TRANSPARENT = (0, 0, 0, 0)

IONICONS_PATH = "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"
UBUNTU_BOLD = "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf"
RECEIPT_CHAR = chr(62734)

def draw_receipt_badge(draw, center_x, center_y, radius, border_width, icon_size):
    # Outer gold border
    draw.ellipse(
        [
            center_x - radius,
            center_y - radius,
            center_x + radius,
            center_y + radius
        ],
        fill=EARTH_BROWN,
        outline=SOLAR_GOLD,
        width=border_width
    )
    
    # Receipt icon
    icon_font = ImageFont.truetype(IONICONS_PATH, icon_size)
    bbox = icon_font.getbbox(RECEIPT_CHAR)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    
    # Center glyph accurately
    x = center_x - bbox[0] - w / 2
    y = center_y - bbox[1] - h / 2
    
    draw.text((x, y), RECEIPT_CHAR, font=icon_font, fill=SOLAR_GOLD)

def generate_favicon():
    size = 192
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    
    radius = 88
    border_width = 8
    icon_size = 96
    draw_receipt_badge(draw, size / 2, size / 2, radius, border_width, icon_size)
    
    img.save("assets/favicon.png", "PNG")
    print("Regenerated assets/favicon.png (192x192)")

def generate_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), EARTH_BROWN)
    draw = ImageDraw.Draw(img)
    
    radius = 380
    border_width = 26
    icon_size = 420
    draw_receipt_badge(draw, size / 2, size / 2, radius, border_width, icon_size)
    
    img.save("assets/icon.png", "PNG")
    print("Regenerated assets/icon.png (1024x1024)")

def generate_adaptive_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(img)
    
    # Safe zone on Android is center 66% (diameter ~676)
    radius = 290
    border_width = 22
    icon_size = 320
    draw_receipt_badge(draw, size / 2, size / 2, radius, border_width, icon_size)
    
    img.save("assets/adaptive-icon.png", "PNG")
    print("Regenerated assets/adaptive-icon.png (1024x1024)")

def draw_spaced_text(draw, text, font, center_x, y, fill, spacing=6):
    # Calculate total width with custom letter-spacing
    char_widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in text]
    total_w = sum(char_widths) + (len(text) - 1) * spacing
    
    cur_x = center_x - total_w / 2
    for i, c in enumerate(text):
        bbox = font.getbbox(c)
        draw.text((cur_x - bbox[0], y - bbox[1]), c, font=font, fill=fill)
        cur_x += char_widths[i] + spacing

def generate_splash():
    width = 1284
    height = 2778
    img = Image.new("RGBA", (width, height), EARTH_BROWN)
    draw = ImageDraw.Draw(img)
    
    center_x = width / 2
    center_y = height / 2 - 140
    
    # Prominent Order Badge
    radius = 220
    border_width = 16
    icon_size = 240
    draw_receipt_badge(draw, center_x, center_y, radius, border_width, icon_size)
    
    # Text Fonts
    title_font = ImageFont.truetype(UBUNTU_BOLD, 84)
    sub_font = ImageFont.truetype(UBUNTU_BOLD, 36)
    footer_font = ImageFont.truetype(UBUNTU_BOLD, 30)
    
    # Title: RADICAL ORDERS
    t_y = center_y + radius + 75
    draw_spaced_text(draw, "RADICAL ORDERS", title_font, center_x, t_y, SOLAR_GOLD, spacing=8)
    
    # Subtitle: Order Management & Fulfillment
    s_text = "Order Management & Fulfillment"
    s_bbox = sub_font.getbbox(s_text)
    s_w = s_bbox[2] - s_bbox[0]
    s_y = t_y + 90
    draw.text((center_x - s_w / 2, s_y), s_text, font=sub_font, fill=LIGHT_GOLD)
    
    # Elegant gold accent line
    line_w = 140
    line_y = s_y + 65
    draw.line([(center_x - line_w / 2, line_y), (center_x + line_w / 2, line_y)], fill=SOLAR_GOLD, width=4)
    
    # Footer
    footer_text = "Radical Engineering BD • Staff Portal"
    f_bbox = footer_font.getbbox(footer_text)
    f_w = f_bbox[2] - f_bbox[0]
    draw.text((center_x - f_w / 2, height - 170), footer_text, font=footer_font, fill=MUTED_TEXT)
    
    img.save("assets/splash.png", "PNG")
    print("Regenerated assets/splash.png (1284x2778)")

if __name__ == "__main__":
    generate_favicon()
    generate_icon()
    generate_adaptive_icon()
    generate_splash()
