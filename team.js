// Import configuration
import { getSheetUrl, fetchSheetMappings, getAvailableSheets } from './config.js';
import { standingsPage, teamPage, scheduleContainer, lastUpdatedTeam, pageTitle } from './dom.js';

// Initialize sheet mappings
let sheetMappingsInitialized = false;
let initializationPromise = null;
let scheduleData = null;
let currentTeamName = null;

// Function to load schedule data from JSON
async function loadScheduleData() {
    try {
        const response = await fetch('schedule.json');
        if (!response.ok) {
            throw new Error('Failed to load schedule data');
        }
        scheduleData = await response.json();
        console.log('Schedule data loaded successfully');
    } catch (error) {
        console.error('Error loading schedule data:', error);
        throw error;
    }
}

// Function to handle hash changes
async function handleHashChange() {
    const hash = window.location.hash;
    console.log('Team module: Hash changed:', hash);
    
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
        
        console.log('Team module: Loading team data for:', teamName);
        
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
            appLogo.innerHTML = `<img src="static/logos/${teamSlug}.png" alt="${teamName}" 
                onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIGZpbGw9IiNFRUVFRUUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5BPC90ZXh0Pjwvc3ZnPg=='">`;
        }
        
        // Load team data
        try {
            // Always reload schedule data on page refresh
            scheduleData = null;
            await loadScheduleData();
            
            // Ensure sheet mappings are initialized
            await initializeSheetMappings();
            
            // Then load the team data
            await fetchAndDisplayAllGames(teamName);
        } catch (error) {
            console.error('Team module: Error loading team data:', error);
            scheduleContainer.innerHTML = `
                <div class="error">
                    Error loading team data: ${error.message}<br>
                    Please ensure the Google Sheet is public and accessible.
                </div>
            `;
        }
    } else {
        // Reset logo to default when returning to standings
        const appLogo = document.querySelector('.team-page .app-logo');
        if (appLogo) {
            appLogo.style.background = 'var(--logo-blue)';
            appLogo.innerHTML = '';
        }
    }
}

