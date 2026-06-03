if (localStorage.getItem('isAdminVisible') !== 'true') {
    window.location.href = 'index.html';
}

let cards = [];
let history = [];
let credits = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        db.collection("cards").onSnapshot(snap => {
            cards = [];
            snap.forEach(doc => cards.push({ ...doc.data(), id: parseInt(doc.id) }));
            renderAdminCards();
        });
        
        db.collection("history").onSnapshot(snap => {
            history = [];
            snap.forEach(doc => history.push({ ...doc.data(), id: parseInt(doc.id) }));
            history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            renderAdminHistory();
            updateDashboard();
        });
        
        db.collection("credits").onSnapshot(snap => {
            credits = [];
            snap.forEach(doc => credits.push({ ...doc.data(), id: parseInt(doc.id) }));
            renderAdminCredits();
        });

        // Run migration in background
        (async () => {
            try {
                if (!localStorage.getItem('migrated_to_firestore_admin')) {
                    const localHistory = JSON.parse(localStorage.getItem('opvault_history')) || [];
                    if (localHistory.length > 0) {
                        console.log("Migrating history...");
                        for (const h of localHistory) {
                            await db.collection("history").doc(h.id.toString()).set(h);
                        }
                    }
                    localStorage.setItem('migrated_to_firestore_admin', 'true');
                }
                
                try {
                    if (!localStorage.getItem('cleaned_samples_v2')) {
                        console.log("Cleaning up sample cards from Admin...");
                        const snapshot = await db.collection("cards").get();
                        let sampleCount = 0;
                        const batch = db.batch();
                        let batchCount = 0;
                        
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.image && data.image.startsWith('images/card')) {
                                sampleCount++;
                                if (sampleCount > 5) {
                                    batch.delete(doc.ref);
                                    batchCount++;
                                }
                            }
                        });
                        
                        if (batchCount > 0) {
                            await batch.commit();
                        }
                        localStorage.setItem('cleaned_samples_v2', 'true');
                        console.log("Cleaned up " + batchCount + " sample cards!");
                    }
                } catch (e) {
                    console.warn("Sample cleanup failed:", e);
                }

                try {
                    if (!localStorage.getItem('migrated_codes_to_8_chars')) {
                        console.log("Updating old card codes...");
                        const snapshot = await db.collection("cards").get();
                        const batch = db.batch();
                        let updated = 0;
                        snapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.code && data.code.length > 8) {
                                batch.update(doc.ref, { code: generateCode(data.id) });
                                updated++;
                            }
                        });
                        if (updated > 0) {
                            await batch.commit();
                        }
                        localStorage.setItem('migrated_codes_to_8_chars', 'true');
                        console.log("Updated codes for " + updated + " cards!");
                    }
                } catch (e) {
                    console.warn("Code migration failed:", e);
                }
            } catch (e) {
                console.warn(e);
            }
        })();
    } catch(e) {
        console.error("Admin Firebase Init Error", e);
    }
});

let selectedCards = new Set();
let currentSearchTerm = '';

function getOptimizedImageUrl(url, width = 300) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return url;
    
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('onepiece-cardgame.com') || urlObj.hostname.includes('limitlesstcg')) {
            return `https://cdn.statically.io/img/${urlObj.hostname}${urlObj.pathname}?w=${width}&q=80`;
        }
    } catch(e) {}
    
    const cleanUrl = url.replace(/^https?:\/\//, '');
    return `https://i2.wp.com/${cleanUrl}?w=${width}&quality=80&strip=all`;
}

function updateDashboard() {
    let todaySales = 0;
    let monthSales = 0;
    let totalCardsSold = 0;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    history.forEach(order => {
        const orderTime = new Date(order.date).getTime();
        const itemCount = order.items.reduce((sum, item) => sum + (item.qty || 1), 0);
        totalCardsSold += itemCount;
        
        if (orderTime >= startOfToday) {
            todaySales += order.total;
        }
        if (orderTime >= startOfMonth) {
            monthSales += order.total;
        }
    });
    
    const dashToday = document.getElementById('dash-today-sales');
    const dashMonth = document.getElementById('dash-month-sales');
    const dashTotal = document.getElementById('dash-total-cards');
    
    if (dashToday) dashToday.textContent = formatPrice(todaySales);
    if (dashMonth) dashMonth.textContent = formatPrice(monthSales);
    if (dashTotal) dashTotal.textContent = totalCardsSold + ' ใบ';
}

function formatPrice(num) {
    return num.toLocaleString() + ' ฿';
}

