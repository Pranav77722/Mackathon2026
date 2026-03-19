const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { Readable } = require('stream');

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOApy4W5XFLgUMtce2fP1OVv6UZx80HblSgXQjG3XGv8zLHR85_lveiDjrWGK34bSb1p-vIOroijFe/pub?output=csv';

// Load and cache the font as base64 once at startup
let fontBase64 = null;
const getFontBase64 = () => {
    if (!fontBase64) {
        const fontPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
        const fontBuffer = fs.readFileSync(fontPath);
        fontBase64 = fontBuffer.toString('base64');
    }
    return fontBase64;
};

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

const xmlEscape = (str) =>
    str.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&apos;');

/**
 * Rough text width estimator: ~0.6 × fontSize per character for Roboto Bold
 */
const calcFontSize = (text, maxPx, startSize = 58) => {
    let size = startSize;
    while (size > 22 && text.length * size * 0.60 > maxPx) {
        size -= 2;
    }
    return size;
};

const generateCertificateBuffer = async (studentName, teamName) => {
    const templatePath = path.join(__dirname, 'assets', 'certificate_template.png');
    if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

    const meta = await sharp(templatePath).metadata();
    const { width, height } = meta;

    const displayText = xmlEscape(`${studentName} of Team "${teamName}"`);
    const maxTextWidth = Math.floor(width * 0.65);
    const fontSize = calcFontSize(displayText, maxTextWidth);

    // Embed Roboto Bold font as base64 so librsvg doesn't need system fonts
    const robotoBase64 = getFontBase64();

    // Y position: center of the blank space on the certificate (~53% down)
    const textY = Math.floor(height * 0.535);

    const svgOverlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style>
      @font-face {
        font-family: 'RobotoBold';
        font-weight: bold;
        src: url('data:font/truetype;base64,${robotoBase64}') format('truetype');
      }
    </style>
  </defs>
  <text
    x="${Math.floor(width / 2)}"
    y="${textY}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="RobotoBold"
    font-weight="bold"
    font-size="${fontSize}"
    fill="#1a1a6e"
    letter-spacing="0.5"
  >${displayText}</text>
</svg>`;

    return await sharp(templatePath)
        .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
        .png()
        .toBuffer();
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
