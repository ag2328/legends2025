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
            Wins: parseInt(values[2]?.trim() || '0', 10),
            Losses: parseInt(values[3]?.trim() || '0', 10),
            Ties: parseInt(values[4]?.trim() || '0', 10),
            'Games Played': parseInt(values[5]?.trim() || '0', 10),
            'Goals Scored': parseInt(values[6]?.trim() || '0', 10),
            Points: parseInt(values[7]?.trim() || '0', 10)
        };
        
        data.push(entry);
    }
    
    console.log('Processed data:', data);
    return { headers, data };
}

// Render the leaderboard with new card-based design
function renderLeaderboard(leaderboardData) {
    if (!leaderboardData || !leaderboardData.data.length) {
        standingsContainer.innerHTML = '<div class="error">No data available</div>';
        return;
    }
    
    // Sort data by points (descending), then by wins, then by goals scored
    const sortedData = [...leaderboardData.data].sort((a, b) => {
        // First tiebreaker: Points
        const pointsDiff = b.Points - a.Points;
        if (pointsDiff !== 0) return pointsDiff;
        
        // Second tiebreaker: Wins
        const winsDiff = b.Wins - a.Wins;
        if (winsDiff !== 0) return winsDiff;
        
        // Third tiebreaker: Goals Scored
        return b['Goals Scored'] - a['Goals Scored'];
    });
    
    let html = '';
    sortedData.forEach((team) => {
        // Convert team name to slug for image path
        const teamSlug = team.Team.toLowerCase().replace(/\s+/g, '_');
        const logoPath = `static/logos/${teamSlug}.png`;
        
        html += `
            <div class="team-card">
                <div class="team-logo-container">
                    <img src="${logoPath}" alt="${team.Team}" class="team-logo" onerror="this.src='/api/placeholder/36/36'">
                </div>
                <div class="team-name">${team.Team}</div>
                <div class="record">${team.Wins}-${team.Losses}-${team.Ties}</div>
                
                <div class="gp-container">
                    <div class="stat-label">GP</div>
                    <div class="stat-value">${team['Games Played']}</div>
                </div>
                
                <div class="gf-container">
                    <div class="stat-label">GS</div>
                    <div class="stat-value">${team['Goals Scored']}</div>
                </div>
                
                <div class="points-container">
                    <div class="stat-label">PTS</div>
                    <div class="stat-value">${team.Points}</div>
                </div>
            </div>
        `;
    });
    
    standingsContainer.innerHTML = html;
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`;
}

// Display error message
function displayError(message) {
    standingsContainer.innerHTML = `
        <div class="error">
            Error: ${message}<br>
            Make sure your Google Sheet is public (Anyone with the link can view).
        </div>
    `;
}

// Main function to fetch and display data
async function fetchAndDisplayData() {
    try {
        standingsContainer.innerHTML = '<div class="loading">Loading standings data...</div>';
        
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
