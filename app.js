
let lightboxPanzoom;
function initPanzoom() {
    if (!lightboxPanzoom && window.Panzoom) {
        const imgElement = document.getElementById('lightbox-img');
        lightboxPanzoom = Panzoom(imgElement, {
            maxScale: 10,
            minScale: 1,
            contain: 'outside',
            step: 0.3,
            canvas: true
        });
        const container = document.getElementById('lightbox-img-container');
        container.addEventListener('wheel', lightboxPanzoom.zoomWithWheel);
        
        // Double tap to zoom in/out
        let lastTap = 0;
        imgElement.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                e.preventDefault();
                if (lightboxPanzoom.getScale() > 1.5) {
                    lightboxPanzoom.zoom(1, { animate: true });
                    setTimeout(() => lightboxPanzoom.pan(0, 0), 10);
                } else {
                    const touch = e.changedTouches[0];
                    lightboxPanzoom.zoomToPoint(3, { clientX: touch.clientX, clientY: touch.clientY }, { animate: true });
                }
            }
            lastTap = currentTime;
        });
        
        // Double click to zoom in/out
        imgElement.addEventListener('dblclick', function(e) {
            if (lightboxPanzoom.getScale() > 1.5) {
                lightboxPanzoom.zoom(1, { animate: true });
                setTimeout(() => lightboxPanzoom.pan(0, 0), 10);
            } else {
                lightboxPanzoom.zoomToPoint(3, { clientX: e.clientX, clientY: e.clientY }, { animate: true });
            }
        });
    } else if (lightboxPanzoom) {
        setTimeout(() => lightboxPanzoom.reset({ animate: false }), 10);
    }
}

function setLightboxZoom(level, event) {
    if (event) {
        event.stopPropagation();
    }
    if (lightboxPanzoom) {
        if (level === 1) {
            lightboxPanzoom.zoom(1, { animate: true });
            setTimeout(() => lightboxPanzoom.pan(0, 0), 10);
        } else {
            lightboxPanzoom.zoom(level, { animate: true });
        }
    }
}

// Data Initialize
const imagePool = ['images/card1.png', 'images/card2.png', 'images/card3.png', 'images/card4.png', 'images/card5.png', 'images/card6.png', 'images/card7.png', 'images/card8.png', 'images/card9.png'];
const rarities = ['Manga', 'SEC', 'SR', 'Leader', 'R', 'UC', 'C'];
const colors = ['red', 'green', 'blue', 'purple', 'black', 'yellow'];
const sets = ['OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06', 'EB01', 'EB02', 'OP07', 'OP08'];
const badges = ['', '', '', '', '', '', '', '', '', ''];
const names = ['Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Usopp', 'Sanji', 'Tony Tony Chopper', 'Nico Robin', 'Franky', 'Brook', 'Jinbe', 'Shanks', 'Portgas D. Ace', 'Sabo', 'Trafalgar Law', 'Eustass Kid', 'Kaido', 'Big Mom', 'Whitebeard', 'Blackbeard', 'Gol D. Roger'];

const userCodes = [
    "OP08-040", "OP08-044", "OP08-047", "OP08-049", "OP08-052", 
    "OP08-053", "OP12-058", "OP13-042", "OP13-046", "OP13-057", 
    "OP14-044", "PRB02-008", "ST22-001", "ST22-002", "ST22-003", 
    "ST22-011", "ST22-015"
];
let selectedCodes = [...userCodes].sort(() => 0.5 - Math.random()).slice(0, Math.floor(userCodes.length * 0.8));

// Removed defaultCards generation to prevent fake data on new devices

let cards = [];
let currentCredits = [];

// Initialize Firebase Listeners and Migrate Local Data
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Real-time listener for Cards
        db.collection("cards").onSnapshot((snapshot) => {
            cards = [];
            snapshot.forEach((doc) => {
                cards.push({ ...doc.data(), id: parseInt(doc.id) });
            });
            
            // Sort by id descending by default (to simulate chronological order)
            cards.sort((a, b) => b.id - a.id);
            
            // Update UI
            if (typeof renderCards === 'function') {
                renderCards();
            }
            if (typeof updateGallery === 'function') {
                updateGallery();
            }
        });

        // Real-time listener for Credits
        db.collection("credits").onSnapshot((snapshot) => {
            currentCredits = [];
            snapshot.forEach((doc) => {
                currentCredits.push({ ...doc.data(), id: parseInt(doc.id) });
            });
            
            if (typeof renderCredits === 'function') {
                renderCredits();
            }
        });

        // Run cleanup in background
        (async () => {
            try {
                if (!localStorage.getItem('cleaned_samples_v1')) {
                    console.log("Cleaning up sample cards...");
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
                    localStorage.setItem('cleaned_samples_v1', 'true');
                    console.log("Cleaned up " + batchCount + " sample cards!");
                }
            } catch (e) {
                console.warn("Sample cleanup failed:", e);
            }
        })();
        
    } catch (e) {
        console.error("Firebase Initialization Error:", e);
    }
});

let cart = [];
let selectedCategories = new Set(['all']);
let selectedColors = new Set(['all']);

function getOptimizedImageUrl(url, width = 300) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return url;
    
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('onepiece-cardgame.com') || urlObj.hostname.includes('limitlesstcg')) {
            // Statically format: https://cdn.statically.io/img/domain.com/path
            return `https://cdn.statically.io/img/${urlObj.hostname}${urlObj.pathname}?w=${width}&q=80`;
        }
    } catch(e) {}
    
    // Fallback to Jetpack Photon which is also extremely fast
    const cleanUrl = url.replace(/^https?:\/\//, '');
    return `https://i2.wp.com/${cleanUrl}?w=${width}&quality=80&strip=all`;
}

function formatPrice(num) {
    return num.toLocaleString() + ' ฿';
}

