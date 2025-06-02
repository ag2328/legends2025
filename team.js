// Import configuration
import { getSheetUrl, fetchSheetMappings, getAvailableSheets } from './config.js';
import { standingsPage, teamPage, scheduleContainer, lastUpdatedTeam, pageTitle } from './dom.js';
import { initializePlayerStats } from './player-stats.js';

// Initialize sheet mappings
let sheetMappingsInitialized = false;
let initializationPromise = null;
let scheduleData = null;
let currentTeamName = null;

// Function to load schedule data from JSON
async function loadScheduleData() {
    try {
        const response = await fetch('static/data/schedule.json');
        if (!response.ok) {
            throw new Error('Failed to load schedule data');
        }
        scheduleData = await response.json();
    } catch (error) {
        console.error('Error loading schedule data:', error);
        throw error;
    }
}

// Function to clear cache when leaving team page
function clearCache() {
    scheduleData = null;
    currentTeamName = null;
    const scheduleContainer = document.getElementById('schedule');
    if (scheduleContainer) {
        scheduleContainer.innerHTML = '<div class="loading">Loading schedule data...</div>';
    }
    const statsContainer = document.getElementById('player-stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = '';
    }
}

// Function to handle hash changes
async function handleHashChange() {
    const hash = window.location.hash;
    
    if (hash.startsWith('#team/')) {
        const parts = hash.split('/');
        const teamSlug = parts[1];
        
        // Handle team name conversion for both formats
        let teamName;
        if (teamSlug.includes('_')) {
            // Handle teams with underscores (e.g., maple_leafs -> Maple Leafs)
            teamName = teamSlug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
            // Handle teams without underscores (e.g., canadiens -> Canadiens)
            teamName = teamSlug.charAt(0).toUpperCase() + teamSlug.slice(1);
        }
        
        // Store current team name
        currentTeamName = teamName;
        
        // Show team page and hide standings
        standingsPage.style.display = 'none';
        teamPage.classList.add('active');
        
        // Update team page title and logo
        pageTitle.textContent = `${teamName} Schedule`;
        const appLogo = document.querySelector('.team-page .app-logo');
        if (appLogo) {
            appLogo.style.background = 'none';
            const logoPath = `static/logos/${teamSlug}.png`;
            console.log('Team slug:', teamSlug);
            console.log('Logo path:', logoPath);
            appLogo.innerHTML = `<img src="${logoPath}" alt="${teamName}" 
                onerror="console.log('Logo failed to load:', this.src); this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIGZpbGw9IiNFRUVFRUUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5BPC90ZXh0Pjwvc3ZnPg=='">`;
        }

        // Create and position the player stats container
        let statsContainer = document.getElementById('player-stats-container');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'player-stats-container';
            statsContainer.style.marginTop = '32px';
            statsContainer.style.background = 'none';
            statsContainer.style.border = 'none';
            statsContainer.style.minHeight = '0';
            statsContainer.style.padding = '0';
            
            // Position the container
            const scheduleGrid = document.getElementById('schedule');
            const lastUpdated = document.getElementById('last-updated-team');
            if (scheduleGrid && lastUpdated && lastUpdated.parentNode) {
                lastUpdated.parentNode.insertBefore(statsContainer, lastUpdated);
            } else if (scheduleGrid && scheduleGrid.parentNode) {
                scheduleGrid.parentNode.appendChild(statsContainer);
            } else {
                teamPage.appendChild(statsContainer);
            }
        }
        statsContainer.innerHTML = '';
        
        // Load team data
        try {
            // Always reload schedule data on page refresh
            scheduleData = null;
            await loadScheduleData();
            
            // Ensure sheet mappings are initialized
            await initializeSheetMappings();
            
            // Then load the team data
            await fetchAndDisplayAllGames(teamName);
            
            // Initialize player stats
            await initializePlayerStats(teamName);
        } catch (error) {
            scheduleContainer.innerHTML = `
                <div class="error">
                    Error loading team data: ${error.message}<br>
                    Please ensure the Google Sheet is public and accessible.
                </div>
            `;
        }
    } else {
        // Clear cache when leaving team page
        clearCache();
        
        // Show standings page and hide team page
        standingsPage.style.display = 'block';
        teamPage.classList.remove('active');
    }
}

// Function to initialize sheet mappings
async function initializeSheetMappings() {
    // If already initialized, return immediately
    if (sheetMappingsInitialized) {
        return;
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
        await initializationPromise;
        return;
    }

    // Start new initialization
    initializationPromise = (async () => {
        try {
            await fetchSheetMappings();
            sheetMappingsInitialized = true;
        } catch (error) {
            sheetMappingsInitialized = false;
            throw error;
        } finally {
            initializationPromise = null;
        }
    })();

    await initializationPromise;
}

