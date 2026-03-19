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
    // Use __dirname which is the api/ directory — reliable in serverless
    const templatePath = path.join(__dirname, 'assets', 'certificate_template.png');

    console.log('Template path:', templatePath);
    console.log('Template exists:', fs.existsSync(templatePath));

    if (!fs.existsSync(templatePath)) {
        const dirContents = fs.existsSync(path.join(__dirname, 'assets'))
            ? fs.readdirSync(path.join(__dirname, 'assets'))
            : 'assets dir missing';
        throw new Error(`Certificate template not found at ${templatePath}. Dir: ${JSON.stringify(dirContents)}`);
    }

    const image = await Jimp.read(templatePath);
    // Load font from local directory (bundled with the function, not from node_modules)
    const fontPath = path.join(__dirname, 'fonts', 'open-sans-64-black', 'open-sans-64-black.fnt');
    const font = await Jimp.loadFont(fontPath);

    const displayText = `${studentName} of Team "${teamName}"`;

    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Center horizontally, ~56% down
    const maxWidth = Math.floor(width * 0.75);
    const textX = Math.floor((width - maxWidth) / 2);
    const textY = Math.floor(height * 0.54);

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
        Math.floor(height * 0.1)
    );

    return await image.getBufferAsync(Jimp.MIME_PNG);
};

module.exports = async (req, res) => {
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

        console.log(`Looking up: name="${lookupName}", teamId="${lookupTeamId}"`);

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

        console.log(`Generating for: ${fullName}, ${teamName}`);

        const buffer = await generateCertificateBuffer(fullName, teamName);

        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(buffer);

    } catch (error) {
        console.error('Error generating certificate:', error.message, error.stack);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