function renderCards() {

    
    const container = document.getElementById('card-container');
    container.innerHTML = '';

    let filtered = cards.filter(card => {
        let matchCat = selectedCategories.has('all') || selectedCategories.has(card.rarity);
        let matchColor = selectedColors.has('all') || selectedColors.has(card.color);
        
        let searchTerm = document.getElementById('searchInput').value.toLowerCase();
        let matchSearch = card.name.toLowerCase().includes(searchTerm) || 
                          (card.set && card.set.toLowerCase().includes(searchTerm)) || 
                          (card.code && card.code.toLowerCase().includes(searchTerm)) || 
                          (card.cardCode && card.cardCode.toLowerCase().includes(searchTerm));
        
        return matchCat && matchColor && matchSearch;
    });

    let sortVal = document.getElementById('sortSelect').value;
    if (sortVal === 'newest') filtered.sort((a,b) => b.id - a.id);
    if (sortVal === 'oldest') filtered.sort((a,b) => a.id - b.id);
    if (sortVal === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    if (sortVal === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    if (sortVal === 'code-asc') filtered.sort((a,b) => (a.set || '').localeCompare(b.set || ''));
    if (sortVal === 'code-desc') filtered.sort((a,b) => (b.set || '').localeCompare(a.set || ''));

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400 text-sm">ไม่พบการ์ดที่ค้นหา</div>`;
        return;
    }

    let cardsHtml = '';
    filtered.forEach(card => {
        let badgeHtml = card.badge ? `<span class="absolute top-1.5 left-1.5 z-10 bg-gray-900/90 backdrop-blur-sm text-white font-bold text-[7px] px-1.5 py-0.5 rounded-sm">${card.badge}</span>` : '';
        let codeHtml = card.code ? `<span class="absolute top-4 right-1.5 z-20 text-white font-black text-[7.5px] tracking-widest" style="text-shadow: 0.5px 0.5px 0 #000, -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0 1px 2px rgba(0,0,0,0.8);">#${card.code}</span>` : '';
        
        const inCart = cart.some(i => i.id === card.id);
        const btnClass = inCart ? "bg-yellow-400 text-gray-900 w-[46px] justify-center" : "bg-blue-600 text-white hover:bg-blue-700 px-2 gap-1";
        const btnContent = inCart ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>` : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> เพิ่ม`;

        let setDisplay = card.cardCode || card.set || '';
        if (setDisplay && !setDisplay.includes(' · ') && card.rarity) {
            setDisplay = `${setDisplay} · ${card.rarity}`;
        } else if (!setDisplay) {
            setDisplay = card.rarity || '';
        }

        let colorMap = {
            'red': 'bg-red-500',
            'blue': 'bg-blue-500',
            'green': 'bg-green-500',
            'purple': 'bg-purple-500',
            'black': 'bg-gray-800',
            'yellow': 'bg-yellow-400',
            'multi': 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500'
        };
        let colorDot = card.color ? `<div class="w-2 h-2 rounded-full ${colorMap[card.color] || 'bg-gray-400'} shadow-[0_0_2px_rgba(255,255,255,0.5)] border border-white/30 shrink-0"></div>` : '';

        let html = `
            <div class="card-item bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col relative transition-transform hover:-translate-y-1">
                ${badgeHtml}
                ${codeHtml}
                <div class="relative w-full aspect-[3/4] bg-gray-200 cursor-pointer group overflow-hidden" onclick="openLightbox(${card.id})">
                    <div class="skeleton-sweep absolute inset-0 z-0"></div>
                    <img src="${getOptimizedImageUrl(card.image)}" class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 relative z-10 opacity-0" onload="this.classList.remove('opacity-0');" loading="lazy">
                    <div class="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                        <svg class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <div class="absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2 text-left pointer-events-none">
                        <h3 class="text-[13px] font-extrabold text-white leading-tight line-clamp-2 drop-shadow-md mb-0.5">${card.name}</h3>
                        <div class="flex items-center gap-1.5">
                            ${colorDot}
                            <span class="text-[9px] uppercase font-black tracking-wide text-yellow-400 drop-shadow-md">${setDisplay}</span>
                        </div>
                    </div>
                </div>
                <div class="px-2 h-[38px] flex items-center bg-white justify-between">
                    <span class="text-[12px] font-extrabold text-green-700">${formatPrice(card.price)}</span>
                    <button id="add-btn-${card.id}" onclick="addToCart(${card.id}); event.stopPropagation();" class="${btnClass} text-[9px] font-bold h-[26px] rounded shadow-sm transition tap-effect shrink-0 flex items-center">
                        ${btnContent}
                    </button>
                </div>
            </div>
        `;
        cardsHtml += html;
    });
    container.innerHTML = cardsHtml;
}

function updateGallery() {
    renderCards();
}

function setCategory(cat, btn) {
    if (cat === 'all') {
        selectedCategories = new Set(['all']);
    } else {
        selectedCategories.delete('all');
        if (selectedCategories.has(cat)) {
            selectedCategories.delete(cat);
            if (selectedCategories.size === 0) {
                selectedCategories.add('all');
            }
        } else {
            selectedCategories.add(cat);
        }
    }
    
    document.querySelectorAll('.cat-btn').forEach(b => {
        const val = b.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (selectedCategories.has(val)) {
            b.classList.add('bg-gray-900', 'text-white');
            b.classList.remove('bg-white', 'text-gray-600');
        } else {
            b.classList.remove('bg-gray-900', 'text-white');
            b.classList.add('bg-white', 'text-gray-600');
        }
    });
    renderCards();
}

function setColor(color, btn) {
    if (color === 'all') {
        selectedColors = new Set(['all']);
    } else {
        selectedColors.delete('all');
        if (selectedColors.has(color)) {
            selectedColors.delete(color);
            if (selectedColors.size === 0) {
                selectedColors.add('all');
            }
        } else {
            selectedColors.add(color);
        }
    }
    
    document.querySelectorAll('.color-btn').forEach(b => {
        const val = b.getAttribute('onclick').match(/'([^']+)'/)[1];
        if (selectedColors.has(val)) {
            b.classList.add('ring-2');
            if(val === 'all') {
                b.classList.add('border-gray-900');
                b.classList.remove('border-gray-300');
            }
        } else {
            b.classList.remove('ring-2');
            if(val === 'all') {
                b.classList.remove('border-gray-900');
                b.classList.add('border-gray-300');
            }
        }
    });
    renderCards();
}

