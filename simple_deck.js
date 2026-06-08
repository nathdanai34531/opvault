// Simple Deck Builder Logic
let simpleDeckCards = [];
let fullCardCatalog = null;

async function loadCardCatalog() {
    if (fullCardCatalog) return;
    try {
        const response = await fetch('card_catalog.json');
        if (response.ok) {
            const data = await response.json();
            fullCardCatalog = Array.isArray(data) ? data : Object.values(data);
        } else {
            console.error('Failed to load card_catalog.json');
            fullCardCatalog = window.cards || []; // Fallback to inventory
        }
    } catch (e) {
        console.error(e);
        fullCardCatalog = window.cards || [];
    }
}

function toggleSimpleDeck() {
    const modal = document.getElementById('simple-deck-modal');
    if (!modal) return;
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        // Mobile slide up, Desktop fade in
        setTimeout(() => {
            modal.querySelector('.transform').classList.remove('translate-y-full', 'opacity-0', 'md:scale-95');
            modal.querySelector('.transform').classList.add('translate-y-0', 'opacity-100', 'md:scale-100');
        }, 10);
        loadCardCatalog(); // Preload catalog when opened
    } else {
        modal.querySelector('.transform').classList.remove('translate-y-0', 'opacity-100', 'md:scale-100');
        modal.querySelector('.transform').classList.add('translate-y-full', 'opacity-0', 'md:scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

async function buildSimpleDeck() {
    const input = document.getElementById('simple-deck-input').value;
    if (!input.trim()) return;
    
    const btn = document.querySelector('#simple-deck-modal button[onclick="buildSimpleDeck()"]');
    const ogText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> กำลังโหลด...`;
    btn.disabled = true;

    try {
        await loadCardCatalog();

        const lines = input.split('\n');
        simpleDeckCards = [];
        const notFound = [];
        
        lines.forEach(line => {
            let text = line.trim().toUpperCase();
            if(!text) return;
            
            let qty = 1;
            const match = text.match(/^(\d+)[Xx\s]+(.+)$/);
            if (match) {
                qty = parseInt(match[1]);
                text = match[2].trim();
            }
            
            let foundCard = fullCardCatalog.find(c => (c.code || '').toUpperCase() === text || (c.cardCode || '').toUpperCase() === text);
            
            if (foundCard) {
                simpleDeckCards.push({
                    card: foundCard,
                    qty: qty
                });
            } else {
                notFound.push(text);
            }
        });
        
        renderSimpleDeck();
        
        if (notFound.length > 0) {
            alert("ไม่พบรหัสการ์ดเหล่านี้ในระบบ:\n" + notFound.join('\n'));
        }
    } catch (err) {
        console.error("Deck builder error:", err);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

function renderSimpleDeck() {
    const container = document.getElementById('simple-deck-grid');
    const renderArea = document.getElementById('simple-deck-render-area');
    const saveBtn = document.getElementById('save-deck-btn');
    
    container.innerHTML = '';
    
    let totalCards = 0;
    
    if (simpleDeckCards.length === 0) {
        renderArea.classList.add('hidden');
        saveBtn.classList.add('hidden');
        document.getElementById('simple-deck-count').innerText = `เด็คของคุณ (0 ใบ)`;
        return;
    }
    
    renderArea.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    
    // Create elements
    simpleDeckCards.forEach(item => {
        totalCards += item.qty;
        
        // Loop to render individual cards or group them? 
        // For deck builder, usually it's stacked or grouped. 
        // Simple way: show 1 image with a quantity badge.
        
        const cardWrapper = document.createElement('div');
        cardWrapper.className = "relative m-1 shrink-0 w-[50px] sm:w-[60px] md:w-[70px]";
        
        const img = document.createElement('img');
        // Use optimized image if available from app.js, otherwise fallback to raw image
        let imgSrc = item.card.image;
        if (typeof getOptimizedImageUrl !== 'undefined') {
            imgSrc = getOptimizedImageUrl(imgSrc, 200);
        }
        img.src = imgSrc;
        img.className = "w-full rounded shadow-sm block";
        // To avoid html2canvas CORS issues, we can try adding crossOrigin
        img.crossOrigin = "anonymous";
        
        cardWrapper.appendChild(img);
        
        if (item.qty > 0) {
            const qtyBadge = document.createElement('div');
            qtyBadge.className = "absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] font-black px-1.5 py-0 rounded border border-gray-700 shadow-md";
            qtyBadge.innerText = `x${item.qty}`;
            cardWrapper.appendChild(qtyBadge);
        }
        
        container.appendChild(cardWrapper);
    });
    
    document.getElementById('simple-deck-count').innerText = `เด็คของคุณ (${totalCards} ใบ)`;
}

async function saveSimpleDeckImage() {
    const element = document.getElementById('simple-deck-render-area');
    const btn = document.getElementById('save-deck-btn');
    const ogText = btn.innerHTML;
    
    btn.innerHTML = 'รอสักครู่...';
    btn.disabled = true;
    
    try {
        if (typeof html2canvas === 'undefined') {
            throw new Error("html2canvas is not loaded");
        }
        
        // Ensure all images are loaded before taking screenshot
        const images = element.querySelectorAll('img');
        await Promise.all(Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if error
            });
        }));

        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: '#111827', // bg-gray-900
            useCORS: true,
            allowTaint: true,
            logging: false
        });
        
        const link = document.createElement('a');
        link.download = 'opvault-deck.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาดในการบันทึกรูป: ' + e.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}
