// Import configuration
import { getSheetUrl, fetchSheetMappings } from './config.js';
import { standingsPage, teamPage, standingsContainer, lastUpdated } from './dom.js';

// Configuration
let SHEET_URL = null;

// Initialize the application
async function initialize() {
    try {
        console.log('Initializing application...');
        // Fetch sheet mappings first
        console.log('Fetching sheet mappings...');
        await fetchSheetMappings();
        console.log('Sheet mappings fetched successfully');
        
        // Get the standings URL after mappings are initialized
        SHEET_URL = await getSheetUrl('standings');
        console.log('Standings URL:', SHEET_URL);
        
        // Then handle the initial page load
        await handleHashChange();
    } catch (error) {
        console.error('Error initializing application:', error);
        displayError('Failed to initialize application. Please refresh the page.');
    }
}

// Function to handle hash changes
async function handleHashChange() {
    const hash = window.location.hash;
    console.log('Hash changed:', hash);
    
    if (hash.startsWith('#team/')) {
        // Show team page and hide standings
        standingsPage.style.display = 'none';
        teamPage.classList.add('active');
    } else {
        // Show standings and hide team page
        standingsPage.style.display = 'block';
        teamPage.classList.remove('active');
        // Only fetch standings data when on the standings page
        await fetchAndDisplayData();
    }
}

// Function to fetch data from Google Sheets
async function fetchLeaderboardData() {
    try {
        console.log('Starting fetchLeaderboardData...');
        if (!SHEET_URL) {
            console.log('Getting standings URL...');
            SHEET_URL = await getSheetUrl('standings');
        }
        console.log('Fetching from URL:', SHEET_URL);
        
        const response = await fetch(SHEET_URL, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        console.log('Raw CSV data received:', data);
        
        if (!data || data.trim() === '') {
            throw new Error('Received empty data from the server');
        }
        
        const parsedData = parseCSV(data);
        console.log('Parsed data:', parsedData);
        return parsedData;
    } catch (error) {
        console.error('Error in fetchLeaderboardData:', error);
        displayError(`Error loading data: ${error.message}. Please ensure the Google Sheet is public and accessible.`);
        return null;
    }
}

// Parse CSV data
function parseCSV(csvText) {
    console.log('Starting parseCSV with text:', csvText);
    const lines = csvText.split(/\r?\n/);
    console.log('Split into lines:', lines);
    
    if (lines.length < 2) throw new Error('Invalid CSV data');
    
    // Find the header row (skip empty rows)
    let headerRow = 0;
    while (headerRow < lines.length && !lines[headerRow].trim()) {
        headerRow++;
    }
    
    if (headerRow >= lines.length) throw new Error('No headers found');
    
    console.log('Found header row:', lines[headerRow]);
    
    // Clean up headers
    const headers = ['Team', 'Wins', 'Losses', 'Ties', 'Games Played', 'Goals Scored', 'Points'];
    
    console.log('Using headers:', headers);
    
    const data = [];
    
    // Process data rows
    for (let i = headerRow + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        console.log('Processing row:', values);
        
        // Skip empty rows
        if (values.length < 2) continue;
        
        const entry = {
            Team: values[1]?.trim(),
            Wins: parseInt(values[2]?.trim() || '0', 10),
            Losses: parseInt(values[3]?.trim() || '0', 10),
            Ties: parseInt(values[4]?.trim() || '0', 10),
            'Games Played': parseInt(values[5]?.trim() || '0', 10),
            'Goals Scored': parseInt(values[6]?.trim() || '0', 10),
            Points: parseInt(values[7]?.trim() || '0', 10)
        };
        
        if (entry.Team) {
            data.push(entry);
        }
    }
    
    console.log('Processed data:', data);
    return { headers, data };
}

// Render the leaderboard with Yahoo-style grid layout
function renderLeaderboard(leaderboardData) {
    console.log('Rendering leaderboard with data:', leaderboardData);
    if (!leaderboardData || !leaderboardData.data.length) {
        standingsContainer.innerHTML = '<div class="error">No data available</div>';
        return;
    }

    // Sort data by points (descending), then by wins, then by goals scored
    const sortedData = [...leaderboardData.data].sort((a, b) => {
        const pointsDiff = b.Points - a.Points;
        if (pointsDiff !== 0) return pointsDiff;
        const winsDiff = b.Wins - a.Wins;
        if (winsDiff !== 0) return winsDiff;
        return b['Goals Scored'] - a['Goals Scored'];
    });

    console.log('Sorted data:', sortedData);

    let html = '';
    // Header row
    html += `
      <div class="standings-header">
        <div></div>
        <div class="header-team">TEAM</div>
        <div class="header-gp">GP</div>
        <div class="header-w">W</div>
        <div class="header-l">L</div>
        <div class="header-t">T</div>
        <div class="header-gs">GS</div>
        <div class="header-pts">PTS</div>
      </div>
    `;
    // Team rows
    sortedData.forEach((team) => {
        const teamSlug = team.Team.toLowerCase().replace(/\s+/g, '_');
        const logoPath = `static/logos/${teamSlug}.png`;
        html += `
          <div class="standings-row">
            <img class="team-logo" src="${logoPath}" alt="${team.Team}" onerror="this.src='/api/placeholder/36/36'">
            <div class="team-name"><a href="#team/${teamSlug}">${team.Team}</a></div>
            <div class="team-gp">${team['Games Played']}</div>
            <div class="team-w">${team.Wins}</div>
            <div class="team-l">${team.Losses}</div>
            <div class="team-t">${team.Ties}</div>
            <div class="team-gs">${team['Goals Scored']}</div>
            <div class="team-pts">${team.Points}</div>
          </div>
        `;
    });
    standingsContainer.innerHTML = html;
    console.log('Rendered HTML:', html);
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
    if (standingsContainer) {
        standingsContainer.innerHTML = `<div class="error">Error: ${message}</div>`;
    }
    if (lastUpdated) {
        lastUpdated.textContent = 'Last updated: Error loading data';
    }
}

// Main function to fetch and display data
async function fetchAndDisplayData() {
    try {
        console.log('Starting fetchAndDisplayData...');
        if (!standingsContainer) {
            throw new Error('Standings container not found!');
        }
        
        standingsContainer.innerHTML = '<div class="loading">Loading standings data...</div>';
        
        const standingsData = await fetchLeaderboardData();
        if (standingsData) {
            console.log('Standings data received:', standingsData);
            renderLeaderboard(standingsData);
            updateLastUpdated();
        } else {
            displayError('Failed to load standings data');
        }
    } catch (error) {
        console.error('Error in fetchAndDisplayData:', error);
        displayError(error.message);
    }
}

// Initial load
console.log('Script loaded, starting initialization...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting initialization...');
    initialize().catch(error => {
        console.error('Failed to initialize:', error);
        displayError('Failed to initialize application. Please refresh the page.');
    });
});

// Set up hash change listener
window.addEventListener('hashchange', () => {
    console.log('Hash change detected, handling...');
    handleHashChange().catch(error => {
        console.error('Error handling hash change:', error);
        displayError('Error loading page. Please refresh.');
    });
});

// Refresh data every 5 minutes
setInterval(() => {
    if (standingsPage.style.display !== 'none') {
        fetchAndDisplayData().catch(error => {
            console.error('Error refreshing data:', error);
        });
    }
}, 5 * 60 * 1000);