function generateCode(timestamp) {
    // 8-character random alphanumeric code (excluding confusing characters like O, 0, I, 1)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// onSnapshot takes care of real-time syncing so we don't need to manually update local storage here

function switchTab(tabId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    
    document.getElementById('tab-manage-cards').classList.replace('bg-gray-800', 'hover:bg-gray-800');
    document.getElementById('tab-manage-cards').classList.replace('text-white', 'text-gray-400');
    document.getElementById('tab-history').classList.replace('bg-gray-800', 'hover:bg-gray-800');
    document.getElementById('tab-history').classList.replace('text-white', 'text-gray-400');
    document.getElementById('tab-credits').classList.replace('bg-gray-800', 'hover:bg-gray-800');
    document.getElementById('tab-credits').classList.replace('text-white', 'text-gray-400');
    
    const activeTab = document.getElementById(`tab-${tabId}`);
    activeTab.classList.remove('text-gray-400', 'hover:bg-gray-800');
    activeTab.classList.add('bg-gray-800', 'text-white');

    if(tabId === 'manage-cards') {
        renderAdminCards();
        updateDashboard();
    }
    if(tabId === 'history') renderHistory();
    if(tabId === 'credits') renderAdminCredits();
}

function handleAdminSearch() {
    currentSearchTerm = document.getElementById('admin-search-input').value.trim().toLowerCase();
    renderAdminCards();
}

function parseCartCode() {
    const input = document.getElementById('admin-search-input').value.trim();
    if (!input) return;
    
    // Auto-select cards if their code matches anything in the input
    // Assuming the cart code contains strings like "[12345, 12346]" or "OPV-1234"
    let matchCount = 0;
    cards.forEach(card => {
        if (input.includes(card.code)) {
            selectedCards.add(card.id.toString());
            matchCount++;
        }
    });
    
    if (matchCount > 0) {
        currentSearchTerm = '';
        document.getElementById('admin-search-input').value = '';
        renderAdminCards();
        openOrderSummaryModal();
    } else {
        alert("ไม่พบรหัสการ์ดในข้อความที่วาง (กรุณาเช็คว่ามีรหัสการ์ดตรงกับในสต็อคหรือไม่)");
    }
}

function toggleSelectAllCards() {
    const isChecked = document.getElementById('select-all-cards').checked;
    
    // Only select currently visible (filtered) cards
    const visibleCards = cards.filter(card => {
        if(!currentSearchTerm) return true;
        return (card.name.toLowerCase().includes(currentSearchTerm) || 
                card.set.toLowerCase().includes(currentSearchTerm) || 
                (card.code && card.code.toLowerCase().includes(currentSearchTerm)));
    });

    if (isChecked) {
        visibleCards.forEach(c => selectedCards.add(c.id.toString()));
    } else {
        visibleCards.forEach(c => selectedCards.delete(c.id.toString()));
    }
    
    updateBulkSellBtn();
    
    // Update individual checkboxes
    document.querySelectorAll('.card-checkbox').forEach(cb => {
        cb.checked = isChecked;
    });
}

function toggleCardSelection(id) {
    id = id.toString();
    if (selectedCards.has(id)) {
        selectedCards.delete(id);
    } else {
        selectedCards.add(id);
    }
    updateBulkSellBtn();
    
    // Sync select-all checkbox state
    const visibleCheckboxes = document.querySelectorAll('.card-checkbox');
    const allChecked = visibleCheckboxes.length > 0 && Array.from(visibleCheckboxes).every(cb => cb.checked);
    document.getElementById('select-all-cards').checked = allChecked;
}

function updateBulkSellBtn() {
    const btn = document.getElementById('bulk-sell-btn');
    const count = document.getElementById('bulk-count');
    const delBtn = document.getElementById('bulk-delete-btn');
    const delCount = document.getElementById('bulk-delete-count');
    
    if (selectedCards.size > 0) {
        btn.classList.remove('hidden');
        if(delBtn) delBtn.classList.remove('hidden');
        count.textContent = selectedCards.size;
        if(delCount) delCount.textContent = selectedCards.size;
    } else {
        btn.classList.add('hidden');
        if(delBtn) delBtn.classList.add('hidden');
    }
}

async function bulkDeleteCards() {
    if (selectedCards.size === 0) return;
    
    if (confirm(`คุณต้องการลบการ์ดที่เลือกทั้งหมด ${selectedCards.size} ใบใช่หรือไม่?\n(การลบจะไม่สามารถกู้คืนได้)`)) {
        try {
            const batch = db.batch();
            selectedCards.forEach(id => {
                const ref = db.collection('cards').doc(id.toString());
                batch.delete(ref);
            });
            await batch.commit();
            
            selectedCards.clear();
            document.getElementById('select-all-cards').checked = false;
            updateBulkSellBtn();
            alert("ลบการ์ดที่เลือกสำเร็จแล้ว!");
        } catch(e) {
            console.error("Bulk Delete Error", e);
            alert("เกิดข้อผิดพลาดในการลบการ์ด กรุณาลองใหม่อีกครั้ง");
        }
    }
}

function renderAdminCards() {
    const list = document.getElementById('admin-card-list');
    list.innerHTML = '';
    
    const filteredCards = cards.filter(card => {
        if(!currentSearchTerm) return true;
        return (card.name.toLowerCase().includes(currentSearchTerm) || 
                card.set.toLowerCase().includes(currentSearchTerm) || 
                (card.code && card.code.toLowerCase().includes(currentSearchTerm)));
    });
    
    if (filteredCards.length === 0) {
        list.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">ไม่พบข้อมูลการ์ด</td></tr>`;
        return;
    }
    
    let cardsHtml = '';
    filteredCards.forEach(card => {
        let colorMap = {
            'red': 'bg-red-500',
            'blue': 'bg-blue-500',
            'green': 'bg-green-500',
            'purple': 'bg-purple-500',
            'black': 'bg-gray-800',
            'yellow': 'bg-yellow-400',
            'multi': 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500'
        };
        let colorDot = card.color ? `<div class="w-2.5 h-2.5 rounded-full ${colorMap[card.color] || 'bg-gray-400'} shadow-[0_0_2px_rgba(0,0,0,0.2)] border border-white shrink-0"></div>` : '';

        const isChecked = selectedCards.has(card.id.toString()) ? 'checked' : '';

        let setDisplay = `<span class="text-blue-600">${card.set || '-'}</span>`;
        if (card.set && card.set.includes(' · ')) {
            const parts = card.set.split(' · ');
            setDisplay = `<span class="text-blue-600">${parts[0]}</span> <span class="text-gray-500 font-medium">· ${parts.slice(1).join(' · ')}</span>`;
        } else if (card.rarity) {
            setDisplay = `<span class="text-blue-600">${card.set || '-'}</span> <span class="text-gray-500 font-medium">· ${card.rarity}</span>`;
        }

        cardsHtml += `
            <tr class="hover:bg-gray-50 transition ${isChecked ? 'bg-blue-50/30' : ''}">
                <td class="p-2 md:p-3 text-center align-middle w-10">
                    <input type="checkbox" value="${card.id}" class="card-checkbox rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer w-4 h-4" onchange="toggleCardSelection(${card.id})" ${isChecked}>
                </td>
                <td class="p-2 md:p-3 align-middle" onclick="toggleCardSelection(${card.id}); document.querySelector('.card-checkbox[value=\\'${card.id}\\']').checked = !document.querySelector('.card-checkbox[value=\\'${card.id}\\']').checked;">
                    <div class="relative w-14 h-20 rounded-md shadow-sm border border-gray-200 cursor-pointer overflow-hidden bg-gray-200 inline-block align-middle">
                        <div class="skeleton-sweep absolute inset-0 z-0"></div>
                        <img src="${getOptimizedImageUrl(card.image, 100)}" class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-300" onload="this.classList.remove('opacity-0');" loading="lazy">
                    </div>
                </td>
                <td class="p-2 md:p-3 align-middle" onclick="toggleCardSelection(${card.id}); document.querySelector('.card-checkbox[value=\\'${card.id}\\']').checked = !document.querySelector('.card-checkbox[value=\\'${card.id}\\']').checked;">
                    <div class="font-black text-gray-900 text-base cursor-pointer leading-tight mb-0 line-clamp-1">${card.name}</div>
                    <div class="cursor-pointer flex flex-col gap-1.5">
                        <div class="font-bold text-[12px] tracking-wide uppercase flex items-center gap-1.5">
                            ${colorDot}
                            ${setDisplay}
                        </div>
                        <div class="flex flex-wrap items-center gap-2 mt-0.5">
                            <span class="text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200 font-extrabold text-sm shadow-sm">${formatPrice(card.price)}</span>
                            <span class="text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-gray-100 flex items-center gap-1">
                                <svg class="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                                ${card.code || '-'}
                            </span>
                            ${card.badge ? `<span class="bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">${card.badge}</span>` : ''}
                        </div>
                    </div>
                </td>
                <td class="p-2 md:p-3 text-right align-middle w-24">
                    <div class="flex flex-col gap-3 items-end justify-center pr-1">
                        <button onclick="editCard(${card.id})" class="text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-200 px-4 py-1.5 rounded-full transition-colors font-black text-[13px] shadow-sm w-[70px] text-center">แก้ไข</button>
                        <button onclick="deleteCard(${card.id})" class="text-red-500 hover:text-red-700 transition-colors font-bold text-[12px] underline decoration-red-200 hover:decoration-red-700 w-[70px] text-center">ลบทิ้ง</button>
                    </div>
                </td>
            </tr>
        `;
    });
    list.innerHTML = cardsHtml;
    
    // Sync select-all checkbox
    const visibleCheckboxes = document.querySelectorAll('.card-checkbox');
    const allChecked = visibleCheckboxes.length > 0 && Array.from(visibleCheckboxes).every(cb => cb.checked);
    const selectAllCb = document.getElementById('select-all-cards');
    if(selectAllCb) selectAllCb.checked = allChecked;
    
    updateBulkSellBtn();
}

function renderHistory() {
    const list = document.getElementById('admin-history-list');
    list.innerHTML = '';
    
    // Refresh history from localStorage just in case
    history = JSON.parse(localStorage.getItem('opvault_history')) || [];
    
    if(history.length === 0) {
        list.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500">ยังไม่มีประวัติการซื้อขาย</td></tr>`;
        return;
    }
    
    // Reverse to show newest first
    const reversed = [...history].reverse();
    
    let historyHtml = '';
    reversed.forEach(order => {
        const d = new Date(order.date);
        const dateStr = `${d.toLocaleDateString('th-TH')}<br><span class="text-[8px] md:text-[10px] text-gray-400">${d.toLocaleTimeString('th-TH')}</span>`;
        
        let itemsHtml = order.items.map(i => `<div class="text-xs mb-1 text-gray-600">• ${i.name} (x${i.qty})</div>`).join('');
        
        historyHtml += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="p-2 md:p-4 font-semibold text-gray-700 text-[10px] md:text-sm">${order.id}</td>
                <td class="p-2 md:p-4 text-gray-500 text-[9px] md:text-xs">${dateStr}</td>
                <td class="p-2 md:p-4 text-[10px] md:text-sm">${itemsHtml}</td>
                <td class="p-2 md:p-4 font-bold text-gray-900 text-right text-[10px] md:text-sm">${formatPrice(order.total)}</td>
            </tr>
        `;
    });
    list.innerHTML = historyHtml;
}

function compressCardImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            document.getElementById('card-image-base64').value = dataUrl;
            document.getElementById('card-image').value = dataUrl; // Show preview/URL
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function autoFetchCardData() {
    const cardSetInput = document.getElementById('card-set');
    const cardId = cardSetInput.value.trim().toUpperCase();
    if (!cardId) {
        alert("กรุณากรอกรหัสการ์ด (Card Code) ก่อนดึงข้อมูล");
        return;
    }

    const btn = document.getElementById('btn-fetch-data');
    const status = document.getElementById('fetch-status');
    const originalBtnText = btn.innerHTML;
    
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>กำลังดึง...</span>`;
    btn.disabled = true;
    status.classList.remove('hidden');
    status.classList.remove('text-red-500', 'text-green-500');
    status.classList.add('text-gray-500');
    status.textContent = "กำลังเชื่อมต่อฐานข้อมูล...";

    try {
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const targetUrl = `https://onepiece.limitlesstcg.com/cards/${cardId}`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const html = data.contents;
        
        if (!html || html.includes('Page Not Found') || html.includes('<title>Limitless</title>')) {
             throw new Error('ไม่พบข้อมูลการ์ดนี้ในระบบ');
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract Name
        const nameEl = doc.querySelector('.card-text-name a');
        let cardName = nameEl ? nameEl.textContent.trim() : '';
        if(!cardName) {
            const ogTitle = doc.querySelector('meta[property="og:title"]');
            if(ogTitle) {
                 cardName = ogTitle.getAttribute('content').split('(')[0].trim();
            }
        }

        // Extract Image
        const imgEl = doc.querySelector('meta[property="og:image"]');
        let imageUrl = imgEl ? imgEl.getAttribute('content') : '';
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com' + imageUrl;
        }

        // Extract Color
        const colorSpan = doc.querySelector('.card-text-type span[data-tooltip="Color"]');
        let cardColor = colorSpan ? colorSpan.textContent.trim().toLowerCase() : '';
        
        // Populate Form
        if(cardName) document.getElementById('card-name').value = cardName;
        if(imageUrl) document.getElementById('card-image').value = imageUrl;
        
        if(cardColor) {
            const colorSelect = document.getElementById('card-color');
            const options = Array.from(colorSelect.options).map(o => o.value);
            // check if exact match
            if(options.includes(cardColor)) {
                colorSelect.value = cardColor;
            } else if (cardColor.includes('/')) {
                // Multi-color, for now just pick the first color
                const firstColor = cardColor.split('/')[0];
                if(options.includes(firstColor)) colorSelect.value = firstColor;
            }
        }

        status.textContent = "✅ ดึงข้อมูลสำเร็จ!";
        status.classList.remove('text-gray-500');
        status.classList.add('text-green-500');
        
    } catch (error) {
        console.error("AutoFetch Error:", error);
        status.textContent = "❌ ไม่พบข้อมูล หรือรหัสผิด";
        status.classList.remove('text-gray-500');
        status.classList.add('text-red-500');
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
        
        setTimeout(() => {
            status.classList.add('hidden');
        }, 3000);
    }
}

function openAddModal() {
    document.getElementById('card-form').reset();
    document.getElementById('card-id').value = '';
    const status = document.getElementById('fetch-status');
    if(status) status.classList.add('hidden');
    document.getElementById('card-image-base64').value = '';
    document.getElementById('modal-title').textContent = 'เพิ่มการ์ดใหม่';
    document.getElementById('card-modal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('card-modal').classList.add('hidden');
}

function saveCard() {
    const id = document.getElementById('card-id').value;
    const base64Img = document.getElementById('card-image-base64').value;
    const urlImg = document.getElementById('card-image').value;
    
    const newCard = {
        name: document.getElementById('card-name').value,
        price: parseInt(document.getElementById('card-price').value),
        image: base64Img || urlImg,
        rarity: document.getElementById('card-rarity').value,
        color: document.getElementById('card-color').value,
        set: document.getElementById('card-set').value,
        badge: document.getElementById('card-badge').value
    };
    
    if(!newCard.name || isNaN(newCard.price) || !newCard.image) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
    }
    
    if(id) {
        // Edit
        newCard.id = parseInt(id); // keep original ID type
        const index = cards.findIndex(c => c.id == id);
        if(index !== -1) {
            newCard.code = cards[index].code || generateCode(newCard.id);
            cards[index] = {...cards[index], ...newCard};
        }
    } else {
        // Add
        newCard.id = Date.now();
        newCard.code = generateCode(newCard.id);
        cards.push(newCard);
    }
    
    db.collection('cards').doc(newCard.id.toString()).set(newCard);
    closeAddModal();
}



function editCard(id) {
    const card = cards.find(c => c.id == id);
    if(card) {
        document.getElementById('card-id').value = card.id;
        document.getElementById('card-name').value = card.name;
        document.getElementById('card-price').value = card.price;
        document.getElementById('card-image').value = card.image;
        document.getElementById('card-rarity').value = card.rarity;
        document.getElementById('card-color').value = card.color;
        document.getElementById('card-set').value = card.set || '';
        document.getElementById('card-badge').value = card.badge || '';
        
        document.getElementById('modal-title').textContent = 'แก้ไขข้อมูลการ์ด';
        document.getElementById('card-modal').classList.remove('hidden');
    }
}

function deleteCard(id) {
    if(confirm("ยืนยันการลบการ์ดใบนี้?")) {
        db.collection('cards').doc(id.toString()).delete();
    }
}

// Credit Management
function renderAdminCredits() {
    const list = document.getElementById('admin-credit-list');
    list.innerHTML = '';
    
    credits = JSON.parse(localStorage.getItem('opvault_credits')) || [];
    
    if (credits.length === 0) {
        list.innerHTML = `<div class="col-span-full py-12 text-center text-gray-500 text-sm bg-white rounded-xl border border-gray-200">ยังไม่มีเครดิต</div>`;
        return;
    }

    // Sort by pinned first, then by date descending
    const sorted = [...credits].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.date - a.date;
    });
    
    let creditsHtml = '';
    sorted.forEach(credit => {
        const d = new Date(credit.date);
        const dateStr = d.toLocaleDateString('th-TH');
        
        let imagesHtml = '';
        const images = credit.images || [credit.image];
        
        if (images.length === 1) {
            imagesHtml = `<img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full object-cover" style="height: 240px;" loading="lazy">`;
        } else if (images.length === 2) {
            imagesHtml = `
            <div class="grid grid-cols-2 gap-0.5" style="height: 240px;">
                <img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full h-full object-cover" loading="lazy">
                <img src="${getOptimizedImageUrl(images[1], 400)}" class="w-full h-full object-cover" loading="lazy">
            </div>`;
        } else {
            // 3 or more images
            const extra = images.length - 3;
            imagesHtml = `
            <div class="flex flex-col gap-0.5" style="height: 240px;">
                <img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full h-1/2 object-cover" loading="lazy">
                <div class="grid grid-cols-2 gap-0.5 h-1/2">
                    <img src="${getOptimizedImageUrl(images[1], 400)}" class="w-full h-full object-cover" loading="lazy">
                    <div class="relative w-full h-full">
                        <img src="${getOptimizedImageUrl(images[2], 400)}" class="w-full h-full object-cover" loading="lazy">
                        ${extra > 0 ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[1px]">+${extra}</div>` : ''}
                    </div>
                </div>
            </div>`;
        }
        
        creditsHtml += `
            <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 flex flex-col group relative">
                ${credit.isPinned ? `<div class="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-1 border border-yellow-500/30"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>ปักหมุด</div>` : ''}
                <div class="relative bg-gray-100 overflow-hidden">
                    ${imagesHtml}
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                        <button onclick="togglePinCredit(${credit.id})" class="${credit.isPinned ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-600 hover:bg-gray-700'} text-white p-2 rounded-full shadow-md transform hover:scale-110 transition" title="ปักหมุด">
                            <svg class="w-4 h-4" fill="${credit.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                        </button>
                        <button onclick="editCredit(${credit.id})" class="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-md transform hover:scale-110 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="deleteCredit(${credit.id})" class="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-md transform hover:scale-110 transition">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="p-3">
                    ${credit.desc ? `<div class="text-xs font-bold text-gray-800 line-clamp-3 whitespace-pre-line leading-relaxed">${credit.desc}</div>` : ''}
                    <div class="text-[10px] text-gray-400 mt-1 flex gap-1 items-center">
                        <span>อัปโหลดเมื่อ</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
    });
    list.innerHTML = creditsHtml;
}

let currentUploadFiles = [];
let existingCreditImages = [];

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    currentUploadFiles = currentUploadFiles.concat(files);
    event.target.value = ''; // Reset so the same file can be selected again
    renderPreviews();
}

