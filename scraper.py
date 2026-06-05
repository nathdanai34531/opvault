import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import json
import time

# List of all series IDs from the Thai official site
SERIES_IDS = [
    # Boosters OP01 - OP16
    "563101", "563102", "563103", "563104", "563105", "563106", "563107", "563108",
    "563109", "563110", "563111", "563112", "563113", "563114", "563115", "563116",
    # Extra Boosters & Premium
    "563201", "563202", "563203", "563204", "563301", "563302",
    # Starter Decks ST01 - ST30
    "563001", "563002", "563003", "563004", "563005", "563006", "563007", "563008",
    "563009", "563010", "563011", "563012", "563013", "563014", "563015", "563016",
    "563017", "563018", "563019", "563020", "563021", "563022", "563023", "563024",
    "563025", "563026", "563027", "563028", "563029", "563030",
    # Promos
    "563901", "563801", "563701"
]

catalog = {}

def scrape_series(series_id):
    url = f"https://asia-th.onepiece-cardgame.com/cardlist/?series={series_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    try:
        print(f"Fetching Series {series_id}...")
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            soup = BeautifulSoup(html, 'lxml')
            
            cards = soup.find_all('dl', class_='modalCol')
            if not cards:
                print(f"  No cards found for {series_id}.")
                return
                
            print(f"  Found {len(cards)} cards.")
            count = 0
            
            for card in cards:
                info_spans = card.select('.infoCol span')
                if not info_spans: continue
                
                code = info_spans[0].text.strip()
                rarity = info_spans[1].text.strip() if len(info_spans) > 1 else ""
                card_type = info_spans[2].text.strip() if len(info_spans) > 2 else ""
                
                name_el = card.select_one('.cardName')
                name = name_el.text.strip() if name_el else ""
                
                img_el = card.select_one('.frontCol img.lazy')
                img_src = img_el.get('data-src', '') if img_el else ""
                if img_src.startswith('../'):
                    img_src = img_src.replace('../', 'https://asia-th.onepiece-cardgame.com/')
                elif img_src.startswith('/'):
                    img_src = 'https://asia-th.onepiece-cardgame.com' + img_src
                
                if '?' in img_src:
                    img_src = img_src.split('?')[0]
                    
                def extract_detail(css_class):
                    el = card.select_one(f'.{css_class}')
                    if el:
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
                
                text_el = card.select_one('.text')
                effect_text = ""
                if text_el:
                    h3 = text_el.find('h3')
                    if h3: h3.decompose()
                    for br in text_el.find_all('br'):
                        br.replace_with('\n')
                    effect_text = text_el.text.strip()
                
                color_map = {
                    'แดง': 'Red', 'เขียว': 'Green', 'น้ำเงิน': 'Blue', 
                    'ม่วง': 'Purple', 'ดำ': 'Black', 'เหลือง': 'Yellow'
                }
                mapped_colors = []
                for th_color, en_color in color_map.items():
                    if th_color in color:
                        mapped_colors.append(en_color)
                final_color = "/".join(mapped_colors) if mapped_colors else color
                
                # Use code + rarity as key if we want to differentiate parallel arts,
                # but currently the ID is OP16-001 or OP16-001_p1. The HTML id attribute is best!
                card_id_attr = card.get('id', code)
                
                catalog[card_id_attr] = {
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
                count += 1
            print(f"  Added {count} items.")
            
    except Exception as e:
        print(f"Error on {series_id}: {e}")

# Run for all series
print("Starting massive scrape...")
for s_id in SERIES_IDS:
    scrape_series(s_id)
    time.sleep(0.5) # Gentle delay to not overload Bandai

with open('card_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(catalog, f, ensure_ascii=False, indent=2)
    
print(f"SUCCESS! Master catalog built with {len(catalog)} total cards.")
