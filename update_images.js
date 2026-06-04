const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB8uFC6UUXnO3esLIB1xor51fqy0spi1ZY",
    authDomain: "opvault-9fc81.firebaseapp.com",
    projectId: "opvault-9fc81",
    storageBucket: "opvault-9fc81.firebasestorage.app",
    messagingSenderId: "207978482582",
    appId: "1:207978482582:web:41022514fd338a6168abb7",
    measurementId: "G-TMN4T4L7XG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const localImages = [
    "images/card1.png",
    "images/card2.png",
    "images/card3.png",
    "images/card4.png",
    "images/card5.png",
    "images/card6.png",
    "images/card7.png",
    "images/card8.png",
    "images/card9.png"
];

function randomImage() {
    return localImages[Math.floor(Math.random() * localImages.length)];
}

async function updateImages() {
    const querySnapshot = await getDocs(collection(db, "cards"));
    
    // Map to keep track of which badge gets which image
    const badgeImageMap = {};
    let promises = [];
    let count = 0;

    querySnapshot.forEach((document) => {
        const data = document.data();
        const badge = data.badge; // Using badge as the unique identifier for a card type
        
        if (!badgeImageMap[badge]) {
            badgeImageMap[badge] = randomImage();
        }
        
        const newImage = badgeImageMap[badge];
        
        promises.push(
            updateDoc(doc(db, "cards", document.id), {
                image: newImage
            })
        );
        count++;
    });

    await Promise.all(promises);
    console.log(`Successfully updated ${count} cards with local images!`);
    process.exit(0);
}

updateImages().catch(console.error);