function addToCart(id) {
    const card = cards.find(c => c.id === id);
    if(card) {
        const index = cart.findIndex(i => i.id === card.id);
        if(index === -1) {
            cart.push({...card, qty: 1});
            showToast('เพิ่มลงตะกร้าแล้ว', 'success');
        } else {
            cart.splice(index, 1);
            showToast('นำออกจากตะกร้าแล้ว', 'success');
        }
        updateCartUI();
    }
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const miniCart = document.getElementById('mini-cart');
    const miniQty = document.getElementById('mini-cart-qty');
    const miniTotal = document.getElementById('mini-cart-total');
    
    const totalQty = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    let total = cart.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
    
    if (totalQty > 0) {
        badge.classList.remove('hidden');
        badge.textContent = totalQty;
        
        // Update mini cart content
        miniQty.textContent = totalQty;
        miniTotal.textContent = formatPrice(total);
        
        // Show mini cart if checkout bar is not visible
        const bar = document.getElementById('checkout-bar');
        if (!bar.classList.contains('show')) {
            miniCart.classList.remove('translate-y-32');
            miniCart.classList.add('translate-y-0');
        }
    } else {
        badge.classList.add('hidden');
        miniCart.classList.remove('translate-y-0');
        miniCart.classList.add('translate-y-32');
    }

    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = '';
    
    if(cart.length === 0) {
        cartContainer.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8 text-sm">ตะกร้าว่างเปล่า</div>`;
    } else {
        let cartHtml = '';
        cart.forEach((item, index) => {
            cartHtml += `
                <div class="bg-white rounded-xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex relative w-full p-2 gap-3 items-stretch hover:border-blue-100 transition-colors">
                    <div class="relative w-[70px] shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer flex items-center justify-center" onclick="openLightbox(${item.id})">
                        <img src="${getOptimizedImageUrl(item.image, 150)}" class="w-full h-full object-cover" loading="lazy">
                        ${item.badge ? `<span class="absolute top-1 left-1 bg-gray-900/90 text-white font-bold text-[7px] px-1.5 py-0.5 rounded-sm shadow-sm">${item.badge}</span>` : ''}
                    </div>
                    
                    <div class="flex-grow flex flex-col justify-between py-0.5 min-w-0 pr-1">
                        <div class="flex flex-col h-full justify-between">
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-0.5">
                                    <span class="text-[9px] uppercase font-bold text-gray-500 tracking-wider">${item.cardCode || item.set || item.rarity} ${item.code ? `• ${item.code}` : ''}</span>
                                    <button onclick="removeItem(${index})" class="text-gray-400 p-1 hover:text-red-500 hover:bg-red-50 rounded-md transition tap-effect shrink-0 -mt-1 -mr-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                                <h3 class="text-xs font-extrabold text-gray-900 leading-tight line-clamp-2 pr-4 mb-0.5">
                                    ${item.qty > 1 ? `<span class="text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-[10px] mr-1">x${item.qty}</span>` : ''}${item.name}
                                </h3>
                                <div class="text-[13px] font-black text-gray-900">
                                    ${formatPrice(item.price * (item.qty || 1))}
                                    ${item.qty > 1 ? `<span class="text-[9px] text-gray-500 font-normal ml-1">(${formatPrice(item.price)}/ใบ)</span>` : ''}
                                </div>
                            </div>
                            
                            <div class="flex gap-1.5 mt-2">
                                <span class="text-[9px] font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded-sm">${item.color}</span>
                                <span class="text-[9px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-sm">${item.rarity}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        cartContainer.innerHTML = cartHtml;
    }

    document.getElementById('cart-total').textContent = formatPrice(total);

    // Sync add buttons globally
    cards.forEach(card => {
        // Sync gallery button
        const btn = document.getElementById(`add-btn-${card.id}`);
        const lbBtn = document.getElementById(`lightbox-add-btn-${card.id}`);
        const inCart = cart.some(i => i.id === card.id);
        
        if(btn) {
            if(inCart) {
                btn.className = "bg-yellow-400 text-gray-900 w-[46px] text-[9px] font-bold h-[26px] rounded shadow-sm transition tap-effect shrink-0 flex items-center justify-center";
                btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`;
            } else {
                btn.className = "bg-blue-600 text-white hover:bg-blue-700 px-2 gap-1 text-[9px] font-bold h-[26px] rounded shadow-sm transition tap-effect shrink-0 flex items-center";
                btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> เพิ่ม`;
            }
        }
        
        if(lbBtn) {
            if(inCart) {
                lbBtn.className = "w-full bg-yellow-400 text-gray-900 text-[13px] font-black px-4 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(250,204,21,0.25)] transition tap-effect flex items-center justify-center gap-2 mt-2";
                lbBtn.innerHTML = `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> <span class="tracking-wide">อยู่ในตะกร้าแล้ว</span>`;
            } else {
                lbBtn.className = "w-full bg-blue-600 text-white text-[13px] font-black px-4 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:bg-blue-500 transition tap-effect flex items-center justify-center gap-2 mt-2";
                lbBtn.innerHTML = `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg> <span class="tracking-wide">เพิ่มลงตะกร้าสินค้า</span>`;
            }
        }
    });
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function clearCart() {
    if (cart.length === 0) {
        showToast('ตะกร้าว่างเปล่าอยู่แล้ว');
        return;
    }
    if (confirm('คุณต้องการล้างตะกร้าสินค้าทั้งหมดใช่หรือไม่?')) {
        cart = [];
        updateCartUI();
        showToast('ล้างตะกร้าสินค้าเรียบร้อยแล้ว');
    }
}

function toggleCart() {
    const bar = document.getElementById('checkout-bar');
    const overlay = document.getElementById('overlay');
    const miniCart = document.getElementById('mini-cart');
    
    if (bar.classList.contains('show')) {
        // Closing main cart
        bar.classList.remove('show');
        overlay.classList.add('opacity-0');
        
        // show mini bar again if cart has items
        if(cart.length > 0) {
            miniCart.classList.remove('translate-y-32');
            miniCart.classList.add('translate-y-0');
        }
        
        setTimeout(() => overlay.classList.add('hidden'), 300);
    } else {
        // Opening main cart
        // hide mini bar
        miniCart.classList.remove('translate-y-0');
        miniCart.classList.add('translate-y-32');
        
        overlay.classList.remove('hidden');
        // trigger reflow
        void overlay.offsetWidth;
        overlay.classList.remove('opacity-0');
        bar.classList.add('show');
    }
}

function applyWatermark(imageSrc, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = Math.max(1.5, img.width * 0.002);
        
        const fontSize = Math.floor(img.width * 0.08);
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.rotate(-35 * Math.PI / 180);
        
        const stepX = img.width * 0.6;
        const stepY = img.height * 0.3;
        
        for (let x = -img.width; x < img.width * 2; x += stepX) {
            for (let y = -img.height; y < img.height * 2; y += stepY) {
                ctx.strokeText("OP.VAULT", x, y);
                ctx.fillText("OP.VAULT", x, y);
            }
        }
        
        ctx.restore();
        
        try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            callback(dataUrl);
        } catch(e) {
            callback(imageSrc); // Fallback if tainted
        }
    };
    img.onerror = () => callback(imageSrc);
    img.src = imageSrc;
    initPanzoom();
}

function openLightbox(idOrSrc) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const details = document.getElementById('lightbox-details');
    
    // Hide gallery UI
    document.getElementById('lightbox-prev').classList.add('hidden');
    document.getElementById('lightbox-next').classList.add('hidden');
    document.getElementById('lightbox-counter').classList.add('hidden');
    
    // Check if it's a valid card ID (number)
    const isCardId = !isNaN(idOrSrc) && idOrSrc !== '' && idOrSrc !== null;
    const card = isCardId ? cards.find(c => c.id == idOrSrc) : null;
    
    if (card) {
        // Mode 1: Trading Card
        img.src = getOptimizedImageUrl(card.image, 600);
        applyWatermark(getOptimizedImageUrl(card.image, 600), function(watermarkedSrc) {
            img.src = watermarkedSrc;
        });
        initPanzoom();
        
        const inCart = cart.some(i => i.id === card.id);
        const btnClass = inCart 
            ? "w-full bg-yellow-400 text-gray-900 text-[13px] font-black px-4 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(250,204,21,0.25)] transition tap-effect flex items-center justify-center gap-2 mt-2" 
            : "w-full bg-blue-600 text-white text-[13px] font-black px-4 py-3.5 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:bg-blue-500 transition tap-effect flex items-center justify-center gap-2 mt-2";
        const btnIcon = inCart 
            ? `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` 
            : `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>`;
        const btnText = inCart ? "อยู่ในตะกร้าแล้ว" : "เพิ่มลงตะกร้าสินค้า";

        details.innerHTML = `
            <div class="flex flex-col gap-3.5">
                <!-- Header: Title & SKU -->
                <div class="flex justify-between items-start gap-3">
                    <div class="flex-grow">
                        <span class="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">${card.cardCode || card.set || card.rarity}</span>
                        <h2 class="text-lg font-black text-white leading-tight mt-0.5">${card.name}</h2>
                    </div>
                    <div class="text-right shrink-0 bg-gray-800/80 px-2.5 py-1.5 rounded-lg border border-gray-700">
                        <span class="text-[8px] font-bold text-gray-400 uppercase block mb-0.5">รหัสสินค้า</span>
                        <div class="text-[11px] font-extrabold text-gray-200 tracking-wider">${card.code}</div>
                    </div>
                </div>

                <!-- Price & Badges -->
                <div class="flex justify-between items-end gap-2">
                    <div class="flex flex-wrap gap-2">
                        <div class="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 flex flex-col">
                            <span class="text-[8px] text-gray-500 uppercase font-bold">สีการ์ด</span>
                            <span class="text-xs font-bold text-white capitalize">${card.color}</span>
                        </div>
                        <div class="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 flex flex-col">
                            <span class="text-[8px] text-gray-500 uppercase font-bold">ประเภท</span>
                            <span class="text-xs font-bold text-white">${card.rarity}</span>
                        </div>
                        ${card.badge ? `
                        <div class="px-2.5 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20 flex flex-col">
                            <span class="text-[8px] text-yellow-500 uppercase font-bold">เกรด</span>
                            <span class="text-xs font-bold text-yellow-400">${card.badge}</span>
                        </div>` : ''}
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-2xl font-black text-white tracking-tight leading-none">${formatPrice(card.price)}</span>
                    </div>
                </div>

                <!-- Action Button -->
                <button id="lightbox-add-btn-${card.id}" onclick="addToCart(${card.id})" class="${btnClass}">
                    ${btnIcon} <span>${btnText}</span>
                </button>
            </div>
        `;
        details.classList.remove('hidden');
    } else if (typeof idOrSrc === 'string' && idOrSrc.startsWith('data:image')) {
        // Mode 2: Credit Review Image (Base64)
        img.src = idOrSrc;
        details.innerHTML = '';
        details.classList.add('hidden');
    } else {
        return; // invalid
    }
    
    lb.classList.remove('hidden');
    // trigger reflow
    void lb.offsetWidth;
    lb.classList.remove('opacity-0');
}

function closeLightbox(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const lb = document.getElementById('lightbox');
    lb.classList.add('opacity-0');
    setTimeout(() => {
        lb.classList.add('hidden');
        document.getElementById('lightbox-img').src = '';
    }, 300);
}

let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.remove('-translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-10', 'opacity-0');
    }, 2500);
}

let copyTimer;
window.copyAccount = function() {
    navigator.clipboard.writeText('1234567890').then(() => {
        const btn = document.getElementById('account-number-btn');
        const icon = document.getElementById('account-copy-icon');
        const wrapper = document.getElementById('account-copy-wrapper');
        const text = document.getElementById('account-copy-text');
        
        if (btn && icon && wrapper && text) {
            // Change state to success
            btn.classList.remove('text-blue-600', 'bg-blue-50', 'hover:text-blue-700');
            btn.classList.add('text-green-600', 'bg-green-50', 'hover:text-green-700');
            
            wrapper.classList.remove('bg-blue-100/50');
            wrapper.classList.add('bg-green-100/50');
            
            text.classList.remove('text-blue-500');
            text.classList.add('text-green-600');
            text.textContent = 'Copied!';
            
            // Change icon to checkmark
            icon.classList.remove('text-blue-500');
            icon.classList.add('text-green-600');
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
            
            clearTimeout(copyTimer);
            copyTimer = setTimeout(() => {
                // Revert state
                btn.classList.remove('text-green-600', 'bg-green-50', 'hover:text-green-700');
                btn.classList.add('text-blue-600', 'bg-blue-50', 'hover:text-blue-700');
                
                wrapper.classList.remove('bg-green-100/50');
                wrapper.classList.add('bg-blue-100/50');
                
                text.classList.remove('text-green-600');
                text.classList.add('text-blue-500');
                text.textContent = 'Copy';
                
                icon.classList.remove('text-green-600');
                icon.classList.add('text-blue-500');
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>';
            }, 2000);
        }
    });
};


function toggleContact(showSuccess = false) {
    const modal = document.getElementById('contact-modal');
    const successBanner = document.getElementById('contact-save-success');
    const step1 = document.getElementById('contact-step-1');
    const step2Badge = document.getElementById('contact-step-2-badge');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        if (showSuccess === true) {
            if (successBanner) successBanner.classList.remove('hidden');
            if (step1) step1.classList.add('hidden');
            if (step2Badge) step2Badge.classList.add('hidden');
        } else {
            if (successBanner) successBanner.classList.add('hidden');
            if (step1) step1.classList.remove('hidden');
            if (step2Badge) step2Badge.classList.remove('hidden');
        }
    } else {
        modal.classList.add('hidden');
    }
}

// Lightbox Gallery State
let currentLightboxImages = [];
let currentLightboxIndex = 0;
// currentCredits is declared at the top of the file

function openLightboxGallery(creditId, startIndex) {
    const credit = currentCredits.find(c => c.id == creditId);
    if (!credit) return;
    
    currentLightboxImages = credit.images || [credit.image];
    currentLightboxIndex = startIndex;
    
    updateLightboxGalleryUI();
    
    const lb = document.getElementById('lightbox');
    const details = document.getElementById('lightbox-details');
    details.innerHTML = '';
    details.classList.add('hidden');
    
    lb.classList.remove('hidden');
    setTimeout(() => {
        lb.classList.remove('opacity-0');
        document.getElementById('lightbox-img').parentElement.classList.remove('scale-95', 'opacity-0');
    }, 10);
    document.body.style.overflow = 'hidden';
    initPanzoom();
}

function updateLightboxGalleryUI() {
    const img = document.getElementById('lightbox-img');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const counter = document.getElementById('lightbox-counter');
    
    if (currentLightboxImages.length > 0) {
        img.src = currentLightboxImages[currentLightboxIndex];
        
        if (currentLightboxImages.length > 1) {
            prevBtn.classList.remove('hidden');
            nextBtn.classList.remove('hidden');
            counter.classList.remove('hidden');
            counter.textContent = `${currentLightboxIndex + 1}/${currentLightboxImages.length}`;
        } else {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
            counter.classList.add('hidden');
        }
    }
}

function navigateLightbox(direction, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (currentLightboxImages.length <= 1) return;
    
    currentLightboxIndex += direction;
    
    // Wrap around
    if (currentLightboxIndex < 0) {
        currentLightboxIndex = currentLightboxImages.length - 1;
    } else if (currentLightboxIndex >= currentLightboxImages.length) {
        currentLightboxIndex = 0;
    }
    
    updateLightboxGalleryUI();
}

// Add swipe support to lightbox
let touchstartX = 0;
let touchendX = 0;
document.addEventListener('DOMContentLoaded', () => {
    const lightboxImgContainer = document.getElementById('lightbox-img-container');
    if (lightboxImgContainer) {
        lightboxImgContainer.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, {passive: true});

        lightboxImgContainer.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});
    }
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (typeof lightboxPanzoom !== 'undefined' && lightboxPanzoom && lightboxPanzoom.getScale() > 1.05) return;
    if (touchendX < touchstartX - swipeThreshold) {
        // Swiped left, go next
        if (!document.getElementById('lightbox').classList.contains('hidden')) {
            navigateLightbox(1);
        }
    }
    if (touchendX > touchstartX + swipeThreshold) {
        // Swiped right, go prev
        if (!document.getElementById('lightbox').classList.contains('hidden')) {
            navigateLightbox(-1);
        }
    }
}

// Check Credit Feature
function toggleCreditModal() {
    const viewer = document.getElementById('credit-viewer');
    if (viewer.classList.contains('translate-y-full')) {
        viewer.classList.remove('translate-y-full');
        renderCredits();
        document.body.style.overflow = 'hidden'; // prevent background scrolling
    } else {
        viewer.classList.add('translate-y-full');
        document.body.style.overflow = '';
    }
}

function renderCredits() {
    const gallery = document.getElementById('credit-gallery');
    gallery.innerHTML = '';
    
    // Data is automatically synced via onSnapshot into currentCredits array
    if (currentCredits.length === 0) {
        gallery.innerHTML = `<div class="col-span-full py-12 text-center text-gray-500 font-bold bg-white rounded-xl border border-gray-100 break-inside-avoid w-full">ยังไม่มีเครดิตในระบบขณะนี้</div>`;
        return;
    }
    
    const sorted = [...currentCredits].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.date) - new Date(a.date);
    });
    let col1HTML = '<div class="flex flex-col gap-3 flex-1 min-w-0">';
    let col2HTML = '<div class="flex flex-col gap-3 flex-1 min-w-0">';

    sorted.forEach((credit, index) => {
        const d = new Date(credit.date);
        const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        
        let images = credit.images;
        if (!images) {
            images = [credit.image]; // Backward compatibility
        }
        
        let imagesHtml = '';
        
        if (images.length === 1) {
            imagesHtml = `<img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full cursor-pointer object-cover tap-effect" style="height: 240px;" onclick="openLightboxGallery(${credit.id}, 0)" loading="lazy">`;
        } else if (images.length === 2) {
            imagesHtml = `
            <div class="grid grid-cols-2 gap-0.5" style="height: 240px;">
                <img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full h-full object-cover cursor-pointer tap-effect" onclick="openLightboxGallery(${credit.id}, 0)" loading="lazy">
                <img src="${getOptimizedImageUrl(images[1], 400)}" class="w-full h-full object-cover cursor-pointer tap-effect" onclick="openLightboxGallery(${credit.id}, 1)" loading="lazy">
            </div>`;
        } else {
            // 3 or more images
            const extra = images.length - 3;
            imagesHtml = `
            <div class="flex flex-col gap-0.5" style="height: 240px;">
                <img src="${getOptimizedImageUrl(images[0], 400)}" class="w-full h-1/2 object-cover cursor-pointer tap-effect" onclick="openLightboxGallery(${credit.id}, 0)" loading="lazy">
                <div class="grid grid-cols-2 gap-0.5 h-1/2">
                    <img src="${getOptimizedImageUrl(images[1], 400)}" class="w-full h-full object-cover cursor-pointer tap-effect" onclick="openLightboxGallery(${credit.id}, 1)" loading="lazy">
                    <div class="relative w-full h-full cursor-pointer tap-effect" onclick="openLightboxGallery(${credit.id}, 2)">
                        <img src="${getOptimizedImageUrl(images[2], 400)}" class="w-full h-full object-cover" loading="lazy">
                        ${extra > 0 ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg backdrop-blur-[1px]">+${extra}</div>` : ''}
                    </div>
                </div>
            </div>`;
        }
        
        let itemHTML = `
            <div class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 break-inside-avoid flex flex-col relative">
                ${credit.isPinned ? `<div class="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-20 flex items-center gap-1 border border-yellow-500/30"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>ปักหมุด</div>` : ''}
                <div class="relative overflow-hidden w-full bg-gray-50">
                    ${imagesHtml}
                </div>
                <div class="p-3 border-t border-gray-50 flex-1">
                    ${credit.desc ? `<div class="text-[11px] font-bold text-gray-800 line-clamp-3 whitespace-pre-line leading-relaxed">${credit.desc}</div>` : ''}
                    <div class="text-[9px] text-gray-400 mt-1 flex gap-1 items-center">
                        <span>อัปโหลดเมื่อ</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
        
        if (index % 2 === 0) {
            col1HTML += itemHTML;
        } else {
            col2HTML += itemHTML;
        }
    });

    col1HTML += '</div>';
    col2HTML += '</div>';
    gallery.innerHTML = col1HTML + col2HTML;
}

