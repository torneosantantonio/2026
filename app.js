const STORAGE_MATCH_RESULTS_KEY = "torneo_santantonio_results_v1";
const STORAGE_ADMIN_SESSION_KEY = "torneo_santantonio_admin_session_v1";

let auth = null;
let db = null;
let firebaseReady = false;

const ADMIN_USERNAME_EMAIL_SUFFIX = "@torneo.local";
const ADMIN_USERNAME_EMAIL_MAP = {
  admin: `admin${ADMIN_USERNAME_EMAIL_SUFFIX}`,
  // aggiungi altri username se necessario
};

function usernameToEmail(username) {
  let normalized = (username || "").trim().toLowerCase();
  if (!normalized) return "";
  // if user provided a full email, return it (after trimming)
  if (normalized.includes("@")) return normalized;
  // sanitize username: replace spaces with dots and remove invalid characters for email local-part
  normalized = normalized.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
  return ADMIN_USERNAME_EMAIL_MAP[normalized] || `${normalized}${ADMIN_USERNAME_EMAIL_SUFFIX}`;
}

// Squadre e calendario presi dalla locandina gironi.jpeg
const TEAMS_DATA = [
  { name: "Mirabellarum Robur", group: "A", logo: "resources/logos/mirabellarum_robur.png", photo: "resources/images/mirabellarum_robur.jpg", players: ["Pierro Michele", "Macchiaverna Rocco", "Solimine Antonio", "Di Corcia Antonio", "De Angelis Antonio", "Lambarelli Christian", "Chinni Niccolò", "Lisi Pasquale", "Solimine E"] },
  { name: "Monteleone", group: "A", logo: "resources/logos/monteleone.png", photo: "resources/images/monteleone.jpg", players: ["Addorisio Giuseppe", "Caggianiello Diego", "Pucillo Ivan", "Colangelo Fedele", "Labbate Giuliano", "Tarantino Raffaele", "Manserra Vincenzo", "Novia Giuseppe", "Santos Juanfran", "Mamadou Sabaly", "Lamanna Antonio", "Grosso Mario"] },
  { name: "RP Team", group: "A", logo: "resources/logos/rp_team.png", photo: "resources/images/rp_team.jpg", players: ["Nasser Eddine Mohamed", "Manserra Leonardo", "Andriuh Yhiuan", "Pucillo Angelo", "Postiglione Giuseppe", "Eddine Ali Nasser", "Lorizzo Michele", "Labriola Michele", "Ramadan Shehab", "Moshodi Farouk", "Ahmed Fares", "Hanafi Momen"] },
  { name: "FC Orsa Maggiore", group: "A", logo: "resources/logos/fc_orsa_maggiore.png", photo: "resources/images/fc_orsa_maggiore.jpg", players: ["Tounkara Adama", "Sidibe Fakouly", "Kone Oumar", "Jaiteh Foday", "Sidibe Yoro", "Traore Nouha", "Sacko Basadio", "Sheikh Himel", "Hawlader Sanjit/Sohan", "Ebrima Gaye", "Bah Dawda", "Fadiga Fode", "Yassin Nasser"] },
  { name: "Team DR", group: "A", logo: "resources/logos/team_dr.png", photo: "resources/images/team_dr.jpg", players: ["Cardinale Lorenzo", "Riccio Carmelo", "Zevola Giacomo", "Chillo Raffaele", "Costanzo Nicola", "Luzzi Leonardo", "Salines Mateo", "Pollastrone Luigi", "Rigillo Carmelo", "Ciano Stefano", "Morra Vito", "Contardo Luca"] },
  { name: "Red Wolves", group: "B", logo: "resources/logos/red_wolves.png", photo: "resources/images/red_wolves.jpg", players: ["Hamada Karim", "Manserra Vincenzo", "Seydou Sinka", "Simone Mario", "Kassam Karim", "Muhammed Kamus Camara", "Jammeh Moddou", "Labriola Alessandro"] },
  { name: "RP Gold Team", group: "B", logo: "resources/logos/rp_gold_team.png", photo: "resources/images/rp_gold_team.jpg", players: ["Iacullo Luca", "Iacullo Gerardo", "Donofrio Antonio", "Viola Antonello", "Barbato Sergio", "Loreto Gerardo", "Del Vento Giuseppe", "Daquino Italo", "Di Vito Antonio", "De Rosa Roberto"] },
  { name: "Zetaquadro Bar", group: "B", logo: "resources/logos/zetaquadro_bar.png", photo: "resources/images/zetaquadro_bar.jpg", players: ["Rigillo Francesco", "Capuano Nicola", "Marino Domenico", "Rauseo Giuseppe", "Pizzulo Giovanni", "Sauro Nazario", "Di Masi Euplio", "De Feo Antonio"] },
  { name: "HP", group: "B", logo: "resources/logos/hp.png", photo: "resources/images/hp.jpg", players: ["Annichiarico Antonio", "Cagliuli Marco", "Cornacchia Andrea", "Cornacchia Giuseppe", "De Cotiis Alfonso", "De Cotiis Vito", "El Majery Zaccaria", "Ibrahim Sory Camara", "Lapolla Giuseppe", "Spada Fabrizio"] },
  { name: "Bar in Piazza", group: "B", logo: "resources/logos/bar_in_piazza.png", photo: "resources/images/bar_in_piazza.jpg", players: ["Barbato Giuseppe", "Membrino Luigi", "Rattazzi Simone", "Di Pippa Luca", "Elviro Antonio", "Santoro Mario", "Puzo Gabriele", "Di Laurenzo Francesco C.", "Lo Conte Giovanni"] },
];

const TEAMS = TEAMS_DATA.map(t => t.name);

const WEEKDAY_NAMES_IT = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTH_NAMES_IT = {
  gennaio: 0,
  febbraio: 1,
  marzo: 2,
  aprile: 3,
  maggio: 4,
  giugno: 5,
  luglio: 6,
  agosto: 7,
  settembre: 8,
  ottobre: 9,
  novembre: 10,
  dicembre: 11,
};

function formatMatchDateWithWeekday(dateString) {
  if (!dateString || typeof dateString !== 'string') return dateString;
  const [dayPart, monthPart] = dateString.trim().split(' ');
  const day = Number(dayPart);
  const monthKey = (monthPart || '').trim().toLowerCase();
  if (!day || !(monthKey in MONTH_NAMES_IT)) return dateString;
  const year = new Date().getFullYear();
  const date = new Date(year, MONTH_NAMES_IT[monthKey], day);
  if (Number.isNaN(date.getTime())) return dateString;
  const weekday = WEEKDAY_NAMES_IT[date.getDay()];
  return `${weekday} ${dateString}`;
}

