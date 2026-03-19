const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const { generateCertificate } = require('../utils/certificateGenerator');

// Google Sheets published CSV URL
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSOApy4W5XFLgUMtce2fP1OVv6UZx80HblSgXQjG3XGv8zLHR85_lveiDjrWGK34bSb1p-vIOroijFe/pub?output=csv';

/**
 * Fetch master data from Google Sheets (published CSV).
 * Returns an array of row objects parsed from the CSV.
 */
const fetchMasterData = async () => {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }
    const csvText = await response.text();

    // Parse CSV text into array of objects
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

const generateCertificates = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let results = [];
    const errors = [];
    const generatedFiles = [];

    const processData = async (data) => {
        let successCount = 0;

        // Load Master Data from Google Sheets
        let masterMap = new Map();
        
        try {
            const masterData = await fetchMasterData();
            
            // Index master data by Name (normalized)
            masterData.forEach(row => {
                const name = (row['Name'] || '').toString().trim().toLowerCase();
                if (name) {
                    masterMap.set(name, row);
                }
            });
            console.log(`Loaded ${masterMap.size} records from Google Sheet.`);
        } catch (err) {
            console.error('Error loading master data from Google Sheet:', err);
        }

        for (const student of data) {
            // Get uploaded Name
            const uploadedName = (student['Name'] || student['First Name'] || '').toString().trim();
            const lookupName = uploadedName.toLowerCase();

            if (!lookupName) continue;

            // CHECK: Is Name in Master Data?
            const masterRecord = masterMap.get(lookupName);

            if (!masterRecord) {
                errors.push({ name: uploadedName, error: 'Name not found in master records (Google Sheet)' });
                continue;
            }

            // USE MASTER DATA for certificate
            const fullName = (masterRecord['Name'] || '').trim();
            const teamName = (masterRecord['Team Name'] || masterRecord['Team Name '] || '-').trim();

            try {
                const fileName = await generateCertificate(fullName, teamName, new Date().toDateString());
                generatedFiles.push(fileName);
                successCount++;
            } catch (error) {
                errors.push({ name: fullName, error: error.message });
            }
        }

        // Cleanup uploaded file
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (err) {
            console.error('Error deleting file:', err);
        }

        res.status(200).json({
            message: 'Certificate generation process completed',
            totalProcessed: data.length,
            successCount,
            failureCount: errors.length,
            generatedFiles: generatedFiles.map(file => `/generated/${file}`),
            errors
        });
    };

    try {
        if (fileExt === '.xlsx' || fileExt === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            results = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
            await processData(results);
        } else {
            // CSV Handling
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => processData(results))
                .on('error', (error) => {
                    throw new Error('Error parsing CSV file');
                });
        }
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ message: 'Error processing file', error: error.message });
    }
};

const generateSingle = async (req, res) => {
    const { name, teamId } = req.body;
    
    if (!name || !teamId) {
        return res.status(400).json({ message: 'Both Name and Team ID are required' });
    }

    try {
        const masterData = await fetchMasterData();
        
        // Find record matching both Name AND Team ID
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

        const fileName = await generateCertificate(fullName, teamName, new Date().toDateString());

        res.status(200).json({
            message: 'Certificate generated',
            successCount: 1,
            failureCount: 0,
            generatedFiles: [`/generated/${fileName}`],
            errors: []
        });

    } catch (error) {
        console.error('Error generating single certificate:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

const lookupTeamId = async (req, res) => {
    const { teamId } = req.query;
    
    if (!teamId) {
        return res.status(400).json({ message: 'Team ID is required' });
    }

    try {
        const masterData = await fetchMasterData();
        const lookupId = teamId.trim().toLowerCase();

        // Find the first record matching the Team ID
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

module.exports = { generateCertificates, generateSingle, lookupTeamId };
