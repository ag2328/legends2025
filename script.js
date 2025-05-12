// Import configuration
import { getSheetUrl, fetchSheetMappings } from './config.js';
import { standingsPage, teamPage, standingsContainer, lastUpdated } from './dom.js';

// Configuration
let SHEET_URL = null;
let STATIC_DATA = null;

// Load static data
async function loadStaticData() {
    try {
        const [scheduleResponse, rostersResponse] = await Promise.all([
            fetch('/static/data/schedule.json'),
            fetch('/static/data/rosters.json')
        ]);
        
        if (!scheduleResponse.ok || !rostersResponse.ok) {
            throw new Error('Failed to load static data');
        }
        
        const schedule = await scheduleResponse.json();
        const rosters = await rostersResponse.json();
        
        STATIC_DATA = {
            schedule,
            rosters,
            teams: Object.keys(schedule.teams)
        };
        
        console.log('Loaded static data:', STATIC_DATA);
        return STATIC_DATA;
    } catch (error) {
        console.error('Error loading static data:', error);
        throw error;
    }
}

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

// Initialize the application
async function initialize() {
    try {
        console.log('Initializing application...');
        console.log('Loading static data...');
        await loadStaticData();
        console.log('Fetching sheet mappings...');
        await fetchSheetMappings();
        console.log('Getting sheet URL...');
        SHEET_URL = await getSheetUrl('standings');
        console.log('Sheet URL:', SHEET_URL);
        console.log('Handling hash change...');
        await handleHashChange();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error initializing application:', error);
        displayError('Failed to initialize application. Please refresh the page.');
        throw error;
    }
}

// Function to handle hash changes
async function handleHashChange() {
    const hash = window.location.hash;
    
    if (hash.startsWith('#team/')) {
        standingsPage.style.display = 'none';
        teamPage.classList.add('active');
    } else {
        standingsPage.style.display = 'block';
        teamPage.classList.remove('active');
        await fetchAndDisplayData();
    }
}

// Function to fetch data from Google Sheets
async function fetchLeaderboardData() {
    try {
        if (!SHEET_URL) {
            console.log('SHEET_URL not set, fetching from getSheetUrl...');
            SHEET_URL = await getSheetUrl('standings');
            console.log('SHEET_URL set to:', SHEET_URL);
        }
        
        console.log('Fetching data from:', SHEET_URL);
        let response;
        try {
            response = await fetch(SHEET_URL, {
                method: 'GET',
                headers: {
                    'Accept': 'text/csv'
                }
            });
            console.log('Response received:', response);
            console.log('Response status:', response.status);
            console.log('Response status text:', response.statusText);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            // Log the raw response for debugging
            const rawResponse = await response.text();
            console.log('Raw response:', rawResponse);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${rawResponse}`);
            }
            
            if (!rawResponse || rawResponse.trim() === '') {
                throw new Error('Received empty data from the server');
            }
            
            // Parse CSV data
            const lines = rawResponse.split(/\r?\n/);
            console.log('Split data into lines:', lines);
            
            if (lines.length < 2) {
                throw new Error('Not enough data in response');
            }
            
            // Get headers and remove quotes
            const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
            console.log('Headers:', headers);
            
            // Parse data rows
            const dynamicData = lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
                    console.log('Parsed values:', values);
                    return {
                        Team: values[1] || '',  // Second column is Team (first is empty)
                        Wins: parseInt(values[2] || '0', 10),
                        Losses: parseInt(values[3] || '0', 10),
                        Ties: parseInt(values[4] || '0', 10),
                        'Games Played': parseInt(values[5] || '0', 10),
                        'Goals Scored': parseInt(values[6] || '0', 10),
                        Points: parseInt(values[7] || '0', 10)
                    };
                })
                .filter(row => row.Team);
            
            console.log('Dynamic data from Google Sheets:', dynamicData);
            
            // Merge static and dynamic data
            const mergedData = STATIC_DATA.teams.map(teamName => {
                const dynamicTeam = dynamicData.find(d => d.Team === teamName) || {
                    Team: teamName,
                    Wins: 0,
                    Losses: 0,
                    Ties: 0,
                    'Games Played': 0,
                    'Goals Scored': 0,
                    Points: 0
                };
                
                return {
                    ...dynamicTeam,
                    schedule: STATIC_DATA.schedule.teams[teamName].schedule,
                    players: STATIC_DATA.rosters.teams[teamName].players
                };
            });
            
            console.log('Merged data:', mergedData);
            return { headers, data: mergedData };
        } catch (error) {
            console.error('Error reading response:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in fetchLeaderboardData:', error);
        displayError(`Error loading data: ${error.message}. Please ensure the Google Sheet is public and accessible.`);
        return null;
    }
}

// Render the leaderboard with Yahoo-style grid layout
function renderLeaderboard(leaderboardData) {
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
        if (!standingsContainer) {
            throw new Error('Standings container not found!');
        }
        
        standingsContainer.innerHTML = '<div class="loading">Loading standings data...</div>';
        
        const standingsData = await fetchLeaderboardData();
        if (standingsData) {
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
    try {
        initialize().catch(error => {
            console.error('Failed to initialize:', error);
            displayError('Failed to initialize application. Please refresh the page.');
        });
    } catch (error) {
        console.error('Error in DOMContentLoaded handler:', error);
        displayError('Failed to start application. Please refresh the page.');
    }
});

// Set up hash change listener
window.addEventListener('hashchange', () => {
    console.log('Hash change detected, handling...');
    try {
        handleHashChange().catch(error => {
            console.error('Error handling hash change:', error);
            displayError('Error loading page. Please refresh.');
        });
    } catch (error) {
        console.error('Error in hashchange handler:', error);
        displayError('Failed to handle page change. Please refresh.');
    }
});

// Refresh data every 5 minutes
setInterval(() => {
    if (standingsPage.style.display !== 'none') {
        fetchAndDisplayData().catch(error => {
            console.error('Error refreshing data:', error);
        });
    }
}, 5 * 60 * 1000);