const MATCHES = [
  // 27 Maggio Mercoledi
  { id: "m1", date: "27 Maggio", time: "19:00", home: "Mirabellarum Robur", away: "Team DR", field: "Campo", group: "A" },
  { id: "m2", date: "27 Maggio", time: "20:00", home: "Red Wolves", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m3", date: "27 Maggio", time: "21:00", home: "FC Orsa Maggiore", away: "RP Team", field: "Campo", group: "A" },

  // 28 Maggio Giovedì
  { id: "m4", date: "28 Maggio", time: "20:00", home: "Monteleone", away: "RP Team", field: "Campo", group: "A" },
  { id: "m5", date: "28 Maggio", time: "21:00", home: "Zetaquadro Bar", away: "HP", field: "Campo", group: "B" },

  // 29 Maggio Venerdì
  { id: "m6", date: "29 Maggio", time: "19:00", home: "HP", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m7", date: "29 Maggio", time: "20:00", home: "RP Gold Team", away: "Zetaquadro Bar", field: "Campo", group: "B" },
  { id: "m8", date: "29 Maggio", time: "21:00", home: "FC Orsa Maggiore", away: "Team DR", field: "Campo", group: "A" },

  // 4 Giugno Giovedì
  { id: "m9", date: "4 Giugno", time: "19:30", home: "Red Wolves", away: "RP Gold Team", field: "Campo", group: "B" },
  { id: "m10", date: "4 Giugno", time: "20:30", home: "FC Orsa Maggiore", away: "Mirabellarum Robur", field: "Campo", group: "A" },

  // 6 Giugno Sabato
  { id: "m11", date: "6 Giugno", time: "19:30", home: "RP Team", away: "Team DR", field: "Campo", group: "A" },
  { id: "m12", date: "6 Giugno", time: "20:30", home: "Monteleone", away: "FC Orsa Maggiore", field: "Campo", group: "A" },

  // 8 Giugno Lunedi
  { id: "m13", date: "8 Giugno", time: "19:30", home: "Monteleone", away: "Mirabellarum Robur", field: "Campo", group: "A" },
  { id: "m14", date: "8 Giugno", time: "20:30", home: "RP Gold Team", away: "HP", field: "Campo", group: "B" },

  // 10 Giugno Mercoledì
  { id: "m15", date: "10 Giugno", time: "19:00", home: "RP Team", away: "Mirabellarum Robur", field: "Campo", group: "A" },
  { id: "m16", date: "10 Giugno", time: "20:00", home: "Zetaquadro Bar", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m17", date: "10 Giugno", time: "21:00", home: "Red Wolves", away: "HP", field: "Campo", group: "B" },

  // 12 Giugno Venerdì
  { id: "m18", date: "12 Giugno", time: "19:00", home: "Team DR", away: "Monteleone", field: "Campo", group: "A" },
  { id: "m19", date: "12 Giugno", time: "20:00", home: "Bar in Piazza", away: "RP Gold Team", field: "Campo", group: "B" },
  { id: "m20", date: "12 Giugno", time: "21:00", home: "Zetaquadro Bar", away: "Red Wolves", field: "Campo", group: "B" },
];

function initializeFirebase() {
  if (firebaseReady) return true;
  if (typeof firebase === "undefined") return false;
  try {
    // If a separate firebase-config.js initialized the app (modular or compat), don't re-initialize.
    if (typeof firebase.initializeApp === "function" && (typeof firebase.apps === "undefined" || firebase.apps.length === 0)) {
      // If the project provided a `firebaseConfig` object in firebase-config.js, try to initialize compat as fallback
      if (typeof firebaseConfig !== "undefined") {
        try {
          firebase.initializeApp(firebaseConfig);
        } catch (e) {
          // ignore if already initialized by modular script
        }
      }
    }
    if (typeof firebase.auth === "function") {
      auth = firebase.auth();
    } else if (firebase.auth) {
      auth = firebase.auth;
    }
    if (typeof firebase.firestore === "function") {
      db = firebase.firestore();
    } else if (firebase.firestore) {
      db = firebase.firestore;
    }
    firebaseReady = true;
    return true;
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    return false;
  }
}

function normalizeResultsData(results) {
  if (!results || typeof results !== 'object') {
    results = {};
  }
  if (!results.playerStats || typeof results.playerStats !== 'object') {
    results.playerStats = {};
  }
  console.log("normalizeResultsData:", results);
  return results;
}

function loadResultsLocally() {
  const raw = localStorage.getItem(STORAGE_MATCH_RESULTS_KEY);
  if (!raw) {
    return normalizeResultsData({});
  }
  try {
    return normalizeResultsData(JSON.parse(raw) || {});
  } catch {
    return normalizeResultsData({});
  }
}

async function loadResultsFromFirestore() {
  if (!initializeFirebase()) {
    return loadResultsLocally();
  }
  try {
    const docRef = db.collection("tournament").doc("results");
    const snapshot = await docRef.get();
    if (snapshot.exists && snapshot.data().results) {
      return normalizeResultsData(snapshot.data().results);
    }
    const localResults = loadResultsLocally();
    return Object.keys(localResults).length ? localResults : normalizeResultsData({});
  } catch (error) {
    console.warn("Firestore load failed:", error);
    return loadResultsLocally();
  }
}

async function loadResults() {
  if (initializeFirebase()) {
    return await loadResultsFromFirestore();
  }
  return loadResultsLocally();
}

function saveResultsLocally(results) {
  localStorage.setItem(STORAGE_MATCH_RESULTS_KEY, JSON.stringify(results));
}

async function saveResults(results) {
  if (!results || typeof results !== 'object') {
    results = {};
  }
  results = normalizeResultsData(results);
  console.log("saveResults - results to save:", results);
  if (initializeFirebase()) {
    try {
      await db.collection("tournament").doc("results").set({ results });
      console.log("saveResults - saved to Firestore");
    } catch (error) {
      console.warn("Firestore save failed:", error);
      saveResultsLocally(results);
    }
  } else {
    saveResultsLocally(results);
  }
}

function findTeamByName(teamName) {
  if (!teamName || typeof teamName !== 'string') return null;
  const normalizedName = teamName.trim().toLowerCase();
  let team = TEAMS_DATA.find((t) => t.name.trim().toLowerCase() === normalizedName);
  if (team) return team;
  return TEAMS_DATA.find((t) => t.name.trim().toLowerCase().includes(normalizedName) || normalizedName.includes(t.name.trim().toLowerCase()));
}

function getPlayerTeamName(playerName) {
  const team = TEAMS_DATA.find((t) => (t.players || []).includes(playerName));
  return team ? team.name : "";
}

function getPlayerStats(results, playerName) {
  const stats = (results && results.playerStats && results.playerStats[playerName]) || {};
  return {
    goals: Number(stats.goals) || 0,
    yellowCards: Number(stats.yellowCards) || 0,
    redCards: Number(stats.redCards) || 0,
  };
}

function computePlayerRanking(results) {
  const playerStats = (results && results.playerStats) || {};
  return Object.entries(playerStats)
    .map(([player, stats]) => ({
      player,
      team: getPlayerTeamName(player),
      goals: Number(stats.goals) || 0,
      yellowCards: Number(stats.yellowCards) || 0,
      redCards: Number(stats.redCards) || 0,
    }))
    .filter((row) => row.goals || row.yellowCards || row.redCards)
    .filter((row) => row.team)
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (a.redCards !== b.redCards) return a.redCards - b.redCards;
      if (a.yellowCards !== b.yellowCards) return a.yellowCards - b.yellowCards;
      return a.player.localeCompare(b.player);
    });
}

async function upsertPlayerStats(playerName, goals, yellowCards, redCards) {
  const results = await loadResults();
  const parsedGoals = Number(goals) || 0;
  const parsedYellow = Number(yellowCards) || 0;
  const parsedRed = Number(redCards) || 0;
  if (!playerName) return;
  if (parsedGoals === 0 && parsedYellow === 0 && parsedRed === 0) {
    delete results.playerStats[playerName];
  } else {
    results.playerStats[playerName] = {
      goals: parsedGoals,
      yellowCards: parsedYellow,
      redCards: parsedRed,
    };
  }
  await saveResults(results);
}

async function upsertResult(matchId, homeGoals, awayGoals, homeRedCards = 0, homeYellowCards = 0, awayRedCards = 0, awayYellowCards = 0, playerEvents = { home: [], away: [] }) {
  const current = await loadResults();
  console.log("upsertResult - PRIMA - current:", current);
  
  if (homeGoals === "" || awayGoals === "") {
    delete current[matchId];
  } else {
    current[matchId] = {
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
      homeRedCards: Number(homeRedCards) || 0,
      homeYellowCards: Number(homeYellowCards) || 0,
      awayRedCards: Number(awayRedCards) || 0,
      awayYellowCards: Number(awayYellowCards) || 0,
      playerEvents: {
        home: Array.isArray(playerEvents.home) ? playerEvents.home : [],
        away: Array.isArray(playerEvents.away) ? playerEvents.away : [],
      },
    };
  }
  current.playerStats = computeGlobalPlayerStats(current);
  console.log("upsertResult - DOPO - current:", current);
  await saveResults(current);
}

function computeGlobalPlayerStats(results) {
  const playerStats = {};
  if (!results || typeof results !== 'object') return playerStats;
  MATCHES.forEach((match) => {
    const res = results[match.id];
    if (!res || !res.playerEvents) return;
    ["home", "away"].forEach((side) => {
      (res.playerEvents[side] || []).forEach((event) => {
        if (!event || !event.player) return;
        const player = event.player;
        if (!playerStats[player]) {
          playerStats[player] = { goals: 0, yellowCards: 0, redCards: 0 };
        }
        playerStats[player].goals += Number(event.goals) || 0;
        playerStats[player].yellowCards += Number(event.yellowCards) || 0;
        playerStats[player].redCards += Number(event.redCards) || 0;
      });
    });
  });
  return playerStats;
}

function getMatchPlayerEvents(results, matchId, side) {
  if (!results || !results[matchId] || !results[matchId].playerEvents) return [];
  return Array.isArray(results[matchId].playerEvents[side]) ? results[matchId].playerEvents[side] : [];
}

function getMatchResult(results, matchId) {
  return results[matchId] || {
    homeGoals: "",
    awayGoals: "",
    homeRedCards: 0,
    homeYellowCards: 0,
    awayRedCards: 0,
    awayYellowCards: 0,
    playerEvents: { home: [], away: [] },
  };
}

function getResultLabel(match, results) {
  const result = results[match.id];
  if (!result) {
    return "Da giocare";
  }
  return `${result.homeGoals} - ${result.awayGoals}`;
}

function fillMatchPlayerSelect(row, matchId, side, teamName, results) {
  const select = row.querySelector(`select[data-match="${matchId}"][data-side="${side}"][data-player-add]`);
  if (!select) return;
  select.innerHTML = "";
  const teamData = findTeamByName(teamName);
  if (!teamData) return;
  const existing = new Set(
    Array.from(row.querySelectorAll(`.team-player-list[data-match="${matchId}"][data-side="${side}"] .team-player-row`)).map((el) => el.dataset.player)
  );
  teamData.players.forEach((player) => {
    if (existing.has(player)) return;
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    select.appendChild(option);
  });
  if (select.children.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tutti i giocatori aggiunti";
    select.appendChild(option);
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function renderMatchPlayerList(row, matchId, side, teamName, results) {
  const list = row.querySelector(`.team-player-list[data-match="${matchId}"][data-side="${side}"]`);
  if (!list) return;
  list.innerHTML = "";
  const events = getMatchPlayerEvents(results, matchId, side);
  events.forEach((event) => {
    const playerRow = document.createElement("div");
    playerRow.className = "team-player-row";
    playerRow.dataset.player = event.player;
    playerRow.innerHTML = `
      <div class="player-name">${event.player}</div>
      <input type="number" min="0" value="${event.goals || 0}" data-player-goals placeholder="Gol" />
      <input type="number" min="0" value="${event.yellowCards || 0}" data-player-yellow placeholder="Gialli" />
      <input type="number" min="0" value="${event.redCards || 0}" data-player-red placeholder="Rossi" />
      <button type="button" class="remove-player">Rimuovi</button>
    `;
    const removeBtn = playerRow.querySelector(".remove-player");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        playerRow.remove();
        fillMatchPlayerSelect(row, matchId, side, teamName, results);
      });
    }
    list.appendChild(playerRow);
  });
}

