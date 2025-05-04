// Fallback data in case the local file is unavailable
const FALLBACK_DATA = [
  { team: "Red Wings", w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0 },
  { team: "Maple Leafs", w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0 },
  { team: "Bruins", w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0 },
  { team: "Canadiens", w: 0, l: 0, t: 0, pts: 0, gf: 0, ga: 0 }
];

// Local CSV file path
const DATA_FILE = "data/standings.csv";

// Column mapping
const COLUMN_MAPPING = {
  // Team name variations
  '': 'team',
  'team': 'team',
  'name': 'team',
  'Team': 'team',
  'Name': 'team',
  // Win variations
  'w': 'w',
  'win': 'w',
  'wins': 'w',
  'W': 'w',
  'Wins': 'w',
  // Loss variations
  'l': 'l',
  'loss': 'l',
  'losses': 'l',
  'L': 'l',
  'Losses': 'l',
  // Tie variations
  't': 't',
  'tie': 't',
  'ties': 't',
  'T': 't',
  'Ties': 't',
  // Point variations
  'pts': 'pts',
  'points': 'pts',
  'PTS': 'pts',
  'Points': 'pts',
  // Goals for variations
  'gf': 'gf',
  'goals_for': 'gf',
  'goalsfor': 'gf',
  'goals for': 'gf',
  'GF': 'gf',
  'GoalsFor': 'gf',
  'Goals Scored': 'gf',
  // Goals against variations
  'ga': 'ga',
  'goals_against': 'ga',
  'goalsagainst': 'ga',
  'goals against': 'ga',
  'GA': 'ga',
  'GoalsAgainst': 'ga'
};

/**
 * Fetches standings data and renders the table
 */
async function fetchData() {
  showLoadingMessage();
  
  try {
    // Try to fetch from local file
    const response = await fetch(DATA_FILE);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const csv = await response.text();
    
    if (!csv || csv.trim() === "") {
      throw new Error("Empty data received");
    }
    
    const data = parseCSV(csv);
    
    if (!data || data.length === 0) {
      throw new Error("No data parsed from CSV");
    }
    
    // Check if all values are 0 (season hasn't started)
    const isSeasonStarted = data.some(team => 
      team.w > 0 || team.l > 0 || team.t > 0 || team.pts > 0 || team.gf > 0
    );
    
    if (!isSeasonStarted) {
      showErrorMessage("Season starts soon! Using placeholder data until games begin.");
      renderTable(data); // Use the actual team names from the CSV
      updateTimestamp("(season starts soon)");
    } else {
      renderTable(data);
      updateTimestamp();
    }
    
    hideLoadingMessage();
    hideErrorMessage();
  } catch (err) {
    console.error("Error loading standings:", err);
    showErrorMessage("Unable to load data file. Using placeholder data.");
    renderTable(FALLBACK_DATA);
    updateTimestamp("(using placeholder data)");
    hideLoadingMessage();
  }
}

/**
 * Fetches and parses CSV data from Google Sheets
 * @returns {Promise<Array>} Parsed data array
 */
async function fetchAndParseCSV() {
  const response = await fetch(DATA_FILE);
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  
  const csv = await response.text();
  
  if (!csv || csv.trim() === "") {
    throw new Error("Empty data received from server");
  }
  
  return parseCSV(csv);
}

/**
 * Parses CSV data into an array of objects
 * @param {string} csv - CSV data
 * @returns {Array} Array of objects with team data
 */
function parseCSV(csv) {
  try {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("Not enough data rows");
    }
    
    const headers = lines[0].split(",").map(h => h.trim());
    const mappedHeaders = headers.map(h => COLUMN_MAPPING[h] || h);
    
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      
      // Skip empty lines or lines with no team name
      if (values.length === 0 || (values.length === 1 && !values[0]) || !values[0]) {
        continue;
      }
      
      const obj = {
        team: values[0], // Team name is in the first column
        w: parseInt(values[1]) || 0, // Wins
        l: parseInt(values[2]) || 0, // Losses
        t: parseInt(values[3]) || 0, // Ties
        pts: parseInt(values[6]) || 0, // Points
        gf: parseInt(values[5]) || 0, // Goals Scored
        ga: 0 // Goals Against (not in the sheet)
      };
      
      result.push(obj);
    }
    
    return result;
  } catch (err) {
    console.error("Error parsing CSV:", err);
    return [];
  }
}

/**
 * Renders the standings table with team data
 * @param {Array} data - Array of team data objects
 */
