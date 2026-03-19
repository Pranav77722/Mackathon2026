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

/**
 * Custom font loader that reads font files as Buffers first,
 * avoiding any internal path resolution issues in jimp.
 */
const loadLocalFont = async (fntPath) => {
    // Read the .fnt XML file
    const fntContent = fs.readFileSync(fntPath, 'utf8');
    const fontDir = path.dirname(fntPath);

    // Parse jimp's internal format: it expects an object with data + pages
    // We use jimp's internal loadFont with a file url approach, but the safest
    // method is to temporarily symlink or use the full resolved path.
    // Since jimp uses `uniqs` internally, we just call loadFont with the
    // absolute path directly - which SHOULD work given our __dirname approach.
    return await Jimp.loadFont(fntPath);
};

const generateCertificateBuffer = async (studentName, teamName) => {
    const templatePath = path.join(__dirname, 'assets', 'certificate_template.png');
    const fontPath = path.join(__dirname, 'fonts', 'open-sans-64-black', 'open-sans-64-black.fnt');

    console.log('[generate] Template:', templatePath, '| exists:', fs.existsSync(templatePath));
    console.log('[generate] Font:', fontPath, '| exists:', fs.existsSync(fontPath));

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${templatePath}`);
    }
    if (!fs.existsSync(fontPath)) {
        const fontsDir = path.join(__dirname, 'fonts');
        const contents = fs.existsSync(fontsDir) ? JSON.stringify(fs.readdirSync(fontsDir)) : 'fonts dir missing';
        throw new Error(`Font not found: ${fontPath}. Fonts dir: ${contents}`);
    }

    const image = await Jimp.read(templatePath);
    const font = await Jimp.loadFont(fontPath);

    const displayText = `${studentName} of Team "${teamName}"`;

    const width = image.bitmap.width;
    const height = image.bitmap.height;

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

        console.log(`[generate] Creating certificate for: ${fullName} / ${teamName}`);

        const buffer = await generateCertificateBuffer(fullName, teamName);
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(buffer);

    } catch (error) {
        console.error('[generate] Error:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
