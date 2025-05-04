// Google Sheets CSV URL
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub?gid=0&single=true&output=csv";

// Fallback data in case the fetch fails
const FALLBACK_DATA = [
  { team: "Red Wings", w: 5, l: 2, t: 1, pts: 11, gf: 25, ga: 18 },
  { team: "Maple Leafs", w: 4, l: 3, t: 1, pts: 9, gf: 22, ga: 20 },
  { team: "Bruins", w: 3, l: 3, t: 2, pts: 8, gf: 19, ga: 19 },
  { team: "Canadiens", w: 2, l: 5, t: 1, pts: 5, gf: 15, ga: 24 },
  { team: "Lightning", w: 1, l: 6, t: 1, pts: 3, gf: 12, ga: 22 }
];

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
 * Fetches standings data from Google Sheets and renders the table
 */
async function fetchData() {
  showLoadingMessage();
  
  try {
    // Try to fetch data from Google Sheets
    const data = await fetchAndParseCSV();
    
    if (!data || data.length === 0) {
      throw new Error("No data returned from server");
    }
    
    // Render the table with the fetched data
    renderTable(data);
    updateTimestamp();
    hideLoadingMessage();
    hideErrorMessage();
  } catch (err) {
    console.error("Error loading standings:", err);
    
    // Show error message to the user
    showErrorMessage("Unable to load latest data. Using cached data instead.");
    
    // Use fallback data
    renderTable(FALLBACK_DATA);
    updateTimestamp("(using cached data)");
    hideLoadingMessage();
  }
}

/**
 * Fetches and parses CSV data from Google Sheets
 * @returns {Promise<Array>} Parsed data array
 */
async function fetchAndParseCSV() {
  const response = await fetch(SHEET_URL);
  
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
      if (values.length === 0 || (values.length === 1 && !values[0]) || !values[1]) {
        continue;
      }
      
      const obj = {
        team: values[1] || "Unknown Team", // Team name is in the second column
        w: parseInt(values[2]) || 0, // Wins
        l: parseInt(values[3]) || 0, // Losses
        t: parseInt(values[4]) || 0, // Ties
        pts: parseInt(values[7]) || 0, // Points
        gf: parseInt(values[6]) || 0, // Goals Scored
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
  const tbody = document.querySelector("#standings tbody");
  tbody.innerHTML = "";
  
  // Sort by points (high to low) then by goals for (high to low)
  data.sort((a, b) => {
    // First compare by points
    const pointsDiff = b.pts - a.pts;
    if (pointsDiff !== 0) return pointsDiff;
    
    // If points are equal, break tie with goals for
    return b.gf - a.gf;
  });
  
  // Render each team row
  data.forEach((team, index) => {
    const tr = document.createElement("tr");
    
    // Apply alternating row styles
    if (index % 2 === 1) {
      tr.classList.add("alt-row");
    }
    
    // Get team name and slug for logo
    const teamName = team.team || "Unknown Team";
    const teamSlug = teamName.toLowerCase().replace(/\s+/g, "_");
    
    // Create logo cell with error handling
    const logoCell = document.createElement("td");
    const logoImg = document.createElement("img");
    logoImg.src = `static/logos/${teamSlug}.png`;
    logoImg.alt = teamName;
    logoImg.width = 30;
    
    // Handle missing images
    logoImg.onerror = function() {
      // Try with fallback image
      this.src = "static/logos/default.png";
      this.classList.add("error");
      
      // If default is also missing, show first letter of team name
      this.onerror = function() {
        this.style.display = "none";
        logoCell.textContent = teamName.charAt(0).toUpperCase();
        logoCell.classList.add("text-logo");
      };
    };
    
    logoCell.appendChild(logoImg);
    tr.appendChild(logoCell);
    
    // Add the rest of the cells
    tr.appendChild(createCell(teamName));
    tr.appendChild(createCell(team.w));
    tr.appendChild(createCell(team.l));
    tr.appendChild(createCell(team.t));
    tr.appendChild(createCell(team.pts));
    tr.appendChild(createCell(team.gf));
    tr.appendChild(createCell(team.ga));
    
    tbody.appendChild(tr);
  });
}

/**
 * Creates a table cell with the given content
 * @param {*} content - Cell content
 * @returns {HTMLElement} TD element
 */
function createCell(content) {
  const td = document.createElement("td");
  td.textContent = content;
  return td;
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

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  // Initial data load
  fetchData();
  
  // Set up refresh button
  const refreshButton = document.getElementById("refresh-btn");
  if (refreshButton) {
    refreshButton.addEventListener("click", fetchData);
  }
  
  // Check for debugging parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("debug")) {
    console.log("Debug mode enabled");
    
    // Add debug info to the page
    const debugInfo = document.createElement("div");
    debugInfo.id = "debug-info";
    debugInfo.innerHTML = `
      <h3>Debug Info</h3>
      <p>Sheet URL: ${SHEET_URL}</p>
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
