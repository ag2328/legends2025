// Configuration
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub?gid=0&single=true&output=csv';

// DOM Elements
const standingsContainer = document.getElementById('standings');
const lastUpdated = document.getElementById('last-updated');

// Function to fetch data from Google Sheets
async function fetchLeaderboardData() {
    try {
        const response = await fetch(SHEET_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        console.log('Raw CSV data:', data);
        return parseCSV(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) throw new Error('Invalid CSV data');
    
    // Find the header row (skip empty rows)
    let headerRow = 0;
    while (headerRow < lines.length && !lines[headerRow].trim()) {
        headerRow++;
    }
    
    if (headerRow >= lines.length) throw new Error('No headers found');
    
    // Clean up headers - skip the first two empty columns
    const headers = ['Team', 'Wins', 'Losses', 'Ties', 'Games Played', 'Goals Scored', 'Points'];
    
    console.log('Using headers:', headers);
    
    const data = [];
    
    // Process data rows
    for (let i = headerRow + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        console.log('Processing row:', values);
        
        // Skip first empty column, use second column as team name
        const teamName = values[1]?.trim();
        if (!teamName) continue;
        
        const entry = {
            Team: teamName,
            Wins: values[2]?.trim() || '0',
            Losses: values[3]?.trim() || '0',
            Ties: values[4]?.trim() || '0',
            'Games Played': values[5]?.trim() || '0',
            'Goals Scored': values[6]?.trim() || '0',
            Points: values[7]?.trim() || '0'
        };
        
        data.push(entry);
    }
    
    console.log('Processed data:', data);
    return { headers, data };
}

// Render the leaderboard
function renderLeaderboard(leaderboardData) {
    if (!leaderboardData || !leaderboardData.data.length) {
        standingsContainer.innerHTML = '<tr><td colspan="7" class="error">No data available</td></tr>';
        return;
    }
    
    // Sort data by points (descending), then by wins, then by goals scored
    const sortedData = [...leaderboardData.data].sort((a, b) => {
        // First tiebreaker: Points
        const pointsDiff = parseInt(b.Points) - parseInt(a.Points);
        if (pointsDiff !== 0) return pointsDiff;
        
        // Second tiebreaker: Wins
        const winsDiff = parseInt(b.Wins) - parseInt(a.Wins);
        if (winsDiff !== 0) return winsDiff;
        
        // Third tiebreaker: Goals Scored
        return parseInt(b['Goals Scored']) - parseInt(a['Goals Scored']);
    });
    
    let html = '';
    sortedData.forEach((entry) => {
        html += `
            <tr>
                <td class="team">${entry.Team || ''}</td>
                <td class="stats">${entry.Wins || 0}</td>
                <td class="stats">${entry.Losses || 0}</td>
                <td class="stats">${entry.Ties || 0}</td>
                <td class="stats">${entry['Games Played'] || 0}</td>
                <td class="stats">${entry['Goals Scored'] || 0}</td>
                <td class="points">${entry.Points || 0}</td>
            </tr>
        `;
    });
    
    standingsContainer.innerHTML = html;
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleString()}`;
}

// Display error message
function displayError(message) {
    standingsContainer.innerHTML = `
        <tr>
            <td colspan="7" class="error">
                Error: ${message}<br>
                Make sure your Google Sheet is public (Anyone with the link can view).
            </td>
        </tr>
    `;
}

// Main function to fetch and display data
async function fetchAndDisplayData() {
    try {
        const data = await fetchLeaderboardData();
        if (data) {
            renderLeaderboard(data);
            updateLastUpdated();
        }
    } catch (error) {
        console.error('Error:', error);
        displayError(error.message);
    }
}

// Initial load
fetchAndDisplayData();

// Refresh data every 5 minutes
setInterval(fetchAndDisplayData, 5 * 60 * 1000);
