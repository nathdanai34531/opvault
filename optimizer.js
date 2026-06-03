const fs = require('fs');

function injectHelper(file) {
    let content = fs.readFileSync(file, 'utf8');
    const helperFn = `
function getOptimizedImageUrl(url, width = 300) {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) return url;
    
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('onepiece-cardgame.com') || urlObj.hostname.includes('limitlesstcg')) {
            return \`https://cdn.statically.io/img/\${urlObj.hostname}\${urlObj.pathname}?w=\${width}&q=80\`;
        }
    } catch(e) {}
    
    const cleanUrl = url.replace(/^https?:\\/\\//, '');
    return \`https://i2.wp.com/\${cleanUrl}?w=\${width}&quality=80&strip=all\`;
}
`;
    if (!content.includes('getOptimizedImageUrl')) {
        content = content.replace(/function formatPrice\(num\)/, helperFn + '\nfunction formatPrice(num)');
    }
    
    // Apply optimizations to app.js
    if (file === 'app.js') {
        content = content.replace(/src="\$\{card\.image\}"/g, 'src="${getOptimizedImageUrl(card.image)}"');
        content = content.replace(/src="\$\{item\.image\}"/g, 'src="${getOptimizedImageUrl(item.image)}"');
        content = content.replace(/src="\$\{images\[0\]\}"/g, 'src="${getOptimizedImageUrl(images[0], 400)}"');
        content = content.replace(/src="\$\{images\[1\]\}"/g, 'src="${getOptimizedImageUrl(images[1], 400)}"');
        content = content.replace(/src="\$\{images\[2\]\}"/g, 'src="${getOptimizedImageUrl(images[2], 400)}"');
        
        // Lightbox
        content = content.replace(/img\.src = card\.image;/g, 'img.src = getOptimizedImageUrl(card.image, 600);');
        content = content.replace(/applyWatermark\(card\.image, function\(watermarkedSrc\)/g, 'applyWatermark(getOptimizedImageUrl(card.image, 600), function(watermarkedSrc)');
        
        // Watermark CORS
        if (!content.includes("img.crossOrigin = 'Anonymous';")) {
            content = content.replace(/const img = new Image\(\);\s+img\.onload/, "const img = new Image();\n    img.crossOrigin = 'Anonymous';\n    img.onload");
        }
    }
    
    // Apply optimizations to admin.js
    if (file === 'admin.js') {
        content = content.replace(/src="\$\{card\.image\}"/g, 'src="${getOptimizedImageUrl(card.image, 100)}"');
        content = content.replace(/src="\$\{images\[0\]\}"/g, 'src="${getOptimizedImageUrl(images[0], 400)}"');
        content = content.replace(/src="\$\{images\[1\]\}"/g, 'src="${getOptimizedImageUrl(images[1], 400)}"');
        content = content.replace(/src="\$\{images\[2\]\}"/g, 'src="${getOptimizedImageUrl(images[2], 400)}"');
    }
    
    fs.writeFileSync(file, content);
    console.log("Updated", file);
}

injectHelper('app.js');
injectHelper('admin.js');
