const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

const BASE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub';
const SHEET_MAPPINGS = {
    'Maple Leafs': '1499474245',
    'Canadiens': '1883457933',
    'Bruins': '854028421',
    'Red Wings': '335533588'
};

async function fetchTeamRoster(team) {
    try {
        const gid = SHEET_MAPPINGS[team];
        const teamUrl = `${BASE_SHEET_URL}?gid=${gid}&single=true&output=csv`;
        console.log(`Fetching ${team} roster from: ${teamUrl}`);
        
        const response = await fetch(teamUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${team} sheet: ${response.status}`);
        }
        
        const data = await response.text();
        console.log(`Raw ${team} data:`, data);
        
        const lines = data.split(/\r?\n/);
        const players = [];
        
        // Skip header row and process each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Skip rows that start with "Coach"
            if (line.toLowerCase().startsWith('coach')) {
                console.log(`Skipping coach row:`, line);
                continue;
            }
            
            const [number, name] = line.split('\t').map(field => field.trim());
            
            // Skip header rows or invalid data
            if (!number || !name || name.toLowerCase() === 'player name') {
                console.log(`Skipping invalid row:`, line);
                continue;
            }
            
            // Check if player is a goalie
            const isGoalie = name.includes('(G)');
            const cleanName = name.replace('(G)', '').trim();
            
            players.push({
                number: number ? parseInt(number) : 0,
                name: cleanName,
                isGoalie: isGoalie,
                goals: 0,
                saves: isGoalie ? 0 : null
            });
        }
        
        console.log(`Parsed ${players.length} players for ${team}:`, players);
        return players;
    } catch (error) {
        console.error(`Error fetching ${team} roster:`, error);
        return [];
    }
}

async function updateRosters() {
    try {
        const teams = ['Maple Leafs', 'Canadiens', 'Bruins', 'Red Wings'];
        const allPlayerData = {
            lastUpdated: new Date().toISOString(),
            teams: {}
        };

        for (const team of teams) {
            const players = await fetchTeamRoster(team);
            allPlayerData.teams[team] = { players };
        }

        // Ensure static/data directory exists
        const dataDir = path.join(__dirname, 'static', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save to static/data/rosters.json
        const outputPath = path.join(dataDir, 'rosters.json');
        fs.writeFileSync(outputPath, JSON.stringify(allPlayerData, null, 4));
        console.log('Successfully updated static/data/rosters.json');
    } catch (error) {
        console.error('Error updating rosters:', error);
    }
}

updateRosters(); 