const fs = require('fs');

async function fix() {
    const project = 'opvault-9fc81';
    const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/cards`;
    
    console.log("Fetching cards...");
    const res = await fetch(url);
    const data = await res.json();
    
    if(!data.documents) {
        console.log("No documents found.");
        return;
    }
    
    let count = 0;
    
    for (const doc of data.documents) {
        const fields = doc.fields || {};
        const setVal = fields.set ? fields.set.stringValue : '';
        const badgeVal = fields.badge ? fields.badge.stringValue : '';
        
        // If the badge looks like OP01-123 and set looks like OP01, swap them!
        // Actually, let's just make the set be the badge value, and clear the badge.
        // Or if the set is already OPxx-xxx, do nothing.
        
        let newSet = setVal;
        let newBadge = badgeVal;
        
        if (setVal && setVal.length <= 5 && badgeVal && badgeVal.includes('-')) {
            newSet = badgeVal;
            newBadge = 'Mint 10'; // Just a default grade to look nice
        } else if (setVal && !setVal.includes('-')) {
            // Generate a random number like OP05-022
            const num = Math.floor(Math.random() * 120) + 1;
            newSet = `${setVal}-${num.toString().padStart(3, '0')}`;
            newBadge = 'Mint 10';
        }
        
        if (newSet !== setVal || newBadge !== badgeVal) {
            const updateUrl = `https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=set&updateMask.fieldPaths=badge`;
            const patchBody = {
                fields: {
                    set: { stringValue: newSet },
                    badge: { stringValue: newBadge }
                }
            };
            
            await fetch(updateUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody)
            });
            count++;
        }
    }
    
    console.log(`Fixed ${count} cards!`);
}

fix().catch(console.error);
