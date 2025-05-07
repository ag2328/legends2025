// Base URL for the Google Sheets document
const BASE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub';

// Sheet GID mappings - will be populated dynamically
let SHEET_MAPPINGS = {
    'standings': '0'  // Main standings sheet is always 0
};

// Track initialization state
let isInitialized = false;

// Function to fetch all sheet mappings from the workbook
async function fetchSheetMappings() {
    if (isInitialized) {
        console.log('Sheet mappings already initialized');
        return SHEET_MAPPINGS;
    }

    try {
        console.log('Fetching sheet mappings from GID: 26105431...');
        const mappingUrl = `${BASE_SHEET_URL}?gid=26105431&single=true&output=csv`;
        console.log('Mapping URL:', mappingUrl);
        
        // Fetch the GID Mapping sheet
        const response = await fetch(mappingUrl);
        console.log('Mapping sheet response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }
        
        const data = await response.text();
        console.log('Raw GID mapping data:', data);
        
        if (!data || data.trim() === '') {
            throw new Error('Received empty data from the GID Mapping sheet');
        }
        
        const lines = data.split(/\r?\n/);
        console.log('Number of lines in mapping data:', lines.length);
        
        // Process each line to extract sheet names and GIDs
        lines.forEach((line, index) => {
            console.log(`Processing line ${index + 1}:`, line);
            const parts = line.split(',');
            if (parts.length >= 2) {
                const sheetName = parts[0]?.trim();
                const gid = parts[1]?.trim();
                if (sheetName && gid) {
                    SHEET_MAPPINGS[sheetName] = gid;
                    console.log(`Added mapping: ${sheetName} -> ${gid}`);
                } else {
                    console.warn(`Invalid mapping data in line ${index + 1}:`, { sheetName, gid });
                }
            } else {
                console.warn(`Invalid line format in line ${index + 1}:`, line);
            }
        });
        
        if (Object.keys(SHEET_MAPPINGS).length === 0) {
            throw new Error('No valid sheet mappings found in the data');
        }
        
        isInitialized = true;
        console.log('Sheet mappings updated:', SHEET_MAPPINGS);
        return SHEET_MAPPINGS;
    } catch (error) {
        console.error('Error fetching sheet mappings:', error);
        // Reset initialization state on error
        isInitialized = false;
        throw error;
    }
}

// Function to get the full URL for a specific sheet
async function getSheetUrl(sheetName) {
    // Ensure mappings are initialized
    if (!isInitialized) {
        await fetchSheetMappings();
    }
    
    const gid = SHEET_MAPPINGS[sheetName];
    if (!gid) {
        console.warn(`Sheet "${sheetName}" not found in mappings. Available sheets:`, Object.keys(SHEET_MAPPINGS));
        throw new Error(`Sheet "${sheetName}" not found in mappings`);
    }
    return `${BASE_SHEET_URL}?gid=${gid}&single=true&output=csv`;
}

// Function to get all available sheet names
async function getAvailableSheets() {
    // Ensure mappings are initialized
    if (!isInitialized) {
        await fetchSheetMappings();
    }
    
    const sheets = Object.keys(SHEET_MAPPINGS);
    console.log('Available sheets:', sheets);
    return sheets;
}

// Export the configuration
export { 
    BASE_SHEET_URL, 
    SHEET_MAPPINGS, 
    getSheetUrl, 
    fetchSheetMappings,
    getAvailableSheets 
}; 
