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

module.exports = async (req, res) => {
    // Add CORS headers manually for Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { teamId } = req.query;
    if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required' });
    }

    try {
        const masterData = await fetchMasterData();
        const lookupId = teamId.trim().toLowerCase();

        const record = masterData.find(row =>
            (row['Team ID'] || '').toString().trim().toLowerCase() === lookupId
        );

        if (!record) {
            return res.status(404).json({ message: `Team ID "${teamId}" not found.` });
        }

        const teamName = (record['Team Name'] || record['Team Name '] || '-').trim();
        res.status(200).json({ teamId: teamId.trim(), teamName });

    } catch (error) {
        console.error('Error looking up Team ID:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
