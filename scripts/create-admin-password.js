const bcrypt = require('bcrypt');

async function createPasswordHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Test verification
    const isValid = await bcrypt.compare(password, hash);
    console.log('Verification test:', isValid);
}

createPasswordHash().catch(console.error);



