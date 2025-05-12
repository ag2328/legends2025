// Base URL for the Google Sheets document
const BASE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub';

// Sheet GID mappings - will be populated dynamically
let SHEET_MAPPINGS = {
    'standings': '0'  // Additional mapping for standings
};

// Track initialization state
let isInitialized = false;

// Function to parse CSV line with quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Function to fetch all sheet mappings from the workbook
async function fetchSheetMappings() {
    if (isInitialized) {
        console.log('Sheet mappings already initialized:', SHEET_MAPPINGS);
        return SHEET_MAPPINGS;
    }

    try {
        // Use the correct URL format for the GID Mapping sheet
        const mappingUrl = `${BASE_SHEET_URL}?gid=26105431&single=true&output=csv`;
        console.log('Fetching sheet mappings from:', mappingUrl);
        
        // Fetch the GID Mapping sheet
        const response = await fetch(mappingUrl);
        console.log('Mapping response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }
        
        const data = await response.text();
        console.log('Received mapping data:', data);
        
        if (!data || data.trim() === '') {
            throw new Error('Received empty data from the GID Mapping sheet');
        }
        
        // Parse the CSV data
        const lines = data.split(/\r?\n/);
        console.log('Split mapping data into lines:', lines);
        
        // Process each line to extract sheet names and GIDs
        lines.forEach((line, index) => {
            if (index === 0) return; // Skip header row
            if (!line.trim()) return; // Skip empty lines
            
            const parts = parseCSVLine(line);
            if (parts.length >= 2) {
                const sheetName = parts[0].replace(/^"|"$/g, ''); // Remove surrounding quotes
                const gid = parts[1].replace(/^"|"$/g, ''); // Remove surrounding quotes
                if (sheetName && gid && sheetName !== 'Sheets') {  // Additional check to skip header
                    console.log(`Adding mapping for sheet "${sheetName}" with GID "${gid}"`);
                    SHEET_MAPPINGS[sheetName] = gid;
                }
            }
        });
        
        if (Object.keys(SHEET_MAPPINGS).length === 0) {
            throw new Error('No valid sheet mappings found in the data');
        }
        
        console.log('Final sheet mappings:', SHEET_MAPPINGS);
        isInitialized = true;
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
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    return `${BASE_SHEET_URL}?gid=${gid}&single=true&output=csv&_t=${timestamp}`;
}

// Function to get all available sheet names
async function getAvailableSheets() {
    // Ensure mappings are initialized
    if (!isInitialized) {
        await fetchSheetMappings();
    }
    
    return Object.keys(SHEET_MAPPINGS);
}

// Export the configuration
export { 
    BASE_SHEET_URL, 
    SHEET_MAPPINGS, 
    getSheetUrl, 
    fetchSheetMappings,
    getAvailableSheets 
}; 