// Function to parse game scores from CSV
function parseGameScores(csvData, weekName, teamName) {
    console.log('Parsing scores for:', weekName, 'for team:', teamName);
    const lines = csvData.split(/\r?\n/);
    const scores = [];
    
    // Extract week number from first line (e.g., "Week,1,Date,5/4/2025" -> "1")
    const headerLine = lines[0].split(',');
    const weekNumber = headerLine[1]?.trim();
    const dateStr = headerLine[3]?.trim();
    let date = null;
    
    if (dateStr) {
        // Parse date in format "M/D/YYYY"
        const [month, day, year] = dateStr.split('/').map(num => parseInt(num, 10));
        if (month && day && year) {
            date = new Date(year, month - 1, day);
            // Format as YYYY-MM-DD
            date = date.toISOString().split('T')[0];
            console.log('Parsed date:', date);
        }
    }
    
    // Find Game 1 and Game 2 sections
    let game1Start = -1;
    let game2Start = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('Game 1:')) {
            game1Start = i + 2; // Skip the "Game 1:" line and the header line
            console.log('Found Game 1 at line:', i);
        } else if (line.includes('Game 2')) {
            game2Start = i + 2; // Skip the "Game 2" line and the header line
            console.log('Found Game 2 at line:', i);
        }
    }
    
    console.log('Game 1 start:', game1Start, 'Game 2 start:', game2Start);
    
    // Helper function to parse a game
    const parseGame = (gameStart, gameNumber) => {
        if (gameStart === -1) {
            console.log(`No data for Game ${gameNumber}`);
            return null;
        }
        
        const gameLine = lines[gameStart].split(',');
        console.log(`Game ${gameNumber} line:`, gameLine);
        
        if (gameLine.length < 3) {
            console.log(`Invalid game data for Game ${gameNumber}:`, gameLine);
            return null;
        }
        
        const team1Name = gameLine[0]?.trim();
        const team2Name = gameLine[1]?.trim();
        const scoreStr = gameLine[2]?.trim();
        
        console.log(`Week ${weekNumber} Game ${gameNumber} teams:`, { team1: team1Name, team2: team2Name });
        
        if (!team1Name || !team2Name) {
            console.log(`Missing team names in Game ${gameNumber}`);
            return null;
        }
        
        if (!(team1Name === teamName || team2Name === teamName)) {
            console.log(`Team ${teamName} not found in Game ${gameNumber}`);
            return null;
        }
        
        if (!scoreStr) {
            console.log(`No score for Game ${gameNumber}`);
            return null;
        }
        
        // Handle both hyphen and slash separators
        const [score1, score2] = scoreStr.split(/[-/]/).map(s => parseInt(s.trim(), 10));
        
        if (isNaN(score1) || isNaN(score2)) {
            console.log(`Invalid score format for Game ${gameNumber}:`, scoreStr);
            return null;
        }
        
        return {
            weekNumber,
            date: date || weekName,
            team1: {
                name: team1Name,
                final: score1,
                ot_so: gameLine[3]?.trim() || ''
            },
            team2: {
                name: team2Name,
                final: score2,
                ot_so: gameLine[3]?.trim() || ''
            },
            winner: score1 > score2 ? 
                team1Name : 
                score2 > score1 ? 
                team2Name : 'Tie'
        };
    };
    
    // Parse both games
    const game1Score = parseGame(game1Start, 1);
    const game2Score = parseGame(game2Start, 2);
    
    // Add valid scores to the array
    if (game1Score) {
        scores.push(game1Score);
    }
    if (game2Score) {
        scores.push(game2Score);
    }
    
    return scores;
}

// Function to combine schedule data with scores
function combineScheduleAndScores(teamName, scores) {
    // Get the team's schedule directly from the new structure
    const teamSchedule = scheduleData.teams[teamName]?.schedule || [];
    console.log('Team schedule from JSON:', teamSchedule);
    
    // Map the schedule to the expected format
    const teamGames = teamSchedule.map(game => ({
        weekNumber: game.week.toString(),
        date: game.date,
        team1: {
            name: teamName,
            final: 0,
            ot_so: ''
        },
        team2: {
            name: game.opponent,
            final: 0,
            ot_so: ''
        }
    }));
    
    console.log('Initial team games:', teamGames);
    
    // Add scores to the games
    scores.forEach(score => {
        // Find the game with matching week number
        const gameIndex = teamGames.findIndex(game => {
            const gameWeek = parseInt(game.weekNumber);
            const scoreWeek = parseInt(score.weekNumber);
            return gameWeek === scoreWeek;
        });
        
        console.log(`Looking for week ${score.weekNumber}, found at index:`, gameIndex);
        
        if (gameIndex !== -1) {
            // Update the game with the score data, but keep the original date
            teamGames[gameIndex] = {
                ...teamGames[gameIndex],
                team1: score.team1,
                team2: score.team2,
                winner: score.winner
            };
            console.log(`Updated game for week ${score.weekNumber}:`, teamGames[gameIndex]);
        }
    });
    
    // Sort games by week number
    return teamGames.sort((a, b) => parseInt(a.weekNumber) - parseInt(b.weekNumber));
}

