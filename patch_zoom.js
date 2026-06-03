const fs = require('fs');

let appJs = fs.readFileSync('app.js', 'utf8');

// Inject panzoom initialization
const initPanzoomCode = `
let lightboxPanzoom;
function initPanzoom() {
    if (!lightboxPanzoom && window.Panzoom) {
        const imgElement = document.getElementById('lightbox-img');
        lightboxPanzoom = Panzoom(imgElement, {
            maxScale: 5,
            minScale: 1,
            contain: 'outside',
            step: 0.3
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
`;

// Inject initPanzoom() into openLightbox and openLightboxGallery
appJs = appJs.replace(/img\.src = imageSrc;\n}/g, "img.src = imageSrc;\n    initPanzoom();\n}");
appJs = appJs.replace(/img\.src = watermarkedSrc;\n        }\);\n/g, "img.src = watermarkedSrc;\n        });\n        initPanzoom();\n");
appJs = appJs.replace(/document\.body\.style\.overflow = 'hidden';\n}/g, "document.body.style.overflow = 'hidden';\n    initPanzoom();\n}");

// Append initPanzoomCode to the top of the file
appJs = initPanzoomCode + "\n" + appJs;

// Modify handleSwipe to not swipe if zoomed in
appJs = appJs.replace(/function handleSwipe\(\) {\n    const swipeThreshold = 50;/g, "function handleSwipe() {\n    const swipeThreshold = 50;\n    if (typeof lightboxPanzoom !== 'undefined' && lightboxPanzoom && lightboxPanzoom.getScale() > 1.05) return;");

fs.writeFileSync('app.js', appJs);
console.log("Patched app.js successfully!");