// Function to initialize sheet mappings
async function initializeSheetMappings() {
    // If already initialized, return immediately
    if (sheetMappingsInitialized) {
        console.log('Sheet mappings already initialized');
        return;
    }

    // If initialization is in progress, wait for it
    if (initializationPromise) {
        console.log('Waiting for existing initialization to complete...');
        await initializationPromise;
        return;
    }

    // Start new initialization
    console.log('Starting new sheet mappings initialization...');
    initializationPromise = (async () => {
        try {
            await fetchSheetMappings();
            sheetMappingsInitialized = true;
            console.log('Sheet mappings initialized successfully');
        } catch (error) {
            console.error('Failed to initialize sheet mappings:', error);
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
        
        const [score1, score2] = scoreStr.split('-').map(s => parseInt(s.trim(), 10));
        const score = {
            weekNumber,
            date: date || weekName,
            team1: {
                name: team1Name,
                final: score1 || 0,
                ot_so: gameLine[3]?.trim() || ''
            },
            team2: {
                name: team2Name,
                final: score2 || 0,
                ot_so: gameLine[3]?.trim() || ''
            }
        };
        
        // Only set winner if there are actual scores
        if (score.team1.final > 0 || score.team2.final > 0) {
            score.winner = score.team1.final > score.team2.final ? 
                score.team1.name : 
                score.team2.final > score.team1.final ? 
                score.team2.name : 'Tie';
        }
        
        console.log(`Parsed score for Game ${gameNumber}:`, score);
        return score;
    };
    
    // Parse both games
    console.log('Parsing Game 1...');
    const game1Score = parseGame(game1Start, 1);
    console.log('Parsing Game 2...');
    const game2Score = parseGame(game2Start, 2);
    
    // Add valid scores to the array
    if (game1Score) {
        console.log(`Found valid score in Game 1 for week ${weekNumber}`);
        scores.push(game1Score);
    }
    if (game2Score) {
        console.log(`Found valid score in Game 2 for week ${weekNumber}`);
        scores.push(game2Score);
    }
    
    console.log('Parsed scores for week', weekNumber, ':', scores);
    return scores;
}

// Function to combine schedule data with scores
function combineScheduleAndScores(teamName, scores) {
    console.log('Combining schedule data with scores for team:', teamName);
    
    // Get the team's games from the schedule data
    const teamGames = scheduleData.schedule.flatMap(week => {
        // Get all games for this week
        const weekGames = week.games;
        console.log(`Week ${week.week} games:`, weekGames);
        
        // Filter games that involve the team
        return weekGames
            .filter(game => {
                const involvesTeam = game.team1 === teamName || game.team2 === teamName;
                console.log(`Game ${game.team1} vs ${game.team2} involves ${teamName}:`, involvesTeam);
                return involvesTeam;
            })
            .map(game => ({
                weekNumber: week.week.toString(),
                date: week.date || null,
                team1: {
                    name: game.team1,
                    final: 0,
                    ot_so: ''
                },
                team2: {
                    name: game.team2,
                    final: 0,
                    ot_so: ''
                }
            }));
    });
    
    console.log('All games from schedule:', teamGames);
    
    // Add scores to the games
    scores.forEach(score => {
        // Find the game with matching week number
        const gameIndex = teamGames.findIndex(game => game.weekNumber === score.weekNumber);
        
        if (gameIndex !== -1) {
            // Update the game with the score data, but keep the original date
            teamGames[gameIndex] = {
                ...teamGames[gameIndex],
                team1: score.team1,
                team2: score.team2,
                winner: score.winner
            };
            console.log(`Updated scores for week ${score.weekNumber}`);
        } else {
            console.log(`No matching game found for score in week ${score.weekNumber}`);
        }
    });
    
    // Sort games by week number
    return teamGames.sort((a, b) => parseInt(a.weekNumber) - parseInt(b.weekNumber));
}

// Function to render team schedule
function renderTeamSchedule(teamName, games) {
    if (!games || games.length === 0) {
        scheduleContainer.innerHTML = '<div class="error">No schedule data available</div>';
        return;
    }

    let html = `
        <div class="schedule-grid">
            <div class="schedule-header">
                <div class="header-week">WK</div>
                <div class="header-date">DATE</div>
                <div class="header-opponent">Vs.</div>
                <div class="header-score">SCORE</div>
                <div class="header-result">W/L</div>
            </div>
    `;

    // Process games
    games.forEach(game => {
        const isTeam1 = game.team1.name === teamName;
        const opponent = isTeam1 ? game.team2.name : game.team1.name;
        const isFutureGame = !game.winner; // Game is future if there's no winner
        
        // Format date
        let formattedDate = 'TBD';
        if (game.date) {
            const [year, month, day] = game.date.split('-').map(num => parseInt(num, 10));
            if (year && month && day) {
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
        
        html += `
            <div class="schedule-row ${isFutureGame ? 'future-game' : ''}">
                <div class="schedule-week">${game.weekNumber}</div>
                <div class="schedule-date">${formattedDate}</div>
                <div class="schedule-opponent">
                    <img class="team-logo" src="static/logos/${opponent.toLowerCase().replace(/\s+/g, '_')}.png" 
                         alt="${opponent}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIGZpbGw9IiNFRUVFRUUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiPk5BPC90ZXh0Pjwvc3ZnPg=='">
                    <span>${opponent}</span>
                </div>
                <div class="schedule-score">
                    ${isFutureGame ? 
                        'TBD' :
                        `${game.team1.final} - ${game.team2.final}${game.team1.ot_so ? ` (${game.team1.ot_so})` : ''}`
                    }
                </div>
                <div class="schedule-result ${result.toLowerCase()}">${result}</div>
            </div>
        `;
    });

    html += '</div>';
    scheduleContainer.innerHTML = html;
}

// Function to update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    lastUpdatedTeam.textContent = `Last updated: ${now.toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Team module loaded, initializing...');
    // Initialize sheet mappings first
    initializeSheetMappings().catch(error => {
        console.error('Failed to initialize sheet mappings on load:', error);
    });
    
    // Check if there's a hash in the URL and handle it
    if (window.location.hash) {
        console.log('Team module: Initial hash detected:', window.location.hash);
        handleHashChange().catch(error => {
            console.error('Team module: Error handling initial hash:', error);
            scheduleContainer.innerHTML = `
                <div class="error">
                    Error loading team data: ${error.message}<br>
                    Please refresh the page.
                </div>
            `;
        });
    }
});

// Set up hash change listener
window.addEventListener('hashchange', () => {
    console.log('Team module: Hash change detected, handling...');
    handleHashChange().catch(error => {
        console.error('Team module: Error handling hash change:', error);
        scheduleContainer.innerHTML = `
            <div class="error">
                Error loading team data: ${error.message}<br>
                Please refresh the page.
            </div>
        `;
    });
});

// Function to fetch and display all games
async function fetchAndDisplayAllGames(teamName) {
    try {
        scheduleContainer.innerHTML = '<div class="loading">Loading schedule data...</div>';
        
        // Ensure sheet mappings are initialized
        await initializeSheetMappings();
        
        // Get all available sheets
        const availableSheets = await getAvailableSheets();
        console.log('All available sheets:', availableSheets);
        
        // Look for sheets that start with "Week " (note the space)
        const weekSheets = availableSheets.filter(sheet => 
            sheet.startsWith('Week ')
        );
        console.log('Found week sheets:', weekSheets);
        
        if (weekSheets.length === 0) {
            console.warn('No week sheets found! Available sheets:', availableSheets);
            scheduleContainer.innerHTML = '<div class="error">No schedule data available</div>';
            return;
        }
        
        // Create an array of promises for fetching each week's scores
        const fetchPromises = weekSheets.map(async week => {
            try {
                console.log(`Fetching scores for ${week}...`);
                const sheetUrl = await getSheetUrl(week);
                console.log('Sheet URL:', sheetUrl);
                
                const response = await fetch(sheetUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/csv',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${week}: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.text();
                if (!data || data.trim() === '') {
                    throw new Error(`Empty data received for ${week}`);
                }
                
                console.log(`Raw data for ${week}:`, data);
                const scores = parseGameScores(data, week, teamName);
                console.log(`Parsed scores for ${week}:`, scores);
                return scores;
            } catch (error) {
                console.error(`Error fetching ${week}:`, error);
                throw error; // Re-throw to be caught by Promise.all
            }
        });
        
        // Wait for all fetches to complete with a timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fetch operation timed out after 30 seconds')), 30000)
        );
        
        const scoreResults = await Promise.race([
            Promise.all(fetchPromises),
            timeoutPromise
        ]);
        
        // Load schedule data if not already loaded
        if (!scheduleData) {
            await loadScheduleData();
        }
        
        // Combine schedule data with scores
        const allGames = combineScheduleAndScores(teamName, scoreResults.flat());
        
        console.log('All games after combining:', allGames);
        renderTeamSchedule(teamName, allGames);
        updateLastUpdated();
    } catch (error) {
        console.error('Error in fetchAndDisplayAllGames:', error);
        scheduleContainer.innerHTML = `
            <div class="error">
                Error loading schedule data: ${error.message}<br>
                Please try refreshing the page. If the problem persists, check that:<br>
                1. The Google Sheet is public (Anyone with the link can view)<br>
                2. All week sheets are properly formatted<br>
                3. Your internet connection is stable
            </div>
        `;
    }
} 