// Function to render team schedule
function renderTeamSchedule(teamName, games) {
    const scheduleContainer = document.getElementById('schedule');
    if (!scheduleContainer) return;
    
    if (!games || games.length === 0) {
        scheduleContainer.innerHTML = '<div class="error">No schedule data available</div>';
        return;
    }
    
    let html = `
        <div class="schedule-header">
            <div class="header-week">WK</div>
            <div class="header-date">DATE</div>
            <div class="header-opponent">Vs.</div>
            <div class="header-score">SCORE</div>
            <div class="header-result">W/L</div>
        </div>
    `;
    games.forEach(game => {
        const isTeam1 = game.team1.name === teamName;
        const opponent = isTeam1 ? game.team2.name : game.team1.name;
        const isFutureGame = !game.team1.final && !game.team2.final;
        
        // Format date
        let formattedDate = 'TBD';
        if (game.date) {
            // Handle both YYYY-MM-DD and MM/DD/YYYY formats
            if (game.date.includes('-')) {
                const [year, month, day] = game.date.split('-');
                formattedDate = `${month}/${day}`;
            } else if (game.date.includes('/')) {
                const [month, day] = game.date.split('/');
                formattedDate = `${month}/${day}`;
            }
        }
        
        // Determine W/L/T result
        let result = '';
        if (!isFutureGame) {
            if (game.winner === 'Tie') {
                result = 'T';
            } else {
                result = game.winner === teamName ? 'W' : 'L';
            }
        }
        
        // Format score
        let scoreDisplay = 'TBD';
        if (!isFutureGame) {
            const teamScore = isTeam1 ? game.team1.final : game.team2.final;
            const opponentScore = isTeam1 ? game.team2.final : game.team1.final;
            scoreDisplay = `${teamScore}-${opponentScore}`;
            if (game.team1.ot_so) {
                scoreDisplay += ` (${game.team1.ot_so})`;
            }
        }
        
        html += `
            <div class="schedule-row${isFutureGame ? ' future-game' : ''}">
                <div class="schedule-week">${game.weekNumber}</div>
                <div class="schedule-date">${formattedDate}</div>
                <div class="schedule-opponent">
                    <img class="team-logo" src="static/logos/${opponent.toLowerCase().replace(/\s+/g, '_')}.png" 
                         alt="${opponent}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIGZpbGw9IiNFRUVFRUUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5BPC90ZXh0Pjwvc3ZnPg=='">
                    <span>${opponent}</span>
                </div>
                <div class="schedule-score">${scoreDisplay}</div>
                <div class="schedule-result ${result.toLowerCase()}">${result}</div>
            </div>
        `;
    });
    scheduleContainer.innerHTML = html;
}

// Function to update last updated message
function updateLastUpdated() {
    lastUpdatedTeam.textContent = 'Standings updated by 8pm on Mondays';
}

async function fetchAndDisplayAllGames(teamName) {
    try {
        // Get all available sheets
        const sheets = await getAvailableSheets();
        console.log('Available sheets:', sheets);
        
        // Filter for week sheets
        const weekSheets = sheets.filter(sheet => sheet.toLowerCase().startsWith('week'));
        console.log('Week sheets:', weekSheets);
        
        // Fetch scores for each week
        const allScores = [];
        
        for (const weekName of weekSheets) {
            const url = await getSheetUrl(weekName);
            console.log(`Fetching scores for ${weekName} from:`, url);
            
            const response = await fetch(url);
            if (!response.ok) {
                console.log(`Failed to fetch ${weekName}:`, response.status);
                continue;
            }
            
            const data = await response.text();
            console.log(`Raw data for ${weekName}:`, data);
            
            const scores = parseGameScores(data, weekName, teamName);
            console.log(`Parsed scores for ${weekName}:`, scores);
            
            // If no scores found for this week, stop processing further weeks
            if (!scores || scores.length === 0) {
                console.log(`No scores found for ${weekName}, stopping further processing`);
                break;
            }
            
            // Add scores if they exist
            allScores.push(...scores);
        }
        
        console.log('All collected scores:', allScores);
        
        // Combine schedule data with scores
        const combinedGames = combineScheduleAndScores(teamName, allScores);
        console.log('Combined games:', combinedGames);
        
        renderTeamSchedule(teamName, combinedGames);
        
        // Update last updated message
        updateLastUpdated();
    } catch (error) {
        console.error('Error in fetchAndDisplayAllGames:', error);
        scheduleContainer.innerHTML = `
            <div class="error">
                Error loading schedule: ${error.message}<br>
                Please ensure the Google Sheet is public and accessible.
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set up hash change handling
    window.addEventListener('hashchange', handleHashChange);
    // Initial load
    handleHashChange();
});