function collectMatchPlayerEvents(row, matchId, side) {
  return Array.from(row.querySelectorAll(`.team-player-list[data-match="${matchId}"][data-side="${side}"] .team-player-row`)).map((playerRow) => ({
    player: playerRow.dataset.player,
    goals: Number(playerRow.querySelector("[data-player-goals]")?.value) || 0,
    yellowCards: Number(playerRow.querySelector("[data-player-yellow]")?.value) || 0,
    redCards: Number(playerRow.querySelector("[data-player-red]")?.value) || 0,
  }));
}

function computeStandings(results) {
  const table = {};
  TEAMS.forEach((team) => {
    table[team] = {
      team,
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      gf: 0,
      ga: 0,
      pts: 0,
      redCards: 0,
      yellowCards: 0,
    };
  });

  MATCHES.forEach((match) => {
    const res = results[match.id];
    if (!res) {
      return;
    }
    if (!table[match.home] || !table[match.away]) {
      return;
    }
    const home = table[match.home];
    const away = table[match.away];
    home.played += 1;
    away.played += 1;
    home.gf += res.homeGoals;
    home.ga += res.awayGoals;
    away.gf += res.awayGoals;
    away.ga += res.homeGoals;
    home.redCards += res.homeRedCards || 0;
    home.yellowCards += res.homeYellowCards || 0;
    away.redCards += res.awayRedCards || 0;
    away.yellowCards += res.awayYellowCards || 0;

    if (res.homeGoals > res.awayGoals) {
      home.win += 1;
      away.loss += 1;
      home.pts += 3;
    } else if (res.homeGoals < res.awayGoals) {
      away.win += 1;
      home.loss += 1;
      away.pts += 3;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.pts += 1;
      away.pts += 1;
    }
  });

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const diffA = a.gf - a.ga;
    const diffB = b.gf - b.ga;
    if (diffB !== diffA) return diffB - diffA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team);
  });
}