function removeFile(index, isExisting) {
    if (isExisting) {
        existingCreditImages.splice(index, 1);
    } else {
        currentUploadFiles.splice(index, 1);
    }
    renderPreviews();
}

function renderPreviews() {
    const container = document.getElementById('image-previews');
    if (!container) return;
    container.innerHTML = '';
    
    let previewsHtml = '';
    existingCreditImages.forEach((base64, index) => {
        previewsHtml += `
            <div class="relative w-16 h-16 rounded overflow-hidden border border-gray-200 shrink-0 group">
                <img src="${base64}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center gap-1">
                    <button type="button" onclick="openImageEditor(${index}, true)" class="bg-blue-500 text-white rounded-full p-1.5 shadow-sm tap-effect">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button type="button" onclick="removeFile(${index}, true)" class="bg-red-500 text-white rounded-full p-1.5 shadow-sm tap-effect">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        `;
    });

    currentUploadFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        previewsHtml += `
            <div class="relative w-16 h-16 rounded overflow-hidden border border-green-300 shrink-0 group">
                <img src="${url}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center gap-1">
                    <button type="button" onclick="openImageEditor(${index}, false)" class="bg-blue-500 text-white rounded-full p-1.5 shadow-sm tap-effect">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button type="button" onclick="removeFile(${index}, false)" class="bg-red-500 text-white rounded-full p-1.5 shadow-sm tap-effect">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = previewsHtml;
}

function openCreditModal() {
    document.getElementById('credit-form').reset();
    document.getElementById('credit-id').value = '';
    currentUploadFiles = [];
    existingCreditImages = [];
    renderPreviews();
    document.getElementById('credit-modal').classList.remove('hidden');
}

function editCredit(id) {
    const credit = credits.find(c => c.id == id);
    if(credit) {
        document.getElementById('credit-id').value = credit.id;
        document.getElementById('credit-desc').value = credit.desc || '';
        document.getElementById('credit-file').value = '';
        currentUploadFiles = [];
        existingCreditImages = credit.images ? [...credit.images] : (credit.image ? [credit.image] : []);
        renderPreviews();
        document.getElementById('credit-modal').classList.remove('hidden');
    }
}

function closeCreditModal() {
    document.getElementById('credit-modal').classList.add('hidden');
}

function saveCredit() {
    const id = document.getElementById('credit-id').value;
    const desc = document.getElementById('credit-desc').value;
    
    if (existingCreditImages.length === 0 && currentUploadFiles.length === 0) {
        alert("กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
        return;
    }

    const btn = document.querySelector('#credit-modal .bg-green-600');
    let originalText = "อัปโหลด";
    if (btn) {
        originalText = btn.innerHTML;
        btn.innerHTML = "กำลังบันทึก...";
        btn.disabled = true;
    }

    Promise.all(currentUploadFiles.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsDataURL(file);
        });
    })).then(newBase64Images => {
        const allImages = [...existingCreditImages, ...newBase64Images];
        
        if (id) {
            const index = credits.findIndex(c => c.id == id);
            if(index !== -1) {
                credits[index].desc = desc;
                credits[index].images = allImages;
                delete credits[index].image; // cleanup
            }
        } else {
            const newCredit = {
                id: Date.now(),
                date: Date.now(),
                desc: desc,
                images: allImages
            };
            credits.push(newCredit);
        }
        
        db.collection('credits').doc(newCredit.id.toString()).set(newCredit);
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        
        renderAdminCredits();
        closeCreditModal();
    }).catch(error => {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

window.deleteCredit = function(id) {
    if (confirm('ยืนยันการลบเครดิตนี้?')) {
        db.collection('credits').doc(id.toString()).delete();
    }
}

window.togglePinCredit = function(id) {
    const idx = credits.findIndex(c => c.id === id);
    if (idx !== -1) {
        const newStatus = !credits[idx].isPinned;
        db.collection('credits').doc(id.toString()).update({ isPinned: newStatus });
    }
}

// Init
// Removed to allow skeleton loaders to show until Firebase loads data
updateDashboard();
// ---------------- Image Editor / Mosaic Logic ----------------

let editorCanvas, editorCtx;
let isDrawing = false;
let currentEditorImg = null;
let currentEditorIndex = -1;
let isExistingEditorImage = false;
let undoStack = [];

function openImageEditor(index, isExisting) {
    currentEditorIndex = index;
    isExistingEditorImage = isExisting;
    
    editorCanvas = document.getElementById('editor-canvas');
    editorCtx = editorCanvas.getContext('2d', { willReadFrequently: true });
    
    const src = isExisting ? existingCreditImages[index] : URL.createObjectURL(currentUploadFiles[index]);
    
    currentEditorImg = new Image();
    currentEditorImg.onload = () => {
        // Set canvas size to match image intrinsic dimensions (so it edits at 1:1 scale)
        // CSS max-w-full and object-contain will scale it down visually on screen
        editorCanvas.width = currentEditorImg.width;
        editorCanvas.height = currentEditorImg.height;
        
        editorCtx.drawImage(currentEditorImg, 0, 0);
        
        rectangles = [];
        
        // Save initial state to undo stack
        undoStack = [JSON.parse(JSON.stringify(rectangles))];
        updateUndoButton();
        
        document.getElementById('image-editor-modal').classList.remove('hidden');
    };
    currentEditorImg.src = src;
}

function closeImageEditor() {
    document.getElementById('image-editor-modal').classList.add('hidden');
    undoStack = [];
    rectangles = [];
}

function undoEditor() {
    if (undoStack.length > 1) {
        undoStack.pop(); // remove current state
        rectangles = JSON.parse(JSON.stringify(undoStack[undoStack.length - 1]));
        renderEditorCanvas();
        updateUndoButton();
    }
}

function updateUndoButton() {
    const btn = document.getElementById('editor-undo-btn');
    if (btn) {
        btn.disabled = undoStack.length <= 1;
    }
}

// Drawing Logic
let rectangles = [];
let isCreatingBox = false;
let isDraggingBox = false;
let draggedBoxIndex = -1;
let dragOffsetX = 0;
let dragOffsetY = 0;

let drawStartX = 0;
let drawStartY = 0;

function renderEditorCanvas() {
    // Redraw base image
    editorCtx.drawImage(currentEditorImg, 0, 0);
    
    // Draw all rectangles
    editorCtx.fillStyle = '#111827'; // Dark gray/black color
    rectangles.forEach(rect => {
        editorCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
    });
}

function getPointerPos(e) {
    const rect = editorCanvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const scaleX = editorCanvas.width / rect.width;
    const scaleY = editorCanvas.height / rect.height;
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    e.preventDefault();
    const pos = getPointerPos(e);
    
    // Check if clicked inside an existing rectangle (iterate backwards to select top-most)
    draggedBoxIndex = -1;
    for (let i = rectangles.length - 1; i >= 0; i--) {
        const r = rectangles[i];
        // Normalize rect coordinates for checking (in case w/h are negative)
        const rx = r.w < 0 ? r.x + r.w : r.x;
        const ry = r.h < 0 ? r.y + r.h : r.y;
        const rw = Math.abs(r.w);
        const rh = Math.abs(r.h);
        
        if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) {
            draggedBoxIndex = i;
            break;
        }
    }
    
    if (draggedBoxIndex !== -1) {
        // Start dragging
        isDraggingBox = true;
        dragOffsetX = pos.x - rectangles[draggedBoxIndex].x;
        dragOffsetY = pos.y - rectangles[draggedBoxIndex].y;
    } else {
        // Start creating
        isCreatingBox = true;
        drawStartX = pos.x;
        drawStartY = pos.y;
        
        // Add a temporary rect to the array
        rectangles.push({ x: drawStartX, y: drawStartY, w: 0, h: 0 });
    }
}

function drawBlackoutBox(e) {
    if (!isCreatingBox && !isDraggingBox) return;
    e.preventDefault();
    
    const pos = getPointerPos(e);
    
    if (isDraggingBox) {
        // Update position of the dragged box
        rectangles[draggedBoxIndex].x = pos.x - dragOffsetX;
        rectangles[draggedBoxIndex].y = pos.y - dragOffsetY;
    } else if (isCreatingBox) {
        // Update dimensions of the new box (last in array)
        const currentRect = rectangles[rectangles.length - 1];
        currentRect.w = pos.x - drawStartX;
        currentRect.h = pos.y - drawStartY;
    }
    
    renderEditorCanvas();
}

function stopDrawing() {
    if (isCreatingBox || isDraggingBox) {
        isCreatingBox = false;
        isDraggingBox = false;
        
        // Normalize the created rectangle (ensure positive width/height)
        if (rectangles.length > 0) {
            const lastRect = rectangles[rectangles.length - 1];
            if (lastRect.w < 0) {
                lastRect.x += lastRect.w;
                lastRect.w = Math.abs(lastRect.w);
            }
            if (lastRect.h < 0) {
                lastRect.y += lastRect.h;
                lastRect.h = Math.abs(lastRect.h);
            }
            
            // Remove if it's too small (accidental click)
            if (lastRect.w < 5 && lastRect.h < 5) {
                rectangles.pop();
                renderEditorCanvas();
                return;
            }
        }
        
        // Save state to undo stack
        undoStack.push(JSON.parse(JSON.stringify(rectangles)));
        updateUndoButton();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cvs = document.getElementById('editor-canvas');
    if (cvs) {
        cvs.addEventListener('mousedown', startDrawing);
        cvs.addEventListener('mousemove', drawBlackoutBox);
        cvs.addEventListener('mouseup', stopDrawing);
        cvs.addEventListener('mouseout', stopDrawing);
        
        cvs.addEventListener('touchstart', startDrawing, {passive: false});
        cvs.addEventListener('touchmove', drawBlackoutBox, {passive: false});
        cvs.addEventListener('touchend', stopDrawing);
        cvs.addEventListener('touchcancel', stopDrawing);
    }
});

function saveImageEditor() {
    const dataUrl = editorCanvas.toDataURL('image/jpeg', 0.9);
    
    if (isExistingEditorImage) {
        existingCreditImages[currentEditorIndex] = dataUrl;
    } else {
        // Replace the File object with a base64 string
        // We'll convert the array element to a string, then saveCredit will handle mixed array (Files + Strings)
        // Wait, handleFileSelect pushes File objects.
        // We can just create a File from the dataUrl to keep it uniform, or let saveCredit handle it.
        // saveCredit converts Files to base64, so let's write a small helper to convert base64 back to File:
        const file = dataURLtoFile(dataUrl, currentUploadFiles[currentEditorIndex].name);
        currentUploadFiles[currentEditorIndex] = file;
    }
    
    renderPreviews();
    closeImageEditor();
}

function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
        
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, {type:mime});
}

// --- Order Summary & Bulk Operations ---
function openOrderSummaryModal() {
    if (selectedCards.size === 0) return;
    
    const list = document.getElementById('order-items-list');
    list.innerHTML = '';
    
    let subtotal = 0;
    let orderHtml = '';
    
    cards.forEach(card => {
        if (selectedCards.has(card.id.toString())) {
            subtotal += card.price;
            orderHtml += `
                <div class="p-3 flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                    <div class="flex items-center gap-3 overflow-hidden flex-1">
                        <div class="relative w-10 h-14 rounded shadow-sm border border-gray-200 shrink-0 overflow-hidden bg-gray-200">
                            <div class="skeleton-sweep absolute inset-0 z-0"></div>
                            <img src="${getOptimizedImageUrl(card.image, 150)}" class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-300" onload="this.classList.remove('opacity-0');" loading="lazy">
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-gray-800 text-sm truncate">${card.name}</div>
                            <div class="text-xs text-gray-500 mt-1 truncate flex items-center gap-1.5">
                                ${card.set ? `<span class="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">${card.set}</span>` : ''}
                                <span>${card.code || ''}</span>
                            </div>
                        </div>
                    </div>
                    <div class="shrink-0 flex flex-col items-end gap-1.5">
                        <div class="font-bold text-gray-900">${formatPrice(card.price)}</div>
                        <div class="flex items-center gap-1.5">
                            <span class="text-[10px] text-gray-500 font-semibold">ลดเพิ่ม:</span>
                            <input type="number" class="item-discount w-20 px-2 py-1 text-xs font-bold border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-red-500 outline-none text-red-600 bg-red-50/30 placeholder-red-300" data-id="${card.id}" data-price="${card.price}" value="" oninput="calculateOrderNetTotal()" placeholder="0">
                        </div>
                    </div>
                </div>
            `;
        }
    });
    list.innerHTML = orderHtml;
    
    document.getElementById('order-subtotal').textContent = formatPrice(subtotal);
    document.getElementById('order-discount').value = 0;
    
    // Set default date
    const now = new Date();
    const nowStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + 'T' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    document.getElementById('order-date').value = nowStr;
    document.getElementById('order-customer').value = '';
    
    calculateOrderNetTotal();
    
    document.getElementById('order-summary-modal').classList.remove('hidden');
}

function closeOrderSummaryModal() {
    document.getElementById('order-summary-modal').classList.add('hidden');
}

function calculateOrderNetTotal() {
    let subtotal = 0;
    
    // Calculate new subtotal taking into account item-level discounts
    const itemDiscounts = document.querySelectorAll('.item-discount');
    if (itemDiscounts.length > 0) {
        itemDiscounts.forEach(input => {
            const originalPrice = parseInt(input.getAttribute('data-price')) || 0;
            const discount = parseInt(input.value) || 0;
            subtotal += Math.max(0, originalPrice - discount);
        });
    } else {
        cards.forEach(card => {
            if (selectedCards.has(card.id.toString())) {
                subtotal += card.price;
            }
        });
    }
    
    document.getElementById('order-subtotal').textContent = formatPrice(subtotal);
    
    const globalDiscount = parseInt(document.getElementById('order-discount').value) || 0;
    const net = Math.max(0, subtotal - globalDiscount);
    
    document.getElementById('order-net-total').textContent = formatPrice(net);
}

function confirmOrder(status) {
    if (selectedCards.size === 0) return;
    
    const customerInfo = document.getElementById('order-customer').value.trim();
    const dateStr = document.getElementById('order-date').value;
    const globalDiscount = parseInt(document.getElementById('order-discount').value) || 0;
    
    let subtotal = 0;
    let orderItems = [];
    
    // Build a map of item discounts
    const itemDiscountsMap = {};
    document.querySelectorAll('.item-discount').forEach(input => {
        itemDiscountsMap[input.getAttribute('data-id')] = parseInt(input.value) || 0;
    });
    
    // Find selected cards
    cards.forEach(card => {
        if (selectedCards.has(card.id.toString())) {
            const itemDiscount = itemDiscountsMap[card.id.toString()] || 0;
            const finalItemPrice = Math.max(0, card.price - itemDiscount);
            
            subtotal += finalItemPrice;
            
            orderItems.push({
                id: card.id,
                code: card.code,
                name: card.name,
                image: card.image,
                price: finalItemPrice,
                originalPrice: card.price,
                itemDiscount: itemDiscount,
                qty: 1
            });
        }
    });
    
    const netTotal = Math.max(0, subtotal - globalDiscount);
    
    // Create history record
    const orderRecord = {
        id: generateCode(new Date(dateStr).getTime() || Date.now()),
        date: new Date(dateStr).getTime() || Date.now(),
        customer: customerInfo,
        items: orderItems,
        subtotal: subtotal,
        discount: globalDiscount,
        total: netTotal,
        status: status // 'sold' or 'reserved'
    };
    
    db.collection('history').doc(orderRecord.id.toString()).set(orderRecord);
    // Remove sold cards from inventory if status is sold
    if (status === 'sold') {
        selectedCards.forEach(cardIdStr => {
            db.collection('cards').doc(cardIdStr).delete();
        });
        // Auto-generate Credit Record
        const soldImages = orderItems.map(item => item.image);
        if (soldImages.length > 0) {
            
            let descText = customerInfo ? `ส่งให้คุณ: ${customerInfo}` : '';
            
            const creditRecord = {
                id: Date.now(),
                date: new Date(dateStr).getTime() || Date.now(),
                desc: descText,
                images: soldImages
            };
            db.collection('credits').doc(creditRecord.id.toString()).set(creditRecord);
        }
    } else {
        alert('ระบบ "ติดจอง" จะถูกพัฒนาในสเตปต่อไป ตอนนี้จะบันทึกลงประวัติการซื้อขายอย่างเดียวก่อนครับ');
    }
    
    // Reset selection
    selectedCards.clear();
    
    closeOrderSummaryModal();
    
    // Refresh UI
    renderAdminCards();
    updateDashboard();
    
    // Switch to history tab to show the result
    switchTab('history');
}

