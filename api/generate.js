const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOApy4W5XFLgUMtce2fP1OVv6UZx80HblSgXQjG3XGv8zLHR85_lveiDjrWGK34bSb1p-vIOroijFe/pub?output=csv';

// Register custom font at startup
const fontPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, 'RobotoBold');
    console.log('[generate] Font registered: RobotoBold');
} else {
    console.error('[generate] Font file missing:', fontPath);
}

const fetchMasterData = async () => {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from([csvText]);
        stream.pipe(csv())
            .on('data', (row) => results.push(row))
            .on('end', () => resolve(results))
            .on('error', (err) => reject(err));
    });
};

const generateCertificateBuffer = async (studentName, teamName) => {
    const templatePath = path.join(__dirname, 'assets', 'certificate_template.png');
    if (!fs.existsSync(templatePath)) throw new Error('Certificate template not found');

    const image = await loadImage(templatePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Build text
    const displayText = `${studentName} of Team "${teamName}"`;

    // Configure text
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1a1a6e'; // Dark blue matching certificate theme

    // Start at 46px bold, auto-shrink if too wide
    let fontSize = 46;
    const maxTextWidth = image.width * 0.65;
    ctx.font = `bold ${fontSize}px RobotoBold`;
    let textWidth = ctx.measureText(displayText).width;

    while (textWidth > maxTextWidth && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px RobotoBold`;
        textWidth = ctx.measureText(displayText).width;
    }

    // Position: centered horizontally, in the blank area (~53.5% down)
    const textX = image.width / 2;
    const textY = image.height * 0.535;

    ctx.fillText(displayText, textX, textY);

    return canvas.toBuffer('image/png');
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

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
        console.error('[generate] Error:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
