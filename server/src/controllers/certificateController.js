const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { generateCertificate } = require('../utils/certificateGenerator');

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

        // Load Master Data (HackFiesta.xlsx)
        const masterPath = path.join(__dirname, '../../../client/src/csv_data/HackFiesta.xlsx');
        let masterMap = new Map();
        
        try {
            if (fs.existsSync(masterPath)) {
                const masterWorkbook = xlsx.readFile(masterPath);
                const masterSheet = masterWorkbook.Sheets[masterWorkbook.SheetNames[0]];
                const masterData = xlsx.utils.sheet_to_json(masterSheet);
                
                // Index master data by First Name (normalized)
                masterData.forEach(row => {
                    const fName = (row['First Name'] || '').toString().trim().toLowerCase();
                    if (fName) {
                        masterMap.set(fName, row);
                    }
                });
                console.log(`Loaded ${masterMap.size} records from master file.`);
            } else {
                console.warn('Master file not found at:', masterPath);
                // Fallback or Error? User explicitly asked for this check.
                // We'll proceed but validation will likely fail for everyone if map is empty.
            }
        } catch (err) {
            console.error('Error loading master file:', err);
        }

        for (const student of data) {
            // Get uploaded First Name
            const uploadedFirstName = (student['First Name'] || '').toString().trim();
            const lookupName = uploadedFirstName.toLowerCase();

            if (!lookupName) continue;

            // CHECK: Is First Name in Master File?
            const masterRecord = masterMap.get(lookupName);

            if (!masterRecord) {
                errors.push({ name: uploadedFirstName, error: 'Name not found in master records (HackFiesta.xlsx)' });
                continue;
            }

            // USE MASTER DATA for certificate
            // Map fields from the MASTER record, not the uploaded one
            const finalFirstName = masterRecord['First Name'];
            const finalLastName = masterRecord['Last Name'] || '';
            const fullName = `${finalFirstName} ${finalLastName}`.trim();
            
            // Use Team Name from Master, fallback to Project, then '-'
            const teamName = masterRecord['Team Name'] || masterRecord['Project'] || '-';

            try {
                const fileName = await generateCertificate(fullName, teamName, new Date().toDateString());
                generatedFiles.push(fileName);
                successCount++;
            } catch (error) {
                errors.push({ name: fullName, error: error.message });
            }
        }

        // Cleanup
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
    const { firstName } = req.body;
    
    if (!firstName) {
        return res.status(400).json({ message: 'First Name is required' });
    }

    const masterPath = path.join(__dirname, '../../../client/src/csv_data/HackFiesta.xlsx');
    
    try {
        if (!fs.existsSync(masterPath)) {
            return res.status(404).json({ message: 'Master data file not found' });
        }

        const masterWorkbook = xlsx.readFile(masterPath);
        const masterSheet = masterWorkbook.Sheets[masterWorkbook.SheetNames[0]];
        const masterData = xlsx.utils.sheet_to_json(masterSheet);
        
        // Find record
        const lookupName = firstName.trim().toLowerCase();
        const record = masterData.find(row => 
            (row['First Name'] || '').toString().trim().toLowerCase() === lookupName
        );

        if (!record) {
            return res.status(404).json({ message: `Name "${firstName}" not found in records.` });
        }

        const fullName = `${record['First Name']} ${record['Last Name'] || ''}`.trim();
        const teamName = record['Team Name'] || record['Project'] || '-';

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

module.exports = { generateCertificates, generateSingle };
