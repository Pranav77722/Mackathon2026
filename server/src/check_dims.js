const { loadImage } = require('canvas');
const path = require('path');

async function checkDimensions() {
    try {
        const templatePath = path.join(__dirname, '../assets/certificate_template.png');
        const image = await loadImage(templatePath);
        console.log(`Dimensions: ${image.width}x${image.height}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDimensions();
