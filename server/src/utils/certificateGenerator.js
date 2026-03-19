const { registerFont, createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

// Ensure generated directory exists
const generatedDir = path.join(__dirname, '../../generated');
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

const generateCertificate = async (studentName, teamName, date) => {
    try {
        const templatePath = path.join(__dirname, '../../assets/certificate_template.png');

        // Check if template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error('Certificate template not found');
        }

        const image = await loadImage(templatePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');

        // Draw template
        ctx.drawImage(image, 0, 0, image.width, image.height);

        // Build the single-line text: "Name of Team Name"
        const displayText = `${studentName} of Team "${teamName}"`;

        // Configure text - centered in the blank space
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1a1a6e'; // Dark blue to match the certificate theme

        // Start with a good font size and auto-reduce if text is too wide
        let fontSize = 46;
        const maxTextWidth = image.width * 0.65; // Keep within ~65% of certificate width

        ctx.font = `bold ${fontSize}px "Times New Roman", serif`;
        let textWidth = ctx.measureText(displayText).width;

        while (textWidth > maxTextWidth && fontSize > 18) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px "Times New Roman", serif`;
            textWidth = ctx.measureText(displayText).width;
        }

        // Position: centered horizontally, in the blank area between
        // "THIS CERTIFICATE IS PROUDLY PRESENTED TO:" and the horizontal line
        // Adjust Y based on your template — this targets the center of that blank space
        const textX = image.width / 2;
        const textY = image.height * 0.56; // ~56% down from top (the blank area)

        ctx.fillText(displayText, textX, textY);

        // Save file
        const fileName = `${studentName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        const filePath = path.join(generatedDir, fileName);
        const buffer = canvas.toBuffer('image/png');

        fs.writeFileSync(filePath, buffer);

        return fileName;
    } catch (error) {
        console.error('Error generating certificate:', error);
        throw error;
    }
};

module.exports = { generateCertificate };
