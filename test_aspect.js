const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    // Simulate mobile viewport
    const page = await browser.newPage({ viewport: { width: 300, height: 800 } });
    
    await page.goto('http://localhost:8081/test_wrap.html');
    await new Promise(r => setTimeout(r, 1000));
    
    const wrapper = await page.$('.inline-block');
    const wrapperBox = await wrapper.boundingBox();
    const img = await page.$('img');
    const imgBox = await img.boundingBox();
    
    console.log('Wrapper size:', wrapperBox);
    console.log('Image size:', imgBox);
    
    await browser.close();
})();
