import urllib.request
import json
import random

project_id = "opvault-9fc81"
base_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/cards"

# Fetch all cards
req = urllib.request.Request(base_url)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
except Exception as e:
    print(f"Failed to fetch cards: {e}")
    exit(1)

documents = data.get('documents', [])
if not documents:
    print("No cards found.")
    exit(0)

local_images = [
    "images/card1.png",
    "images/card2.png",
    "images/card3.png",
    "images/card4.png",
    "images/card5.png",
    "images/card6.png",
    "images/card7.png",
    "images/card8.png",
    "images/card9.png"
]

badge_image_map = {}
count = 0

for doc in documents:
    name_path = doc['name']
    fields = doc.get('fields', {})
    
    badge = fields.get('badge', {}).get('stringValue', '')
    
    if badge not in badge_image_map:
        badge_image_map[badge] = random.choice(local_images)
        
    new_image = badge_image_map[badge]
    
    # We need to use the PATCH method to update the image field.
    update_url = f"https://firestore.googleapis.com/v1/{name_path}?updateMask.fieldPaths=image"
    
    patch_data = {
        "fields": {
            "image": {
                "stringValue": new_image
            }
        }
    }
    
    patch_req = urllib.request.Request(update_url, data=json.dumps(patch_data).encode('utf-8'), method='PATCH')
    patch_req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(patch_req) as p_res:
            pass
        count += 1
    except Exception as e:
        print(f"Failed to update {name_path}: {e}")

print(f"Successfully updated {count} cards with local images!")
