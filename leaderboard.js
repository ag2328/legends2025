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

// Function to fetch and parse CSV data
async function fetchCSVData(sheetName) {
    try {
        const gid = await getSheetGID(sheetName);
        if (!gid) {
            throw new Error(`No GID found for sheet: ${sheetName}`);
        }

        const url = `${BASE_SHEET_URL}?tqx=out:csv&gid=${gid}`;
        console.log(`Fetching data from ${sheetName} using URL:`, url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.text();
        console.log(`Received data from ${sheetName}:`, data);

        if (!data || data.trim() === '') {
            throw new Error(`Received empty data from ${sheetName}`);
        }

        // Parse the CSV data
        const lines = data.split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error(`Not enough data in ${sheetName}`);
        }

        // Get headers and remove quotes
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        console.log(`Headers for ${sheetName}:`, headers);

        // Parse data rows
        const rows = lines.slice(1).map(line => {
            if (!line.trim()) return null;
            const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            return row;
        }).filter(row => row !== null);

        console.log(`Parsed ${rows.length} rows from ${sheetName}`);
        return rows;
    } catch (error) {
        console.error(`Error fetching data from ${sheetName}:`, error);
        throw error;
    }
} 