function saveCartImage() {
    if(cart.length === 0) {
        showToast("ตะกร้าว่างเปล่า ไม่สามารถบันทึกรูปได้");
        return;
    }
    
    const receiptHTML = `
        <div id="receipt-capture" style="position: absolute; left: -9999px; top: 0; width: 600px; background: white; padding: 24px; font-family: 'Prompt', sans-serif;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 15px;">
                <h1 style="font-size: 24px; font-weight: 800; margin: 0; color: #111;">OP.Vault - สรุปรายการสั่งซื้อ</h1>
                <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">(กรุณาส่งรูปนี้ให้แอดมินทาง Inbox)</p>
                <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">วันที่: ${new Date().toLocaleString('th-TH')}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                ${cart.map(item => `
                    <div style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; background: #fff; display: flex; flex-direction: column;">
                        <div style="position: relative; width: 100%; padding-bottom: 133.33%; background: #f3f4f6;">
                            <img src="${getOptimizedImageUrl(item.image, 150)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Ctext x='50%25' y='50%25' transform='rotate(-35 75 75)' text-anchor='middle' fill='rgba(255,255,255,0.35)' stroke='rgba(0,0,0,0.3)' stroke-width='1.5' font-size='20' font-family='sans-serif' font-weight='900' letter-spacing='2'%3EOP.VAULT%3C/text%3E%3C/svg%3E&quot;); background-repeat: repeat; z-index: 5;"></div>
                            ${item.badge ? `<div style="position: absolute; top: 6px; left: 6px; background: rgba(17, 24, 39, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: bold; z-index: 10;">${item.badge}</div>` : ''}
                            ${item.code ? `<div style="position: absolute; top: 18px; right: 6px; color: rgba(255,255,255,0.9); font-size: 8px; font-weight: 900; letter-spacing: 0.5px; white-space: nowrap; text-align: right; text-shadow: 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 0px 0px 4px rgba(0,0,0,1); z-index: 10;">${item.code}</div>` : ''}
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); padding: 16px 8px 8px 8px; text-align: left; z-index: 10;">
                                <div style="font-size: 7px; font-weight: bold; color: #facc15; margin-bottom: 2px; text-transform: uppercase;">${item.cardCode || item.set || item.rarity}</div>
                                <div style="font-size: 10px; font-weight: bold; color: white; line-height: 1.2;">${item.name}</div>
                            </div>
                        </div>
                        <div style="padding: 8px 10px; text-align: left; background: #fff;">
                            <div style="font-size: 12px; font-weight: 900; color: #111;">
                                ${item.qty > 1 ? `<span style="color: #2563eb; font-weight: bold; margin-right: 4px;">x${item.qty}</span>` : ''}${(item.price * (item.qty || 1)).toLocaleString()} ฿
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="border-top: 2px solid #111; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 18px; font-weight: bold; color: #333;">ยอดรวมทั้งหมด:</span>
                <span style="font-size: 24px; font-weight: 900; color: #111;">${cart.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0).toLocaleString()} ฿</span>
            </div>

            <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; font-weight: bold;">รหัสออเดอร์ (กดค้างที่รูปเพื่อคัดลอกข้อความ)</div>
                <div style="font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; word-break: break-word;">
                    [${cart.map(item => item.code || item.id).join(', ')}]
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', receiptHTML);
    const captureEl = document.getElementById('receipt-capture');
    
    showToast("กำลังสร้างรูปภาพ...");
    
    // Wait for images to load, and convert external URLs to prevent tainted canvas
    const images = Array.from(captureEl.querySelectorAll('img'));
    Promise.all(images.map(img => {
        return new Promise((resolve) => {
            const originalSrc = img.src;
            if (originalSrc.startsWith('http') && !originalSrc.startsWith('data:')) {
                const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(originalSrc);
                fetch(proxyUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            img.src = reader.result;
                            resolve();
                        };
                        reader.readAsDataURL(blob);
                    })
                    .catch(() => {
                        if (img.complete) resolve();
                        else {
                            img.onload = resolve;
                            img.onerror = resolve;
                        }
                    });
            } else if (originalSrc.startsWith('file://')) {
                // Cannot draw local file:// images to canvas due to strict browser security.
                // Replace with a base64 placeholder to prevent crashing the whole receipt.
                img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="%23e2e8f0"/><text x="100" y="150" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%2364748b">ต้องอัปโหลดใหม่</text></svg>';
                img.style.objectFit = "contain";
                resolve();
            } else {
                if (img.complete) resolve();
                else {
                    img.onload = resolve;
                    img.onerror = resolve;
                }
            }
        });
    })).then(() => {
        html2canvas(captureEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.font = '900 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate(-35 * Math.PI / 180);
        for (let x = -canvas.width; x < canvas.width * 2; x += 300) {
            for (let y = -canvas.height; y < canvas.height * 2; y += 300) {
                ctx.strokeText("OP.VAULT", x, y);
                ctx.fillText("OP.VAULT", x, y);
            }
        }
        ctx.restore();

        const link = document.createElement('a');
        link.download = `OPVault_Order_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        captureEl.remove();
        toggleCart(); // Close the cart sidebar
        toggleContact(true); // Open contact modal with success message
        showToast("เซฟรูปภาพสำเร็จ!");
    }).catch(err => {
        console.error("Error capturing image", err);
        captureEl.remove();
        showToast("Error: " + (err.message || err));
        alert("เกิดข้อผิดพลาดในการสร้างรูปภาพ\n" + (err.message || err) + "\n\nหากคุณเปิดไฟล์นี้โดยตรง (file://) กรุณาเปิดผ่าน Live Server (VS Code) แทนครับ เนื่องจากเบราว์เซอร์มีระบบรักษาความปลอดภัยป้องกันการเซฟรูปจากไฟล์ Local");
    });
    });
}

// Ensure the shop auto-refreshes if user focuses back on the page
window.addEventListener('focus', () => {
    renderCards();
});

// Bulk search logic
let bulkFoundCards = [];

function toggleBulkSearch() {
    const modal = document.getElementById('bulk-search-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        document.getElementById('bulk-step-1').classList.remove('hidden');
        document.getElementById('bulk-step-2').classList.add('hidden');
        document.getElementById('bulk-search-input').value = '';
    } else {
        modal.classList.add('hidden');
    }
}

function backToBulkStep1() {
    document.getElementById('bulk-step-2').classList.add('hidden');
    document.getElementById('bulk-step-1').classList.remove('hidden');
}

function processBulkSearch() {
    const text = document.getElementById('bulk-search-input').value.trim();
    if (!text) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    bulkFoundCards = [];
    const missing = [];

    // Ensure cards are loaded (handled by Firebase real-time sync globally)
    
    lines.forEach(line => {
        // Parse like 4xEB01-046 or 4x OP01-001 or EB01-046
        const match = line.match(/^(?:(\d+)[xX]\s*)?(.+)$/);
        if (match) {
            const qty = parseInt(match[1]) || 1;
            const rawCode = match[2].trim();
            // Optional: Handle OP prefix if needed, though user codes might or might not have it
            let searchCode = rawCode;
            if (searchCode.startsWith('OP') && searchCode.length > 2 && !isNaN(searchCode[2])) {
                searchCode = searchCode.replace('OP', '');
            }
            
            const card = cards.find(c => c.cardCode && c.cardCode.toLowerCase() === searchCode.toLowerCase() || c.cardCode && c.cardCode.toLowerCase() === rawCode.toLowerCase());
            if (card) {
                bulkFoundCards.push({ ...card, reqQty: qty, originalCode: line });
            } else {
                missing.push(line);
            }
        } else {
            missing.push(line);
        }
    });

    const resultsDiv = document.getElementById('bulk-search-results');
    const foundList = document.getElementById('bulk-found-list');
    const missingList = document.getElementById('bulk-missing-list');
    
    document.getElementById('bulk-found-count').textContent = `${bulkFoundCards.length} รายการ`;
    document.getElementById('bulk-missing-count').textContent = `${missing.length} รายการ`;

    foundList.innerHTML = bulkFoundCards.map((item, idx) => `
        <div class="flex items-center gap-2.5 p-2.5 bg-white hover:bg-gray-50 transition shrink-0 group">
            <div class="w-10 h-14 shrink-0 rounded overflow-hidden border border-gray-200">
                <img src="${getOptimizedImageUrl(item.image, 150)}" class="w-full h-full object-cover" loading="lazy">
            </div>
            <div class="flex-grow min-w-0 flex flex-col justify-center">
                <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-[8px] font-black text-white bg-gray-800 px-1.5 py-0.5 rounded-sm tracking-wider uppercase">${item.cardCode}</span>
                </div>
                <div class="text-[11px] font-extrabold text-gray-900 truncate leading-tight">${item.name}</div>
                <div class="text-[11px] font-bold text-blue-600 mt-0.5">${formatPrice(item.price)} <span class="text-[8px] text-gray-400 font-normal">/ใบ</span></div>
            </div>
            <div class="shrink-0 flex flex-col items-end gap-0.5">
                <span class="text-[8px] text-gray-500 font-bold uppercase tracking-wider">จำนวน</span>
                <div class="relative flex items-center">
                    <input type="number" min="1" value="${item.reqQty}" id="bulk-qty-${idx}" class="w-12 bg-gray-100 border border-transparent rounded-md px-1.5 py-1 text-xs font-black text-center text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all">
                </div>
            </div>
        </div>
    `).join('');

    if (missing.length > 0) {
        missingList.innerHTML = missing.map(line => `
            <div class="text-[11px] font-mono font-bold text-red-700 bg-white border border-red-200 px-2.5 py-1 rounded-md shadow-sm shrink-0">
                ${line}
            </div>
        `).join('');
        document.getElementById('bulk-missing-container').classList.remove('hidden');
    } else {
        document.getElementById('bulk-missing-container').classList.add('hidden');
    }

    document.getElementById('bulk-step-1').classList.add('hidden');
    document.getElementById('bulk-step-2').classList.remove('hidden');
    
    const addBtn = document.getElementById('bulk-add-btn');
    if (bulkFoundCards.length > 0) {
        addBtn.classList.remove('hidden');
    } else {
        addBtn.classList.add('hidden');
    }
}

function addBulkToCart() {
    let addedCount = 0;
    bulkFoundCards.forEach((item, idx) => {
        const qtyInput = document.getElementById(`bulk-qty-${idx}`);
        const qty = parseInt(qtyInput.value) || 1;
        
        const existingIdx = cart.findIndex(c => c.id === item.id);
        if (existingIdx !== -1) {
            cart[existingIdx].qty += qty;
        } else {
            cart.push({ ...item, qty: qty });
        }
        addedCount++;
    });
    
    if (addedCount > 0) {
        showToast(`เพิ่ม ${addedCount} รายการลงตะกร้าแล้ว`);
        updateCartUI();
    }
    toggleBulkSearch();
}

// Initial render
// Removed to allow skeleton loaders to show until Firebase loads data

// Scroll behavior for hiding/showing filters
let lastScrollY = window.scrollY;
let isFilterVisible = true;
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const filterContainer = document.getElementById('filter-container');
            if (!filterContainer) {
                ticking = false;
                return;
            }
            
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY;
            
            // Lower threshold so it responds almost immediately ("เลื่อนนิดเดียว")
            if (delta > 5 && currentScrollY > 40) {
                if (isFilterVisible) {
                    filterContainer.classList.add('filter-hide');
                    filterContainer.classList.remove('filter-show');
                    document.getElementById('search-wrapper').classList.add('shadow-sm', 'border-b', 'border-gray-200');
                    isFilterVisible = false;
                }
                lastScrollY = currentScrollY;
            } else if (delta < -5) {
                if (!isFilterVisible) {
                    filterContainer.classList.add('filter-show');
                    filterContainer.classList.remove('filter-hide');
                    document.getElementById('search-wrapper').classList.remove('shadow-sm', 'border-b', 'border-gray-200');
                    isFilterVisible = true;
                }
                lastScrollY = currentScrollY;
            } else if (currentScrollY <= 40 && !isFilterVisible) {
                // Always show if at the very top
                filterContainer.classList.add('filter-show');
                filterContainer.classList.remove('filter-hide');
                isFilterVisible = true;
                lastScrollY = currentScrollY;
            }
            
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });

// Secret Admin Access
let secretClickCount = 0;
let secretClickTimer = null;

const secretTrigger = document.getElementById('secret-admin-trigger');
if (secretTrigger) {
    secretTrigger.addEventListener('click', () => {
        secretClickCount++;
        clearTimeout(secretClickTimer);
        
        if (secretClickCount >= 5) {
            secretClickCount = 0;
            // ทดสอบโดยไม่ใช้รหัสผ่าน
            localStorage.setItem('isAdminVisible', 'true');
            window.location.href = "admin.html";
        }
        
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 1000);
    });
}

function copyOrderCode() {
    if (cart.length === 0) return;
    
    // Generate order text
    const codes = cart.map(item => item.code || item.id).join(', ');
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const textToCopy = `สนใจสั่งซื้อครับ/ค่ะ\nรหัสออเดอร์: [${codes}]\nยอดรวม: ${formatPrice(total)}`;
    
    // Copy to clipboard with fallback for local files (file://)
    const btn = event ? event.currentTarget : null;
    let originalHtml = '';
    
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> คัดลอกสำเร็จ!`;
        btn.classList.replace('bg-gray-900', 'bg-green-600');
        btn.classList.replace('hover:bg-gray-800', 'hover:bg-green-700');
    }
    
    // Modern API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("คัดลอกรหัสออเดอร์แล้ว!");
            resetButton();
        }).catch(err => {
            fallbackCopy(textToCopy);
        });
    } else {
        // Fallback for file:// or insecure context
        fallbackCopy(textToCopy);
    }
    
    function fallbackCopy(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast("คัดลอกรหัสออเดอร์แล้ว!");
            } else {
                throw new Error("execCommand failed");
            }
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            prompt("เบราว์เซอร์ไม่รองรับการคัดลอกอัตโนมัติ กรุณากดคัดลอก (Copy) ข้อความด้านล่าง:", text);
        } finally {
            document.body.removeChild(textArea);
            resetButton();
        }
    }
    
    function resetButton() {
        if (btn) {
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.replace('bg-green-600', 'bg-gray-900');
                btn.classList.replace('hover:bg-green-700', 'hover:bg-gray-800');
            }, 2000);
        }
    }
}