function renderTable(data) {
  const standingsBody = document.querySelector("#standings");
  if (!standingsBody) {
    console.error("Standings body not found");
    return;
  }

  // Clear existing content
  standingsBody.innerHTML = "";

  if (!data || data.length === 0) {
    const placeholder = document.createElement("div");
    placeholder.className = "loading-placeholder";
    placeholder.textContent = "No data available";
    standingsBody.appendChild(placeholder);
    return;
  }

  // Sort by points and goals for
  data.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return b.gf - a.gf;
  });

  // Create rows for each team
  data.forEach((team, index) => {
    const row = document.createElement("div");
    row.className = `team-row ${index % 2 === 1 ? 'alt-row' : ''}`;
    
    // Create team cell with logo
    const teamCell = document.createElement("div");
    teamCell.className = "team-cell";
    
    const logoContainer = document.createElement("div");
    logoContainer.className = "logo-container";
    
    const img = document.createElement("img");
    const slug = team.team.toLowerCase().replace(/\s+/g, "_");
    img.src = `static/logos/${slug}.png`;
    img.alt = team.team;
    img.width = 30;
    img.height = 30;
    img.loading = "lazy";
    
    img.onerror = function() {
      // If logo fails to load, show first letter in a circle
      this.style.display = "none";
      const textLogo = document.createElement("div");
      textLogo.className = "text-logo";
      textLogo.textContent = team.team.charAt(0);
      this.parentNode.appendChild(textLogo);
    };
    
    // Preload the image to handle errors before adding to DOM
    const preloadImg = new Image();
    preloadImg.onload = function() {
      logoContainer.appendChild(img);
    };
    preloadImg.onerror = function() {
      const textLogo = document.createElement("div");
      textLogo.className = "text-logo";
      textLogo.textContent = team.team.charAt(0);
      logoContainer.appendChild(textLogo);
    };
    preloadImg.src = img.src;
    
    teamCell.appendChild(logoContainer);
    
    const teamName = document.createElement("span");
    teamName.className = "team-name";
    teamName.textContent = team.team;
    teamCell.appendChild(teamName);
    
    row.appendChild(teamCell);
    
    // Create stats container
    const statsContainer = document.createElement("div");
    statsContainer.className = "team-stats";
    
    // Add stats with proper spacing
    const stats = [
      { value: team.w, label: 'W' },
      { value: team.l, label: 'L' },
      { value: team.t, label: 'T' },
      { value: team.pts, label: 'PTS' },
      { value: team.gf, label: 'GF' },
      { value: team.ga || 0, label: 'GA' } // Use 0 as fallback for GA
    ];
    
    stats.forEach(stat => {
      const statDiv = document.createElement("div");
      statDiv.className = "stat";
      const statValue = document.createElement("span");
      statValue.className = "stat-value";
      statValue.textContent = stat.value;
      statDiv.appendChild(statValue);
      statsContainer.appendChild(statDiv);
    });
    
    row.appendChild(statsContainer);
    standingsBody.appendChild(row);
  });
}

/**
 * Updates the timestamp display
 * @param {string} [suffix] - Optional suffix to add to timestamp
 */
function updateTimestamp(suffix = "") {
  const now = new Date();
  const display = now.toLocaleString();
  document.getElementById("last-updated").textContent = `Last updated: ${display} ${suffix}`;
}

/**
 * Shows a loading message
 */
function showLoadingMessage() {
  // Remove any existing loading message
  hideLoadingMessage();
  
  // Create and show loading message
  const loadingElement = document.createElement("p");
  loadingElement.className = "loading";
  loadingElement.id = "loading-message";
  loadingElement.textContent = "Loading standings data...";
  
  const container = document.getElementById("status-container");
  container.appendChild(loadingElement);
}

/**
 * Hides the loading message
 */
function hideLoadingMessage() {
  const loadingElement = document.getElementById("loading-message");
  if (loadingElement) {
    loadingElement.remove();
  }
}

/**
 * Shows an error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  // Remove any existing error message
  hideErrorMessage();
  
  // Create and show error message
  const errorElement = document.createElement("p");
  errorElement.className = "error-message";
  errorElement.id = "error-message";
  errorElement.textContent = message;
  
  const container = document.getElementById("status-container");
  container.appendChild(errorElement);
}

/**
 * Hides the error message
 */
function hideErrorMessage() {
  const errorElement = document.getElementById("error-message");
  if (errorElement) {
    errorElement.remove();
  }
}

// Add event listeners when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initial data load
  fetchData();
  
  // Add refresh button handler
  document.getElementById("refresh-btn").addEventListener("click", fetchData);
  
  // Debug mode setup
  if (window.location.search.includes("debug")) {
    const debugInfo = document.createElement("div");
    debugInfo.id = "debug-info";
    debugInfo.innerHTML = `
      <h3>Debug Info</h3>
      <p>Sheet URL: ${DATA_FILE}</p>
      <button id="debug-fallback">Use Fallback Data</button>
      <button id="debug-test-headers">Test Header Mapping</button>
    `;
    
    document.querySelector("footer").appendChild(debugInfo);
    
    // Add debug button handlers
    document.getElementById("debug-fallback").addEventListener("click", () => {
      renderTable(FALLBACK_DATA);
      updateTimestamp("(debug fallback)");
    });
    
    document.getElementById("debug-test-headers").addEventListener("click", () => {
      console.log("Headers mapping test:", COLUMN_MAPPING);
      alert("Check console for header mapping");
    });
  }
});
