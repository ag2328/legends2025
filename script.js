const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub?gid=0&single=true&output=csv";

async function fetchData() {
  const loadingElement = document.createElement("p");
  loadingElement.className = "loading";
  loadingElement.textContent = "Loading data...";
  document.querySelector("main").appendChild(loadingElement);
  
  try {
    const res = await fetch(SHEET_URL);
    
    // Check if the request was successful
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    
    const csv = await res.text();
    
    // Basic validation to ensure we have CSV data
    if (!csv || csv.trim() === "") {
      throw new Error("Empty data received");
    }
    
    const rows = csv.trim().split("\n").map(row => row.split(","));
    
    // Check if we have at least a header row
    if (rows.length < 1) {
      throw new Error("Invalid CSV format: no header row");
    }
    
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = row[i]?.trim() || "0"; // Default to "0" for missing values
      });
      return obj;
    });
    
    renderTable(data);
    updateTimestamp();
    
    // Remove any error messages
    const errorElement = document.querySelector(".error-message");
    if (errorElement) {
      errorElement.remove();
    }
  } catch (err) {
    console.error("Error loading standings:", err);
    showErrorMessage("Failed to load standings. Please try again later.");
  } finally {
    // Remove loading message
    loadingElement.remove();
  }
}

function renderTable(data) {
  const tbody = document.querySelector("#standings tbody");
  tbody.innerHTML = "";

  // Add fallback if no data
  if (!data || data.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8">No team data available</td>`;
    tbody.appendChild(tr);
    return;
  }

  // Sort data by points, then by goals for as tiebreaker
  data.sort((a, b) => {
    const ptsA = parseInt(a.PTS || 0);
    const ptsB = parseInt(b.PTS || 0);
    if (ptsB !== ptsA) return ptsB - ptsA;
    return parseInt(b.GF || 0) - parseInt(a.GF || 0);
  });

  data.forEach((team, index) => {
    const tr = document.createElement("tr");
    
    // Apply alternate row styling
    if (index % 2 === 1) {
      tr.className = "alt-row";
    }

    // Use safeguard for team name
    const teamName = team.Team || "Unknown Team";
    const teamSlug = teamName.toLowerCase().replace(/\s+/g, "_");
    
    // Create logo cell with error handling
    const logoImg = document.createElement("img");
    logoImg.src = `static/logos/${teamSlug}.png`;
    logoImg.alt = teamName;
    logoImg.width = 30;
    logoImg.onerror = function() {
      this.src = "static/logos/default.png";
      this.classList.add("error");
      // If default image is also missing, show text instead
      this.onerror = function() {
        this.style.display = "none";
        this.parentNode.textContent = teamName.charAt(0);
      };
    };
    
    const logoCell = document.createElement("td");
    logoCell.appendChild(logoImg);
    
    // Create all cells with safe value access
    tr.appendChild(logoCell);
    tr.appendChild(createCell(teamName));
    tr.appendChild(createCell(team.W || "0"));
    tr.appendChild(createCell(team.L || "0"));
    tr.appendChild(createCell(team.T || "0"));
    tr.appendChild(createCell(team.PTS || "0"));
    tr.appendChild(createCell(team.GF || "0"));
    tr.appendChild(createCell(team.GA || "0"));
    
    tbody.appendChild(tr);
  });
}

function createCell(content) {
  const td = document.createElement("td");
  td.textContent = content;
  return td;
}

function updateTimestamp() {
  const now = new Date();
  const display = now.toLocaleString();
  document.getElementById("last-updated").textContent = `Last updated: ${display}`;
}

function showErrorMessage(message) {
  // Remove any existing error message
  const existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
  
  // Create error element
  const errorElement = document.createElement("p");
  errorElement.className = "error-message";
  errorElement.textContent = message;
  
  // Insert after the table
  const table = document.getElementById("standings");
  table.parentNode.insertBefore(errorElement, table.nextSibling);
}

// Add event listener for page load
document.addEventListener("DOMContentLoaded", () => {
  // Initial load
  fetchData();
  
  // Add refresh button event listener
  const refreshButton = document.querySelector("button");
  refreshButton.addEventListener("click", fetchData);
});
