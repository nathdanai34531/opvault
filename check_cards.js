const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB8uFC6UUXnO3esLIB1xor51fqy0spi1ZY",
    authDomain: "opvault-9fc81.firebaseapp.com",
    projectId: "opvault-9fc81",
    storageBucket: "opvault-9fc81.firebasestorage.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const snap = await getDocs(collection(db, "cards"));
    let cards = [];
    snap.forEach(doc => cards.push(doc.data()));
    console.log(JSON.stringify(cards, null, 2));
    process.exit(0);
}

check().catch(console.error);