async function renderLastDayIfPresent(results = null) {
  const list = document.getElementById("last-day-list");
  if (!list) return;
  list.innerHTML = "";
  if (!results) {
    results = await loadResults();
  }
  
  console.log("renderLastDayIfPresent - results:", results);
  
  // Find all matches with results
  const matchesWithResults = MATCHES.filter(m => results[m.id]);
  
  console.log("matchesWithResults:", matchesWithResults);
  
  if (matchesWithResults.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nessun risultato ancora disponibile";
    list.appendChild(li);
    return;
  }
  
  // Get the last match with result
  const lastMatchWithResult = matchesWithResults[matchesWithResults.length - 1];
  const lastDate = lastMatchWithResult.date;
  
  console.log("lastDate:", lastDate);
  
  // Get all matches from the same date as the last match with results, but only those with results
  const lastDayMatches = MATCHES.filter(m => m.date === lastDate && results[m.id]);
  
  console.log("lastDayMatches:", lastDayMatches);
  
  lastDayMatches.forEach((match) => {
    const li = document.createElement("li");
    const result = getResultLabel(match, results);
    li.textContent = `${formatMatchDateWithWeekday(match.date)} ${match.time} — ${match.home} vs ${match.away} — ${result}`;
    list.appendChild(li);
  });
}

async function renderNextDayIfPresent(results = null) {
  const list = document.getElementById("next-day-list");
  if (!list) return;
  list.innerHTML = "";
  if (!results) {
    results = await loadResults();
  }
  
  console.log("renderNextDayIfPresent - results:", results);
  console.log("renderNextDayIfPresent - MATCHES:", MATCHES.map(m => ({ id: m.id, date: m.date, hasResult: !!results[m.id] })));
  
  // Find the first match without results
  const firstMatchWithoutResult = MATCHES.find(m => !results[m.id]);
  
  console.log("firstMatchWithoutResult:", firstMatchWithoutResult);
  
  if (!firstMatchWithoutResult) {
    const li = document.createElement("li");
    li.textContent = "Tutte le partite sono state giocate!";
    list.appendChild(li);
    return;
  }
  
  // Get all matches from the same date as the first match without results
  const nextDate = firstMatchWithoutResult.date;
  const nextMatches = MATCHES.filter(m => m.date === nextDate && !results[m.id]);
  
  console.log("nextDate:", nextDate);
  console.log("nextMatches:", nextMatches);
  
  nextMatches.forEach((match) => {
    const li = document.createElement("li");
    li.textContent = `${formatMatchDateWithWeekday(match.date)} ${match.time} — ${match.home} vs ${match.away}`;
    list.appendChild(li);
  });
}

async function renderCalendarIfPresent() {
  const container = document.getElementById("calendar-container");
  const tableBody = document.getElementById("calendar-body");
  const results = await loadResults();
  if (tableBody) {
    tableBody.innerHTML = "";
    MATCHES.forEach((match) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatMatchDateWithWeekday(match.date)}</td>
        <td>${match.time}</td>
        <td>${match.home} vs ${match.away}</td>
        <td class="calendar-result">${getResultLabel(match, results)}</td>
      `;
      tableBody.appendChild(tr);
    });
    return;
  }

  if (!container) return;
  // group matches per date
  const byDate = {};
  MATCHES.forEach((m) => {
    if (!byDate[m.date]) byDate[m.date] = [];
    byDate[m.date].push(m);
  });
  container.innerHTML = "";
  Object.keys(byDate).forEach((date) => {
    const block = document.createElement("div");
    block.className = "panel";
    const header = document.createElement("div");
    header.className = "panel-header";
    header.textContent = formatMatchDateWithWeekday(date);
    const body = document.createElement("div");
    body.className = "panel-body";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr><th>Ora</th><th>Partita</th><th>Risultato</th></tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    byDate[date].forEach((match) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${match.time}</td>
        <td>${match.home} vs ${match.away}</td>
        <td class="calendar-result">${getResultLabel(match, results)}</td>
      `;
      tbody.appendChild(tr);
    });
    body.appendChild(table);
    block.appendChild(header);
    block.appendChild(body);
    container.appendChild(block);
  });
}

async function renderTeamsIfPresent() {
  const grid = document.getElementById("teams-grid");
  if (!grid) return;
  grid.innerHTML = "";
  TEAMS_DATA.forEach((team) => {
    const card = document.createElement("div");
    card.className = "team-card-item";
    const players = (team.players || []).slice(0, 13);
    const playersHtml = players.map((p) => `<li>${p}</li>`).join("");
    const photoSrc = team.photo || team.logo;
    card.innerHTML = `
      <div class="team-card-photo-wrapper">
        <img class="team-card-photo" src="${photoSrc}" alt="Foto squadra ${team.name}" onerror="this.onerror=null;this.src='${team.logo}'" />
        <ul class="team-players">${playersHtml}</ul>
      </div>
      <img class="team-card-logo" src="${team.logo}" alt="Logo ${team.name}" />
      <div class="team-card-name">${team.name}</div>
    `;
    grid.appendChild(card);
  });
}

