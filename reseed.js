const fs = require('fs');

async function seed() {
    const project = 'opvault-9fc81';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/cards`;

    // First, fetch existing cards to delete them
    try {
        const res = await fetch(baseUrl);
        if (res.ok) {
            const data = await res.json();
            const docs = data.documents || [];
            console.log(`Found ${docs.length} existing cards. Deleting them...`);
            for (const doc of docs) {
                await fetch(`https://firestore.googleapis.com/v1/${doc.name}`, { method: 'DELETE' });
            }
        }
    } catch (e) {
        console.error("Error fetching/deleting existing cards", e);
    }

    const images = [];
    for (let i = 1; i <= 9; i++) {
        images.push(`images/card${i}.png`);
    }

    const baseTemplates = [
        { name: 'Monkey D. Luffy', set: 'OP01-1273', rarity: 'UC', color: 'red' },
        { name: 'Sabo', set: 'OP01-1320', rarity: 'R', color: 'red' },
        { name: 'Sabo', set: 'OP04-2765', rarity: 'C', color: 'purple' },
        { name: 'Whitebeard', set: 'ST22-003', rarity: 'SR', color: 'blue' },
        { name: 'Franky', set: 'OP08-049', rarity: 'R', color: 'red' },
        { name: 'Boa Hancock', set: 'OP12-014', rarity: 'SR', color: 'red' },
        { name: 'Roronoa Zoro', set: 'OP01-025', rarity: 'SR', color: 'green' },
        { name: 'Uta', set: 'OP02-120', rarity: 'SEC', color: 'green' },
        { name: 'Kozuki Hiyori', set: 'OP06-106', rarity: 'SEC', color: 'yellow' }
    ];

    // Map each unique 'set' (code) to one specific image
    const codeToImage = {};
    for (let i = 0; i < baseTemplates.length; i++) {
        codeToImage[baseTemplates[i].set] = images[i % images.length];
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    function generateCode() {
        let result = '#';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    let count = 0;
    
    // We will insert 20 cards total, randomly picking from the templates
    for (let i = 0; i < 20; i++) {
        const template = baseTemplates[Math.floor(Math.random() * baseTemplates.length)];
        const id = Date.now() + i;
        const code = generateCode();
        
        // Random price between 500 and 85,000
        const price = Math.floor(Math.random() * 800) * 100 + 500;
        const image = codeToImage[template.set];
        
        const docName = `?documentId=${id}`;
        
        const payload = {
            fields: {
                id: { integerValue: id.toString() },
                code: { stringValue: code },
                name: { stringValue: template.name },
                set: { stringValue: template.set },
                badge: { stringValue: '' },
                rarity: { stringValue: template.rarity },
                color: { stringValue: template.color },
                price: { integerValue: price.toString() },
                image: { stringValue: image }
            }
        };
        
        try {
            const res = await fetch(baseUrl + docName, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) count++;
        } catch(e) {
            console.error("Error inserting", e);
        }
    }
    
    console.log(`Successfully added ${count} new cards with proper image mapping!`);
}

seed().catch(console.error);
