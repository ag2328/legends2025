// player-stats.js

import { getSheetUrl } from './config.js';

// Function to load player data from rosters.json
async function loadPlayerData() {
    try {
        const [rosterResponse, goalieResponse] = await Promise.all([
            fetch('static/data/rosters.json'),
            fetch('static/data/goalies.json')
        ]);
        
        if (!rosterResponse.ok || !goalieResponse.ok) {
            throw new Error('Failed to load player data');
        }
        
        const [rosterData, goalieData] = await Promise.all([
            rosterResponse.json(),
            goalieResponse.json()
        ]);
        
        return {
            lastUpdated: rosterData.lastUpdated,
            teams: rosterData.teams,
            goalies: goalieData.teams
        };
    } catch (error) {
        console.error('Error loading player data:', error);
        return null;
    }
}

function getTeamFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('team');
}

function formatTeamName(teamSlug) {
    if (!teamSlug) return '';
    if (teamSlug.includes('_')) {
        return teamSlug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else {
        return teamSlug.charAt(0).toUpperCase() + teamSlug.slice(1);
    }
}

function renderPlayerStats(teamName, playerData) {
    const container = document.getElementById('player-stats-table');
    if (!container) return;
    if (!playerData || !playerData.teams?.[teamName]) {
        container.innerHTML = '<div class="error">No player statistics available for this team.</div>';
        return;
    }
    const players = playerData.teams[teamName].players;
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="error">No players found for this team.</div>';
        return;
    }
    const skaters = players.filter(p => !p.isGoalie);
    const goalie = players.find(p => p.isGoalie);
    const sortedSkaters = [...skaters].sort((a, b) => parseInt(a.number) - parseInt(b.number));
    const skaterRows = sortedSkaters.map(player => {
        const goals = player.goals || 0;
        return `
            <tr>
                <td>${player.number}</td>
                <td>${player.name}</td>
                <td>${goals}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            </tr>
        `;
    }).join('');
    let goalieSection = '';
    if (goalie) {
        goalieSection = `
            <tr class="goalie-header-row" style="border-top:2px solid #888; background:#f7f7f7;">
                <th colspan="2">GOALTENDER</th>
                <th>SA</th>
                <th>GA</th>
                <th>SV</th>
                <th>SV%</th>
                <th></th>
            </tr>
            <tr class="goalie-row" style="border-bottom:2px solid #888;">
                <td>${goalie.number}</td>
                <td>${goalie.name}</td>
                <td>${goalie.shotAttempts ?? '-'}</td>
                <td>${goalie.goalsAllowed ?? '-'}</td>
                <td>${goalie.saves ?? '-'}</td>
                <td>${goalie.savePct !== undefined ? goalie.savePct.toFixed(3) : '-'}</td>
                <td></td>
            </tr>
        `;
    }
    container.innerHTML = `
        <table class="player-stats-table" style="width:100%;">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Goals</th>
                    <th colspan="4"></th>
                </tr>
            </thead>
            <tbody>
                ${skaterRows}
                ${goalieSection}
            </tbody>
        </table>
    `;
}

// Function to fetch player stats from Google Sheets
async function fetchPlayerStats(teamName) {
    try {
        const url = await getSheetUrl(teamName);
        console.log('Fetching player stats from:', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        console.log('Raw player stats data:', data);
        return parsePlayerStats(data);
    } catch (error) {
        console.error('Error fetching player stats:', error);
        return null;
    }
}

// Function to parse the CSV data into player stats
function parsePlayerStats(csvData) {
    console.log('Starting to parse player stats');
    const lines = csvData.split(/\r?\n/);
    const stats = {
        players: {},
        goalie: null
    };
    
    let inPlayerStatsSection = false;
    let inGoalieStatsSection = false;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Look for the start of player stats section
        if (line.includes('Player #,Player Name,Goals')) {
            console.log('Found player stats section at line:', i);
            inPlayerStatsSection = true;
            inGoalieStatsSection = false;
            continue;
        }
        
        // Look for the start of goalie stats section
        if (line.includes('Shot Attempts,Goals Allowed,Saves,Save %')) {
            inPlayerStatsSection = false;
            inGoalieStatsSection = true;
            continue;
        }
        
        // Parse player stats
        if (inPlayerStatsSection) {
            const [number, name, goals] = line.split(',').map(item => item.trim());
            console.log('Parsing player line:', { number, name, goals });
            if (name && !isNaN(parseInt(number))) {
                stats.players[name] = parseInt(goals) || 0;
                console.log('Added player stats:', { name, goals: stats.players[name] });
            }
        }
        
        // Parse goalie stats
        if (inGoalieStatsSection) {
            const [number, name, shotAttempts, goalsAllowed, saves, savePct] = line.split(',').map(item => item.trim());
            if (name && name.includes('(G)') && shotAttempts && goalsAllowed && saves) {
                stats.goalie = {
                    shotAttempts: parseInt(shotAttempts) || 0,
                    goalsAllowed: parseInt(goalsAllowed) || 0,
                    saves: parseInt(saves) || 0,
                    savePct: parseFloat(savePct) || 0
                };
            }
        }
    }
    
    console.log('Final parsed stats:', stats);
    return stats;
}

