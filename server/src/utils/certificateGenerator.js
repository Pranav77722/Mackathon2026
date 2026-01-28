const { registerFont, createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

// Ensure generated directory exists
const generatedDir = path.join(__dirname, '../../generated');
if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
}

const generateCertificate = async (studentName, courseName, date) => {
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

        // Configure text drawing
        ctx.textBaseline = 'bottom'; // Easier to align with underlines
        
        // 1. Participant Name
        // Font: Serif / elegant, 42-48 px, Normal weight, Black
        // Alignment: Center aligned horizontally
        // Position: X = center, Y = ~440-460px (slightly above "Mr./Miss" underline)
        ctx.font = '45px "Times New Roman", serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        
        // Auto-reduce font size if name is too long
        // Simple heuristic: if name is very long (> 20 chars), drop size
        if (studentName.length > 20) {
            ctx.font = '38px "Times New Roman", serif';
        }
        
        // Draw Name sitting on the underline
        // User requested approx 440-460px, moving up to 435
        ctx.fillText(studentName, canvas.width / 2, 435); 

        // 2. Team Name
        // Spec: X=450, Y=520, Font size 30-34px, reduction if needed.
        let teamFontSize = 32;
        ctx.font = `${teamFontSize}px "Times New Roman", serif`;
        ctx.textAlign = 'left';
        
        // Measure and reduce if too wide (assuming max width ~400px based on visual layout)
        const maxTeamWidth = 400; 
        let teamWidth = ctx.measureText(courseName).width;
        
        while (teamWidth > maxTeamWidth && teamFontSize > 20) {
            teamFontSize -= 2;
            ctx.font = `${teamFontSize}px "Times New Roman", serif`;
            teamWidth = ctx.measureText(courseName).width;
        }

        // Draw Team Name on the underline
        // Analysis of screenshot: 650 is too far right (overlaps 'participated').
        // 'of team' likely ends around 250. Line starts there.
        ctx.fillText(courseName, 300, 480);

        // Date (Optional - Placed at bottom if needed, or ignored if not fitting template context)
        // ctx.font = '20px Sans';
        // ctx.fillText(date, canvas.width / 2, canvas.height - 100);

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
