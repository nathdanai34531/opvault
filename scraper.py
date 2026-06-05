import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import json
import re

# Series IDs from Thai official site (example: OP-16 is 563116, OP-01 is 563101, etc.
# We will just scrape a single URL passed as argument for now, or define a list.
url = "https://asia-th.onepiece-cardgame.com/cardlist/?series=563116"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
catalog = {}

try:
    print(f"Fetching {url} ...")
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        soup = BeautifulSoup(html, 'lxml')
        
        cards = soup.find_all('dl', class_='modalCol')
        print(f"Found {len(cards)} cards.")
        
        for card in cards:
            # 1. Code, Rarity, Type
            info_spans = card.select('.infoCol span')
            if not info_spans: continue
            
            code = info_spans[0].text.strip()
            rarity = info_spans[1].text.strip() if len(info_spans) > 1 else ""
            card_type = info_spans[2].text.strip() if len(info_spans) > 2 else ""
            
            # 2. Name
            name_el = card.select_one('.cardName')
            name = name_el.text.strip() if name_el else ""
            
            # 3. Image
            img_el = card.select_one('.frontCol img.lazy')
            img_src = img_el.get('data-src', '') if img_el else ""
            if img_src.startswith('../'):
                img_src = img_src.replace('../', 'https://asia-th.onepiece-cardgame.com/')
            elif img_src.startswith('/'):
                img_src = 'https://asia-th.onepiece-cardgame.com' + img_src
            
            # Remove timestamp query param like ?260525
            if '?' in img_src:
                img_src = img_src.split('?')[0]
                
            # 4. Details (Cost, Attribute, Power, Counter, Color)
            def extract_detail(css_class):
                el = card.select_one(f'.{css_class}')
                if el:
                    # Remove the <h3> label (e.g. <h3>ไลฟ์</h3>)
                    h3 = el.find('h3')
                    if h3: h3.decompose()
                    return el.text.strip()
                return "-"
                
            cost = extract_detail('cost')
            attribute = extract_detail('attribute')
            power = extract_detail('power')
            counter = extract_detail('counter')
            color = extract_detail('color')
            feature = extract_detail('feature')
            
            # 5. Effect Text
            text_el = card.select_one('.text')
            effect_text = ""
            if text_el:
                h3 = text_el.find('h3')
                if h3: h3.decompose()
                # Replace <br> with \n
                for br in text_el.find_all('br'):
                    br.replace_with('\n')
                effect_text = text_el.text.strip()
            
            # Parse color to English for standardizing (optional, but good for UI)
            color_map = {
                'แดง': 'Red', 'เขียว': 'Green', 'น้ำเงิน': 'Blue', 
                'ม่วง': 'Purple', 'ดำ': 'Black', 'เหลือง': 'Yellow'
            }
            # Handle multi-colors like "แดง/เหลือง"
            mapped_colors = []
            for th_color, en_color in color_map.items():
                if th_color in color:
                    mapped_colors.append(en_color)
            final_color = "/".join(mapped_colors) if mapped_colors else color
            
            catalog[code] = {
                "name": name,
                "code": code,
                "rarity": rarity,
                "type": card_type,
                "image": img_src,
                "cost": cost,
                "attribute": attribute,
                "power": power,
                "counter": counter,
                "color": final_color,
                "feature": feature,
                "effect": effect_text
            }
            
    # Save to JSON
    with open('card_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully saved {len(catalog)} cards to card_catalog.json")

except Exception as e:
    print(f"Error: {e}")