// Function to create the player stats grid
function createPlayerStatsGrid(teamName, playerData, stats) {
    console.log('Creating stats grid with data:', { teamName, playerData, stats });
    const container = document.createElement('div');
    container.className = 'player-stats-container';

    // --- Player Table ---
    const playersTable = document.createElement('table');
    playersTable.className = 'player-stats-table';
    playersTable.innerHTML = `
        <thead>
            <tr>
                <th style="text-align:center;">#</th>
                <th style="text-align:center;">Name</th>
                <th style="text-align:center;">Goals</th>
            </tr>
        </thead>
    `;
    const tbody = document.createElement('tbody');
    playerData.teams[teamName].players
        .sort((a, b) => a.number - b.number)
        .forEach(player => {
            // Normalize player names for comparison
            const playerName = player.name.trim();
            const statsName = Object.keys(stats.players).find(name => 
                name.trim() === playerName || 
                name.trim() === playerName + '.' || 
                name.trim() + '.' === playerName
            );
            console.log('Matching player:', { playerName, statsName, goals: stats.players[statsName] });
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align:center;">${player.number}</td>
                <td style="text-align:center;">${player.name}</td>
                <td style="text-align:center;">${statsName ? stats.players[statsName] || 0 : 0}</td>
            `;
            tbody.appendChild(row);
        });
    playersTable.appendChild(tbody);
    container.appendChild(playersTable);

    // --- Goalie Table ---
    const goalie = playerData.goalies[teamName];
    if (goalie) {
        const goalieStats = stats.goalie || {};
        const goalieTable = document.createElement('table');
        goalieTable.className = 'goalie-stats-table';
        goalieTable.innerHTML = `
            <thead>
                <tr>
                    <th style="text-align:center;">#</th>
                    <th style="text-align:center;">Name</th>
                    <th style="text-align:center;">SA</th>
                    <th style="text-align:center;">GA</th>
                    <th style="text-align:center;">SV</th>
                    <th style="text-align:center;">SV%</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align:center;">${goalie.number}</td>
                    <td style="text-align:center;">${goalie.name}</td>
                    <td style="text-align:center;">${goalieStats.shotAttempts ?? '-'}</td>
                    <td style="text-align:center;">${goalieStats.goalsAllowed ?? '-'}</td>
                    <td style="text-align:center;">${goalieStats.saves ?? '-'}</td>
                    <td style="text-align:center;">${goalieStats.savePct !== undefined ? goalieStats.savePct.toFixed(3) : '-'}</td>
                </tr>
            </tbody>
        `;
        container.appendChild(goalieTable);
    }
    return container;
}

// Function to initialize player stats for a team
export async function initializePlayerStats(teamName) {
    try {
        // Check if we're on the team page
        const teamPage = document.getElementById('team-page');
        if (!teamPage || !teamPage.classList.contains('active')) {
            return;
        }

        // Find the player stats container
        const container = document.getElementById('player-stats-container');
        if (!container) {
            return;
        }

        // Load player data from both JSON files
        const playerData = await loadPlayerData();
        if (!playerData || !playerData.teams[teamName]) {
            throw new Error('Failed to load player data');
        }
        
        // Fetch stats from Google Sheets
        const stats = await fetchPlayerStats(teamName);
        if (!stats) {
            throw new Error('Failed to fetch player stats');
        }
        
        // Create and append the stats grid
        const statsGrid = createPlayerStatsGrid(teamName, playerData, stats);
        container.innerHTML = '';
        container.appendChild(statsGrid);
    } catch (error) {
        const container = document.getElementById('player-stats-container');
        if (container) {
            container.innerHTML = `<div class="error">Error loading player stats: ${error.message}</div>`;
        }
    }
} 