async function renderStandingsIfPresent() {
  const tbodyA = document.getElementById("standings-body-a");
  const tbodyB = document.getElementById("standings-body-b");
  const oldTbody = document.getElementById("standings-body");

  if (!tbodyA && !tbodyB && !oldTbody) return;

  const standings = computeStandings(await loadResults());
  const standingsA = standings.filter(row => {
    const teamData = TEAMS_DATA.find(t => t.name === row.team);
    return teamData && teamData.group === "A";
  });
  const standingsB = standings.filter(row => {
    const teamData = TEAMS_DATA.find(t => t.name === row.team);
    return teamData && teamData.group === "B";
  });

  if (oldTbody) {
    oldTbody.innerHTML = "";
    standings.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.team}</td>
        <td>${row.played}</td>
        <td>${row.win}</td>
        <td>${row.draw}</td>
        <td>${row.loss}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td><strong>${row.pts}</strong></td>
        <td><span style="color: red; font-weight: bold;">${row.redCards}</span></td>
        <td><span style="color: #FFB81C; font-weight: bold;">${row.yellowCards}</span></td>
      `;
      oldTbody.appendChild(tr);
    });
  }

  if (tbodyA) {
    tbodyA.innerHTML = "";
    standingsA.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.team}</td>
        <td>${row.played}</td>
        <td>${row.win}</td>
        <td>${row.draw}</td>
        <td>${row.loss}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td><strong>${row.pts}</strong></td>
        <td><span style="color: red; font-weight: bold;">${row.redCards}</span></td>
        <td><span style="color: #FFB81C; font-weight: bold;">${row.yellowCards}</span></td>
      `;
      tbodyA.appendChild(tr);
    });
  }

  if (tbodyB) {
    tbodyB.innerHTML = "";
    standingsB.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.team}</td>
        <td>${row.played}</td>
        <td>${row.win}</td>
        <td>${row.draw}</td>
        <td>${row.loss}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td><strong>${row.pts}</strong></td>
        <td><span style="color: red; font-weight: bold;">${row.redCards}</span></td>
        <td><span style="color: #FFB81C; font-weight: bold;">${row.yellowCards}</span></td>
      `;
      tbodyB.appendChild(tr);
    });
  }
}

function getGroupStandings(standings, group) {
  return standings.filter((row) => {
    const teamData = TEAMS_DATA.find((t) => t.name === row.team);
    return teamData && teamData.group === group;
  });
}

function areGroupStageMatchesComplete(results) {
  return MATCHES.every((match) => {
    const res = results[match.id];
    return res && typeof res.homeGoals === "number" && typeof res.awayGoals === "number";
  });
}

async function renderFinalPhaseIfPresent() {
  const container = document.getElementById("final-phase-container");
  if (!container) return;

  const results = await loadResults();
  const standings = computeStandings(results);
  const groupA = getGroupStandings(standings, "A");
  const groupB = getGroupStandings(standings, "B");
  const phaseComplete = areGroupStageMatchesComplete(results);

  const [a1, a2, a3, a4, a5] = groupA;
  const [b1, b2, b3, b4, b5] = groupB;

  const quarterA1 = phaseComplete ? `${a2?.team || "2° Girone A"} vs ${b5?.team || "5° Girone B"}` : "2° Girone A vs 5° Girone B";
  const quarterA2 = phaseComplete ? `${a3?.team || "3° Girone A"} vs ${b4?.team || "4° Girone B"}` : "3° Girone A vs 4° Girone B";
  const quarterB1 = phaseComplete ? `${b2?.team || "2° Girone B"} vs ${a5?.team || "5° Girone A"}` : "2° Girone B vs 5° Girone A";
  const quarterB2 = phaseComplete ? `${b3?.team || "3° Girone B"} vs ${a4?.team || "4° Girone A"}` : "3° Girone B vs 4° Girone A";

  const finalA1 = phaseComplete ? a1?.team || "1° Girone A" : "1° Girone A";
  const finalB1 = phaseComplete ? b1?.team || "1° Girone B" : "1° Girone B";
  container.innerHTML = `
    <div class="final-bracket">
      <!-- Column 1: top->down A1, A2, B1, B2 -->
      <div class="bracket-node col-initial col-initial-down" style="grid-column:1; grid-row:1;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio A - Gara 1</span>
        <strong>${quarterB1}</strong>
      </div>
      <div class="bracket-node col-initial col-initial-up" style="grid-column:1; grid-row:2;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio A - Gara 2</span>
        <strong>${quarterB2}</strong>
      </div>
      <div class="bracket-node col-initial col-initial-down" style="grid-column:1; grid-row:3;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio B - Gara 1</span>
        <strong>${quarterA1}</strong>
      </div>
      <div class="bracket-node col-initial col-initial-up" style="grid-column:1; grid-row:4;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio B - Gara 2</span>
        <strong>${quarterA2}</strong>
      </div>

      <!-- Column 2: Spareggio finals centered between pairs -->
      <div class="bracket-node col-playoff col-playoff-down" style="grid-column:2; grid-row:1 / 3;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio A - Finale</span>
        <strong>Vincente Gara 1 vs Vincente Gara 2</strong>
      </div>
      <div class="bracket-node col-playoff col-playoff-up" style="grid-column:2; grid-row:3 / 5;">
        <div class="match-date">TBD</div>
        <span class="match-title">Spareggio B - Finale</span>
        <strong>Vincente Gara 1 vs Vincente Gara 2</strong>
      </div>

      <!-- Column 3: Semifinali -->
      <div class="bracket-node col-semi col-semi-down" style="grid-column:3; grid-row:2;">
        <div class="match-date">TBD</div>
        <span class="match-title">Semifinale 1</span>
        <strong>${finalA1} vs Vincente Spareggio A</strong>
      </div>
      <div class="bracket-node col-semi col-semi-up" style="grid-column:3; grid-row:3;">
        <div class="match-date">TBD</div>
        <span class="match-title">Semifinale 2</span>
        <strong>${finalB1} vs Vincente Spareggio B</strong>
      </div>

      <!-- Column 4: Finale centered between semifinals -->
      <div class="bracket-node col-final final-node" style="grid-column:4; grid-row:2 / 4;">
        <div class="match-date">TBD</div>
        <span class="match-title">Finale</span>
        <strong>Vincente Semifinale 1 vs Vincente Semifinale 2</strong>
      </div>
    </div>
  `;
}

async function renderPlayerRankingsIfPresent() {
  const tbody = document.getElementById("player-rankings-body");
  if (!tbody) return;
  const rankings = computePlayerRanking(await loadResults());
  tbody.innerHTML = "";
  if (rankings.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6">Nessuna statistica giocatori inserita.</td>`;
    tbody.appendChild(tr);
    return;
  }
  rankings.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.player}</td>
      <td>${row.team}</td>
      <td>${row.goals}</td>
      <td><span style="color: red; font-weight: bold;">${row.redCards}</span></td>
      <td><span style="color: #FFB81C; font-weight: bold;">${row.yellowCards}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPlayerSelectOptions(teamName, results) {
  const playerSelect = document.getElementById("player-name");
  if (!playerSelect) return;
  playerSelect.innerHTML = "";
  const teamData = findTeamByName(teamName);
  if (!teamData) return;
  const currentStats = results.playerStats || {};
  teamData.players.forEach((player) => {
    const stats = getPlayerStats(results, player);
    const option = document.createElement("option");
    option.value = player;
    option.textContent = `${player} (${stats.goals}g, ${stats.redCards}r, ${stats.yellowCards}y)`;
    playerSelect.appendChild(option);
  });
}

