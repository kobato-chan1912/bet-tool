const fs = require('fs-extra');
const path = require('path');

const sourceProfile = path.join(__dirname, 'profiles', 'profile1');
const destFolder = path.join(__dirname, 'profiles');

async function cloneProfiles() {
    for (let i = 51; i <= 150; i++) {
        const destProfile = path.join(destFolder, `profile_${i}`);
        await fs.copy(sourceProfile, destProfile);
        console.log(`Cloned profile to: ${destProfile}`);
    }
}

cloneProfiles().then(() => console.log("✅ Cloning completed!"));
