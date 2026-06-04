const fs = require('fs');

async function seed() {
    const project = 'opvault-9fc81';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/cards`;

    const templates = [
        { name: 'Boa Hancock', set: 'OP12-014', rarity: 'SR', color: 'red', image: 'images/card1.png', badge: 'Mint 10' },
        { name: 'Roronoa Zoro', set: 'OP01-025', rarity: 'SR', color: 'green', image: 'images/card2.png', badge: 'PSA 9' },
        { name: 'Boa Hancock', set: 'OP01-078', rarity: 'SEC', color: 'blue', image: 'images/card3.png', badge: 'Mint 10' },
        { name: 'Uta', set: 'OP02-120', rarity: 'SEC', color: 'green', image: 'images/card4.png', badge: 'BGS 9.5' },
        { name: 'Kozuki Hiyori', set: 'OP06-106', rarity: 'SEC', color: 'yellow', image: 'images/card5.png', badge: 'Mint 10' }
    ];

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    function generateCode() {
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    let count = 0;
    
    // We will insert 20 cards total, randomly picking from the 5 templates
    for (let i = 0; i < 20; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const id = Date.now() + i;
        const code = generateCode();
        
        const price = Math.floor(Math.random() * 50) * 100 + 500; // 500 to 5500
        
        const docName = `?documentId=${id}`;
        
        const payload = {
            fields: {
                id: { integerValue: id.toString() },
                code: { stringValue: code },
                name: { stringValue: template.name },
                set: { stringValue: template.set },
                badge: { stringValue: template.badge },
                rarity: { stringValue: template.rarity },
                color: { stringValue: template.color },
                price: { integerValue: price.toString() },
                image: { stringValue: template.image }
            }
        };
        
        try {
            const res = await fetch(baseUrl + docName, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if(res.ok) count++;
        } catch(e) {
            console.error("Error inserting", e);
        }
    }
    
    console.log(`Successfully added ${count} duplicate cards!`);
}

seed().catch(console.error);