function fillMatchPlayerSelect(row, matchId, side, teamName, results) {
  const select = row.querySelector(`select[data-match="${matchId}"][data-side="${side}"]`);
  if (!select) return;
  select.innerHTML = "";
  const teamData = findTeamByName(teamName);
  if (!teamData) return;
  const existing = new Set(
    Array.from(row.querySelectorAll(`.team-player-list[data-match="${matchId}"][data-side="${side}"] .team-player-row`)).map((el) => el.dataset.player)
  );
  teamData.players.forEach((player) => {
    if (existing.has(player)) return;
    const stats = getPlayerStats(results, player);
    const option = document.createElement("option");
    option.value = player;
    option.textContent = `${player} (${stats.goals}g ${stats.redCards}r ${stats.yellowCards}y)`;
    select.appendChild(option);
  });
  if (select.children.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tutti i giocatori aggiunti";
    select.appendChild(option);
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function populateMatchPlayerStats(row, matchId, side, results) {
  const select = row.querySelector(`select[data-match="${matchId}"][data-side="${side}"]`);
  if (!select) return;
  const playerName = select.value;
  const stats = getPlayerStats(results, playerName);
  const goalsInput = row.querySelector(`input[data-match="${matchId}"][data-player-input="goals"][data-side="${side}"]`);
  const yellowInput = row.querySelector(`input[data-match="${matchId}"][data-player-input="yellow"][data-side="${side}"]`);
  const redInput = row.querySelector(`input[data-match="${matchId}"][data-player-input="red"][data-side="${side}"]`);
  if (goalsInput) goalsInput.value = stats.goals;
  if (yellowInput) yellowInput.value = stats.yellowCards;
  if (redInput) redInput.value = stats.redCards;
}

function populatePlayerStatsForm(playerName, results) {
  const stats = getPlayerStats(results, playerName);
  const goalsInput = document.getElementById("player-goals");
  const yellowInput = document.getElementById("player-yellow");
  const redInput = document.getElementById("player-red");
  if (goalsInput) goalsInput.value = stats.goals;
  if (yellowInput) yellowInput.value = stats.yellowCards;
  if (redInput) redInput.value = stats.redCards;
}

async function renderAdminPlayerStats() {
  const container = document.getElementById("player-stats-list");
  const teamSelect = document.getElementById("player-team");
  const results = await loadResults();
  if (teamSelect) {
    teamSelect.innerHTML = "";
    TEAMS_DATA.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.name;
      option.textContent = `${team.name}`;
      teamSelect.appendChild(option);
    });
    const firstTeam = teamSelect.value || (TEAMS_DATA[0] && TEAMS_DATA[0].name);
    renderPlayerSelectOptions(firstTeam, results);
  }
  const playerSelect = document.getElementById("player-name");
  if (playerSelect) {
    playerSelect.onchange = () => {
      populatePlayerStatsForm(playerSelect.value, results);
    };
    if (playerSelect.value) {
      populatePlayerStatsForm(playerSelect.value, results);
    }
  }
  if (teamSelect) {
    teamSelect.onchange = () => {
      renderPlayerSelectOptions(teamSelect.value, results);
      const newPlayer = document.getElementById("player-name");
      if (newPlayer) populatePlayerStatsForm(newPlayer.value, results);
    };
  }
  if (container) {
    const rankings = computePlayerRanking(results);
    container.innerHTML = "";
    if (rankings.length === 0) {
      container.innerHTML = `<p class="muted">Nessuna statistica giocatori modificata.</p>`;
      return;
    }
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pos.</th>
          <th>Calciatore</th>
          <th>Squadra</th>
          <th>Gol</th>
          <th style="color: red;">●</th>
          <th style="color: #FFB81C;">●</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    rankings.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.player}</td>
        <td>${row.team}</td>
        <td>${row.goals}</td>
        <td><span style="color: red; font-weight: bold;">${row.redCards}</span></td>
        <td><span style="color: #FFB81C; font-weight: bold;">${row.yellowCards}</span></td>
        <td><button type="button" data-player="${row.player}">Modifica</button></td>
      `;
      tbody.appendChild(tr);
    });
    container.appendChild(table);
    container.querySelectorAll("button[data-player]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const playerName = btn.getAttribute("data-player");
        const teamName = getPlayerTeamName(playerName);
        const teamSelectEl = document.getElementById("player-team");
        if (teamSelectEl) teamSelectEl.value = teamName;
        renderPlayerSelectOptions(teamName, results);
        const playerSelectEl = document.getElementById("player-name");
        if (playerSelectEl) {
          playerSelectEl.value = playerName;
          populatePlayerStatsForm(playerName, results);
        }
      });
    });
  }
}

function isAdminLogged() {
  if (!initializeFirebase()) return false;
  return auth && auth.currentUser !== null;
}

function setAdminSession(logged) {
  localStorage.setItem(STORAGE_ADMIN_SESSION_KEY, logged ? "1" : "0");
}

async function renderAdminMatches() {
  const adminMatches = document.getElementById("admin-matches");
  if (!adminMatches) return;
  const results = await loadResults();
  adminMatches.innerHTML = "";
  MATCHES.filter((m) => m.editable !== false).forEach((match) => {
    const row = document.createElement("div");
    row.className = "admin-match-row collapsed";
    const result = getMatchResult(results, match.id);
    row.innerHTML = `
      <div class="admin-match-title">${formatMatchDateWithWeekday(match.date)} ${match.time} · ${match.home} vs ${match.away}</div>
      <div class="admin-match-body">
        <div class="score-grid">
          <div>
            <label>${match.home} gol</label>
            <input type="number" min="0" value="${result.homeGoals}" data-match="${match.id}" data-score="homeGoals" placeholder="Gol" />
          </div>
          <div>
            <label>${match.away} gol</label>
            <input type="number" min="0" value="${result.awayGoals}" data-match="${match.id}" data-score="awayGoals" placeholder="Gol" />
          </div>
        </div>
        <div class="team-row-grid">
          <div class="team-section">
            <div class="team-section-title">${match.home}</div>
            <label>Rossi ${match.home}</label>
            <input type="number" min="0" value="${result.homeRedCards}" data-match="${match.id}" data-cards="homeRed" placeholder="Rossi" />
            <label>Gialli ${match.home}</label>
            <input type="number" min="0" value="${result.homeYellowCards}" data-match="${match.id}" data-cards="homeYellow" placeholder="Gialli" />
            <div class="team-player-adder">
              <select data-match="${match.id}" data-side="home" data-player-add></select>
              <button type="button" data-add-player="${match.id}" data-side="home">Aggiungi calciatore</button>
            </div>
            <div class="team-player-list" data-match="${match.id}" data-side="home"></div>
          </div>
          <div class="team-section">
            <div class="team-section-title">${match.away}</div>
            <label>Rossi ${match.away}</label>
            <input type="number" min="0" value="${result.awayRedCards}" data-match="${match.id}" data-cards="awayRed" placeholder="Rossi" />
            <label>Gialli ${match.away}</label>
            <input type="number" min="0" value="${result.awayYellowCards}" data-match="${match.id}" data-cards="awayYellow" placeholder="Gialli" />
            <div class="team-player-adder">
              <select data-match="${match.id}" data-side="away" data-player-add></select>
              <button type="button" data-add-player="${match.id}" data-side="away">Aggiungi calciatore</button>
            </div>
            <div class="team-player-list" data-match="${match.id}" data-side="away"></div>
          </div>
        </div>
        <div class="admin-match-actions">
          <button type="button" data-save="${match.id}">Salva incontro</button>
          <div class="status-msg" id="status-${match.id}"></div>
        </div>
      </div>
    `;
    adminMatches.appendChild(row);
    // Toggle collapse when clicking title
    const titleEl = row.querySelector('.admin-match-title');
    if (titleEl) {
      titleEl.style.cursor = 'pointer';
      titleEl.addEventListener('click', () => {
        row.classList.toggle('collapsed');
      });
    }
    fillMatchPlayerSelect(row, match.id, "home", match.home, results);
    fillMatchPlayerSelect(row, match.id, "away", match.away, results);
    renderMatchPlayerList(row, match.id, "home", match.home, results);
    renderMatchPlayerList(row, match.id, "away", match.away, results);
    const homeAddButton = row.querySelector(`button[data-add-player="${match.id}"][data-side="home"]`);
    const awayAddButton = row.querySelector(`button[data-add-player="${match.id}"][data-side="away"]`);
    if (homeAddButton) {
      homeAddButton.addEventListener("click", () => {
        const select = row.querySelector(`select[data-match="${match.id}"][data-side="home"][data-player-add]`);
        const selected = select?.value;
        if (!selected) return;
        const list = row.querySelector(`.team-player-list[data-match="${match.id}"][data-side="home"]`);
        const playerRow = document.createElement("div");
        playerRow.className = "team-player-row";
        playerRow.dataset.player = selected;
        playerRow.innerHTML = `
          <div class="player-name">${selected}</div>
          <input type="number" min="0" value="" data-player-goals placeholder="Gol" />
          <input type="number" min="0" value="" data-player-yellow placeholder="Gialli" />
          <input type="number" min="0" value="" data-player-red placeholder="Rossi" />
          <button type="button" class="remove-player">Rimuovi</button>
        `;
        const removeBtn = playerRow.querySelector(".remove-player");
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            playerRow.remove();
            fillMatchPlayerSelect(row, match.id, "home", match.home, results);
          });
        }
        list.appendChild(playerRow);
        fillMatchPlayerSelect(row, match.id, "home", match.home, results);
      });
    }
    if (awayAddButton) {
      awayAddButton.addEventListener("click", () => {
        const select = row.querySelector(`select[data-match="${match.id}"][data-side="away"][data-player-add]`);
        const selected = select?.value;
        if (!selected) return;
        const list = row.querySelector(`.team-player-list[data-match="${match.id}"][data-side="away"]`);
        const playerRow = document.createElement("div");
        playerRow.className = "team-player-row";
        playerRow.dataset.player = selected;
        playerRow.innerHTML = `
          <div class="player-name">${selected}</div>
          <input type="number" min="0" value="" data-player-goals placeholder="Gol" />
          <input type="number" min="0" value="" data-player-yellow placeholder="Gialli" />
          <input type="number" min="0" value="" data-player-red placeholder="Rossi" />
          <button type="button" class="remove-player">Rimuovi</button>
        `;
        const removeBtn = playerRow.querySelector(".remove-player");
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            playerRow.remove();
            fillMatchPlayerSelect(row, match.id, "away", match.away, results);
          });
        }
        list.appendChild(playerRow);
        fillMatchPlayerSelect(row, match.id, "away", match.away, results);
      });
    }
  });

  adminMatches.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const row = btn.closest(".admin-match-row");
      if (!row) return;
      const homeInput = row.querySelector(`input[data-match="${id}"][data-score="homeGoals"]`);
      const awayInput = row.querySelector(`input[data-match="${id}"][data-score="awayGoals"]`);
      const homeRedInput = row.querySelector(`input[data-match="${id}"][data-cards="homeRed"]`);
      const homeYellowInput = row.querySelector(`input[data-match="${id}"][data-cards="homeYellow"]`);
      const awayRedInput = row.querySelector(`input[data-match="${id}"][data-cards="awayRed"]`);
      const awayYellowInput = row.querySelector(`input[data-match="${id}"][data-cards="awayYellow"]`);
      const homeEvents = collectMatchPlayerEvents(row, id, "home");
      const awayEvents = collectMatchPlayerEvents(row, id, "away");
      await upsertResult(id, homeInput.value, awayInput.value, homeRedInput.value, homeYellowInput.value, awayRedInput.value, awayYellowInput.value, { home: homeEvents, away: awayEvents });
      const status = document.getElementById(`status-${id}`);
      status.textContent = "Incontro salvato.";
      // Give a small delay for data sync, then load and render
      await new Promise(r => setTimeout(r, 300));
      const updatedResults = await loadResults();
      await renderCalendarIfPresent();
      await renderStandingsIfPresent();
      await renderNextDayIfPresent(updatedResults);
      await renderPlayerRankingsIfPresent();
    });
  });
}

async function setupAdminPage() {
  const loginBox = document.getElementById("admin-login");
  if (!loginBox) return;

  const panelBox = document.getElementById("admin-panel");
  const loginForm = document.getElementById("login-form");
  const loginMsg = document.getElementById("login-message");
  const adminMatches = document.getElementById("admin-matches");
  const logoutBtn = document.getElementById("logout-btn");
  const firebaseNote = document.getElementById("firebase-note");

  const firebaseEnabled = initializeFirebase();
  const runningFileProtocol = typeof location !== 'undefined' && location.protocol === 'file:';

  if (firebaseNote) {
    if (!firebaseEnabled) {
      firebaseNote.textContent = "Firebase non è configurato correttamente: l'accesso è disabilitato.";
    } else if (runningFileProtocol) {
      firebaseNote.textContent = "Attenzione: stai usando file:// — l'autenticazione Firebase potrebbe non funzionare. Servi il sito tramite localhost o https.";
    } else {
      firebaseNote.textContent = "Usa il tuo nome utente e password per accedere e modificare i risultati.";
    }
  }

  // Helper to switch UI
  function showLogin() {
    panelBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  }

  function showPanel() {
    loginBox.classList.add("hidden");
    panelBox.classList.remove("hidden");
    if (loginMsg) loginMsg.textContent = "";
    if (firebaseNote && initializeFirebase()) firebaseNote.textContent = "Sei connesso come amministratore.";
    renderAdminMatches();
  }

  renderAdminMatches();

  if (firebaseEnabled && auth && typeof auth.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setAdminSession(true);
        showPanel();
      } else {
        setAdminSession(false);
        showLogin();
      }
    });
  } else {
    // Firebase non configurato: disabilita l'accesso amministrativo
    if (loginForm) loginForm.querySelectorAll("input,button").forEach((el) => (el.disabled = true));
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = document.getElementById("admin-user").value.trim();
      const pass = document.getElementById("admin-pass").value;
      if (!initializeFirebase()) {
        if (loginMsg) loginMsg.textContent = "Firebase non è configurato: impossibile effettuare il login.";
        return;
      }

      try {
        const email = usernameToEmail(user);
        await auth.signInWithEmailAndPassword(email, pass);
        setAdminSession(true);
        if (loginMsg) loginMsg.textContent = "Accesso eseguito.";
        showPanel();
        return;
      } catch (error) {
        console.warn('Login error:', error);
        const code = error && error.code ? error.code : 'unknown';
        let message = error && error.message ? error.message : 'Errore di autenticazione';
        if (code === 'auth/invalid-email') {
          message = "Email non valida. Controlla che il nome utente sia corretto.";
        } else if (code === 'auth/user-not-found') {
          message = "Utente non trovato. Verifica il nome utente.";
        } else if (code === 'auth/wrong-password') {
          message = "Password errata.";
        }
        if (loginMsg) loginMsg.textContent = `Errore login: ${message} (${code})`;
        return;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (initializeFirebase()) {
        try {
          await auth.signOut();
        } catch (error) {
          console.warn("Firebase sign out failed:", error);
        }
      }
      setAdminSession(false);
      showLogin();
    });
  }
}

function setupResultsRealtimeSync() {
  const hasCalendar = !!document.getElementById("calendar-container") || !!document.getElementById("calendar-body");
  const hasStandings = !!document.getElementById("standings-body-a") || !!document.getElementById("standings-body-b") || !!document.getElementById("standings-body");
  const hasPlayerRanking = !!document.getElementById("player-rankings-body");
  const hasLastDay = !!document.getElementById("last-day-list");
  const hasNextDay = !!document.getElementById("next-day-list");
  if (!hasCalendar && !hasStandings && !hasPlayerRanking && !hasLastDay && !hasNextDay) return;
  if (!initializeFirebase() || !db || typeof db.collection !== "function") return;

  db.collection("tournament").doc("results").onSnapshot(
    async () => {
      if (hasCalendar) await renderCalendarIfPresent();
      if (hasStandings) await renderStandingsIfPresent();
      if (hasPlayerRanking) await renderPlayerRankingsIfPresent();
      if (hasLastDay) await renderLastDayIfPresent();
      if (hasNextDay) await renderNextDayIfPresent();
    },
    (error) => {
      console.warn("Realtime standings/calendar sync failed:", error);
    }
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderCalendarIfPresent();
  await renderStandingsIfPresent();
  await renderFinalPhaseIfPresent();
  await renderPlayerRankingsIfPresent();
  await renderLastDayIfPresent();
  await renderNextDayIfPresent();
  await renderTeamsIfPresent();
  await setupAdminPage();
  setupResultsRealtimeSync();

  // Process Instagram embeds after DOM is ready.
  // Try immediately, attach to the embed script's load event, or poll as fallback.
  (function processInstagramEmbeds() {
    function tryProcess() {
      if (window.instgrm && window.instgrm.Embed && typeof window.instgrm.Embed.process === 'function') {
        try {
          window.instgrm.Embed.process();
        } catch (e) {
          console.warn('Instagram embed processing failed:', e);
        }
        return true;
      }
      return false;
    }

    if (tryProcess()) return;

    const scripts = Array.from(document.getElementsByTagName('script'));
    const instaScript = scripts.find((s) => s.src && s.src.includes('instagram.com/embed.js'));
    if (instaScript) {
      instaScript.addEventListener('load', tryProcess);
      if (instaScript.readyState === 'complete' || instaScript.readyState === 'loaded') {
        tryProcess();
      }
    } else {
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js';
      s.async = true;
      s.defer = true;
      s.addEventListener('load', tryProcess);
      document.body.appendChild(s);
    }

    // Polling fallback (tries for ~5s)
    let tries = 0;
    const poll = setInterval(() => {
      if (tryProcess() || tries > 10) {
        clearInterval(poll);
      }
      tries++;
    }, 500);
  })();
});