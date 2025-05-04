const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub?gid=0&single=true&output=csv";

async function fetchData() {
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();
    const rows = csv.trim().split("\n").map(row => row.split(","));

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = row[i]?.trim();
      });
      return obj;
    });

    renderTable(data);
    updateTimestamp();
  } catch (err) {
    console.error("Error loading standings:", err);
  }
}

function renderTable(data) {
  const tbody = document.querySelector("#standings tbody");
  tbody.innerHTML = "";

  data.sort((a, b) => {
    const ptsA = parseInt(a.PTS);
    const ptsB = parseInt(b.PTS);
    if (ptsB !== ptsA) return ptsB - ptsA;
    return parseInt(b.GF) - parseInt(a.GF); // tiebreaker
  });

  data.forEach(team => {
    const tr = document.createElement("tr");

    const teamSlug = team.Team.toLowerCase().replace(/\s+/g, "_");
    const logoCell = `<td><img src="static/logos/${teamSlug}.png" alt="${team.Team}" width="30" /></td>`;
    const cells = [
      logoCell,
      `<td>${team.Team}</td>`,
      `<td>${team.W}</td>`,
      `<td>${team.L}</td>`,
      `<td>${team.T}</td>`,
      `<td>${team.PTS}</td>`,
      `<td>${team.GF}</td>`,
      `<td>${team.GA}</td>`
    ];

    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  });
}

function updateTimestamp() {
  const now = new Date();
  const display = now.toLocaleString();
  document.getElementById("last-updated").textContent = `Last updated: ${display}`;
}

// Initial load
fetchData();
