const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOApy4W5XFLgUMtce2fP1OVv6UZx80HblSgXQjG3XGv8zLHR85_lveiDjrWGK34bSb1p-vIOroijFe/pub?output=csv';

const fetchMasterData = async () => {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from([csvText]);
        stream
            .pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

const generateCertificateBuffer = async (studentName, teamName) => {
    const templatePath = path.join(process.cwd(), 'api/assets/certificate_template.png');
    
    if (!fs.existsSync(templatePath)) {
        throw new Error('Certificate template not found');
    }

    const image = await Jimp.read(templatePath);
    
    // Load a font - Jimp.FONT_SANS_64_BLACK is a good standard size
    // We try to load 64, then fall back to 32 if name is long (though we can scale the text box)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

    const displayText = `${studentName} of Team "${teamName}"`;
    
    // Dimensions
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Positioning: Center horizontally, ~56% down Vertically
    const textY = height * 0.54; // Adjusted slightly for Jimp alignment
    const maxWidth = width * 0.8;
    const textX = (width - maxWidth) / 2;

    image.print(
        font,
        textX,
        textY,
        {
            text: displayText,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
        },
        maxWidth,
        height * 0.1 // Max height for the text line
    );

    return await image.getBufferAsync(Jimp.MIME_PNG);
};

module.exports = async (req, res) => {
    // Add CORS headers manually for Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { name, teamId } = req.body;
    if (!name || !teamId) {
        return res.status(400).json({ message: 'Both Name and Team ID are required' });
    }

    try {
        const masterData = await fetchMasterData();
        const lookupName = name.trim().toLowerCase();
        const lookupTeamId = teamId.trim().toLowerCase();
        
        const record = masterData.find(row => {
            const rowName = (row['Name'] || '').toString().trim().toLowerCase();
            const rowTeamId = (row['Team ID'] || '').toString().trim().toLowerCase();
            return rowName === lookupName && rowTeamId === lookupTeamId;
        });

        if (!record) {
            return res.status(404).json({ message: `No record found for Name "${name}" with Team ID "${teamId}".` });
        }

        const fullName = (record['Name'] || '').trim();
        const teamName = (record['Team Name'] || record['Team Name '] || '-').trim();

        const buffer = await generateCertificateBuffer(fullName, teamName);

        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(buffer);

    } catch (error) {
        console.error('Error generating certificate:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
