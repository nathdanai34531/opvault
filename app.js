
let isModalOpen = false;

function openModalState() {
    if (!isModalOpen) {
        isModalOpen = true;
        history.pushState({ modal: true }, "");
    }
}

function closeModalState() {
    if (isModalOpen) {
        isModalOpen = false;
        history.back();
    }
}

window.addEventListener('popstate', (e) => {
    if (isModalOpen) {
        isModalOpen = false;
        closeAllModals();
    }
});

function closeAllModals() {
    const cardModal = document.getElementById('card-modal');
    if (cardModal && !cardModal.classList.contains('hidden')) {
        closeCardModal();
    }
    
    const lb = document.getElementById('lightbox');
    if (lb && !lb.classList.contains('hidden')) {
        closeModalState();
    lb.classList.add('opacity-0');
        setTimeout(() => {
            lb.classList.add('hidden');
            const lbImg = document.getElementById('lightbox-img');
            if (lbImg) lbImg.src = '';
        }, 300);
    }
    
    const bar = document.getElementById('checkout-bar');
    if (bar && bar.classList.contains('show')) {
        bar.classList.remove('show');
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
        const miniCart = document.getElementById('mini-cart');
        if (typeof cart !== 'undefined' && cart.length > 0 && miniCart) {
            miniCart.classList.remove('translate-y-full');
        }
    }
    
    const contact = document.getElementById('contact-modal');
    if (contact && !contact.classList.contains('hidden')) {
        contact.classList.add('hidden');
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.classList.add('hidden');
    }
    
    const viewer = document.getElementById('credit-viewer');
    if (viewer && !viewer.classList.contains('translate-y-full')) {
        viewer.classList.add('translate-y-full');
    }
    
    const bulkSearch = document.getElementById('bulk-search-modal');
    if (bulkSearch && !bulkSearch.classList.contains('hidden')) {
        bulkSearch.classList.add('hidden');
    }
    
    const sideMenu = document.getElementById('side-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    if (sideMenu && !sideMenu.classList.contains('translate-x-full')) {
        sideMenu.classList.add('translate-x-full');
        if (menuOverlay) {
            menuOverlay.classList.add('opacity-0');
            setTimeout(() => menuOverlay.classList.add('hidden'), 300);
        }
    }
    
    document.body.style.overflow = '';
}


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
        let isPinching = false;
        
        imgElement.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                isPinching = true;
            }
        }, {passive: true});

        imgElement.addEventListener('touchend', function(e) {
            if (isPinching) {
                if (e.touches.length === 0) {
                    isPinching = false;
                }
                return;
            }
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
const rarities = ['Manga', 'SEC', 'SR', 'L', 'Leader', 'R', 'UC', 'C'];
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
let currentFilteredCards = [];
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

let cart = JSON.parse(localStorage.getItem('opvault_cart')) || [];
document.addEventListener('DOMContentLoaded', updateCartUI);
let selectedCategories = new Set(['all']);
let selectedColors = new Set(['all']);

function getOptimizedImageUrl(url, width = 300) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return url;
    
    try {
        const urlObj = new URL(url);
        // If it's already using wsrv.nl proxy, don't double proxy it, just return it as is or modify width
        if (urlObj.hostname.includes('wsrv.nl')) {
            return url;
        }
        
        if (urlObj.hostname.includes('onepiece-cardgame.com') || urlObj.hostname.includes('limitlesstcg')) {
            return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp`;
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
    currentFilteredCards = filtered;

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
        'red': { bg: 'bg-red-500', text: 'สีแดง' },
        'blue': { bg: 'bg-blue-500', text: 'สีฟ้า' },
        'green': { bg: 'bg-green-500', text: 'สีเขียว' },
        'purple': { bg: 'bg-purple-500', text: 'สีม่วง' },
        'black': { bg: 'bg-gray-800', text: 'สีดำ' },
        'yellow': { bg: 'bg-yellow-400 text-gray-900', text: 'สีเหลือง' },
        'multi': { bg: 'bg-gradient-to-r from-red-500 via-green-500 to-blue-500', text: 'หลายสี' }
    };
    let cInfo = card.color ? colorMap[card.color.toLowerCase()] : null;
    document.getElementById('cm-colordot').innerHTML = cInfo ? `<div class="px-2 py-0.5 rounded-full ${cInfo.bg} text-[10px] font-bold border border-white/20 shrink-0 ${cInfo.bg.includes('text-gray') ? '' : 'text-white'}">${cInfo.text}</div>` : '';
    
    // Set / Rarity
    let setDisplay = card.set || '-';
    if (card.set && card.set.includes(' · ')) {
        const parts = card.set.split(' · ');
        setDisplay = `${parts[0]} · ${parts.slice(1).join(' · ')}`;
    } else if (card.rarity) {
        setDisplay = `${card.set || '-'} · ${card.rarity}`;
    }
    document.getElementById('cm-set-rarity').textContent = setDisplay;
    
    // Price
    document.getElementById('cm-price').textContent = formatPrice(card.price);
    
    // Button
    const inCart = cart.some(i => i.id === card.id);
    const btnContainer = document.getElementById('cm-btn-container');
    
    const btnClass = inCart 
        ? "w-full bg-yellow-400 text-gray-900 text-[13px] font-black px-4 py-3 rounded-xl shadow-[0_4px_20px_rgba(250,204,21,0.25)] transition tap-effect flex items-center justify-center gap-2" 
        : "w-full bg-blue-600 text-white text-[13px] font-black px-4 py-3 rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:bg-blue-500 transition tap-effect flex items-center justify-center gap-2";
    const btnIcon = inCart 
        ? `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>` 
        : `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>`;
    const btnText = inCart ? "อยู่ในตะกร้าแล้ว" : "เพิ่มลงตะกร้าสินค้า";
    
    btnContainer.innerHTML = `<button id="lightbox-add-btn-${card.id}" onclick="addToCart(${card.id})" class="${btnClass}">${btnIcon} <span>${btnText}</span></button>`;
    
    // Effect
    const effectContainer = document.getElementById('cm-effect');
    if (card.effect && card.effect.trim() !== '') {
        let text = card.effect;
        // Parse triggers
        let formattedLines = [];
        let paragraphs = text.split('
').filter(p => p.trim() !== '');
        
        paragraphs.forEach(p => {
            if (p.startsWith('[ทริกเกอร์]')) {
                let rest = p.substring(10).trim();
                // We format the trigger specially
                formattedLines.push(`
                    <div class="relative bg-[#0b131e] border border-yellow-400/30 rounded-lg p-3 pt-6 mt-6 mb-3 shadow-md">
                        <div class="absolute -top-3 -left-1 bg-yellow-400 text-black px-3 py-1 font-black text-xs tracking-wider slanted-badge shadow-sm border-b-2 border-yellow-500">ทริกเกอร์</div>
                        <span class="text-yellow-100 leading-relaxed">${formatEffectKeywords(rest)}</span>
                    </div>
                `);
            } else {
                formattedLines.push(`<div class="mb-3 leading-relaxed">${formatEffectKeywords(p)}</div>`);
            }
        });
        
        effectContainer.innerHTML = formattedLines.join('');
        effectContainer.parentElement.classList.remove('hidden');
    } else {
        effectContainer.parentElement.classList.add('hidden');
    }
    
    // Show Modal
    modal.classList.remove('hidden');
    void modal.offsetWidth; // trigger reflow
    modal.classList.remove('opacity-0');
    document.body.style.overflow = 'hidden';
}

function closeCardModal() {
    closeModalState();
    const modal = document.getElementById('card-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (document.getElementById('lightbox').classList.contains('hidden') && document.getElementById('cart-sidebar') === null && document.getElementById('bulk-search-modal').classList.contains('hidden') && document.getElementById('contact-modal').classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    }, 300);
}

function openZoomModal() {
    const src = document.getElementById('cm-img').src;
    if (src) {
        openLightbox(src);
    }
}

function formatEffectKeywords(text) {
    if (!text) return '';
    // Replace [Word] with blue badge
    return text.replace(/\[(.*?)\]/g, (match, p1) => {
        return `<span class="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold inline-block mx-0.5">${p1}</span>`;
    });
}

// Swipe navigation and dismiss for Card Modal
document.addEventListener('DOMContentLoaded', () => {
    const cardModal = document.getElementById('card-modal');
    if (!cardModal) return;
    
    // We bind touch events to the inner container
    const innerModal = cardModal.querySelector('.bg-gray-900.max-w-md');
    if (!innerModal) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;
    let direction = null; // 'horizontal' or 'vertical'
    
    innerModal.addEventListener('touchstart', (e) => {
        // Don't drag if they are scrolling the effect box
        const scrollable = e.target.closest('.overflow-y-auto');
        if (scrollable && scrollable.scrollTop > 0) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        direction = null;
        innerModal.style.transition = 'none';
    }, {passive: true});
    
    innerModal.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentX = e.touches[0].clientX - touchStartX;
        currentY = e.touches[0].clientY - touchStartY;
        
        if (!direction) {
            if (Math.abs(currentX) > Math.abs(currentY)) {
                direction = 'horizontal';
            } else {
                direction = 'vertical';
            }
        }
        
        if (direction === 'vertical' && currentY > 0) {
            // Drag down to close
            const scale = Math.max(0.8, 1 - (currentY / 1500));
            innerModal.style.transform = `translateY(${currentY}px) scale(${scale})`;
            e.preventDefault(); // prevent pull to refresh
        } else if (direction === 'horizontal') {
            // Drag left/right to navigate
            innerModal.style.transform = `translateX(${currentX}px)`;
            e.preventDefault();
        }
    }, {passive: false});
    
    innerModal.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        innerModal.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        if (direction === 'vertical') {
            if (currentY > 120) {
                closeCardModal();
            } else {
                innerModal.style.transform = '';
            }
        } else if (direction === 'horizontal') {
            if (Math.abs(currentX) > 80 && currentFilteredCards.length > 0) {
                // Find current index
                const currentIndex = currentFilteredCards.findIndex(c => c.id == currentCardModalId);
                if (currentIndex !== -1) {
                    if (currentX < -80 && currentIndex < currentFilteredCards.length - 1) {
                        // Swipe left -> Next card
                        openCardModal(currentFilteredCards[currentIndex + 1].id);
                    } else if (currentX > 80 && currentIndex > 0) {
                        // Swipe right -> Prev card
                        openCardModal(currentFilteredCards[currentIndex - 1].id);
                    }
                }
            }
            innerModal.style.transform = '';
        }
        
        currentX = 0;
        currentY = 0;
    });
});
