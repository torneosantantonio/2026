const STORAGE_MATCH_RESULTS_KEY = "torneo_santantonio_results_v1";
const STORAGE_ADMIN_SESSION_KEY = "torneo_santantonio_admin_session_v1";

let auth = null;
let db = null;
let firebaseReady = false;

const ADMIN_USERNAME_EMAIL_SUFFIX = "@torneo-38d29.firebaseapp.com";
const ADMIN_USERNAME_EMAIL_MAP = {
  admin: `admin${ADMIN_USERNAME_EMAIL_SUFFIX}`,
  // aggiungi altri username se necessario
};

function usernameToEmail(username) {
  const normalized = (username || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("@")) return normalized;
  return ADMIN_USERNAME_EMAIL_MAP[normalized] || `${normalized}${ADMIN_USERNAME_EMAIL_SUFFIX}`;
}

// Squadre e calendario presi dalla locandina gironi.jpeg
const TEAMS_DATA = [
  { name: "Mirabellarum Robur", group: "A", logo: "resources/logos/mirabellarum_robur.png", photo: "resources/images/mirabellarur_rorum.jpeg", players: ["Pierro Michele", "Macchiaverna Rocco", "Solimine Antonio", "Di Corcia Antonio", "De Angelis Antonio", "Lambarelli Christian", "Chinni Niccolò", "Lisi Pasquale"] },
  { name: "Monteleone", group: "A", logo: "resources/logos/monteleone.png", photo: "resources/images/monteleone.jpeg", players: ["Addorisio Giuseppe", "Caggianiello Diego", "Pucillo Ivan", "Colangelo Fedele", "Labbate Giuliano", "Tarantino Raffaele", "Manserra Vincenzo", "Novia Giuseppe", "Santos Juanfran", "Mamadou Sabaly", "Lamanna Antonio", "Grosso Mario"] },
  { name: "RP Team", group: "A", logo: "resources/logos/rp_team.png", photo: "resources/images/rp_team.jpeg", players: ["Nasser Eddine Mohamed", "Manserra Leonardo", "Andriuh Yhiuan", "Pucillo Angelo", "Postiglione Giuseppe", "Eddine Ali Nasser", "Lorizzo Michele", "Labriola Michele", "Ramadan Shehab", "Moshodi Farouk", "Ahmed Fares", "Hanafi Momen"] },
  { name: "FC Orsa Maggiore", group: "A", logo: "resources/logos/fc_orsa_maggiore.png", photo: "resources/images/fc_orsa_maggiore.jpeg", players: ["Tounkara Adama", "Sidibe Fakouly", "Kone Oumar", "Jaiteh Foday", "Sidibe Yoro", "Traore Nouha", "Sacko Basadio", "Sheikh Himel", "Hawlader Sanjit/Sohan", "Ebrima Gaye", "Bah Dawda", "Fadiga Fode"] },
  { name: "Team DR", group: "A", logo: "resources/logos/team_dr.png", photo: "resources/images/team_dr.jpeg", players: ["Cardinale Lorenzo", "Riccio Carmelo", "Zevola Giacomo", "Chillo Raffaele", "Costanzo Nicola", "Luzzi Leonardo", "Salines Mateo", "Pollastrone Luigi", "Rigillo Carmelo", "Ciano Stefano", "Morra Vito", "Contardo Luca"] },
  { name: "Red Wolves", group: "B", logo: "resources/logos/red_wolves.png", photo: "resources/images/red_wolves.jpeg", players: ["Hamada Karim", "Manserra Vincenzo", "Seydou Sinka", "Simone Mario", "Kassam Karim", "Muhammed Kamus Camara", "Jammeh Moddou", "Labriola Alessandro"] },
  { name: "RP Gold Team", group: "B", logo: "resources/logos/rp_gold_team.png", photo: "resources/images/rp_gold_team.jpeg", players: ["Iacullo Luca", "Iacullo Gerardo", "Donofrio Antonio", "Viola Antonello", "Barbato Sergio", "Loreto Gerardo", "Del Vento Giuseppe", "Daquino Italo", "Di Vito Antonio", "De Rosa Roberto"] },
  { name: "Zetaquadro Bar", group: "B", logo: "resources/logos/zetaquadro_bar.png", photo: "resources/images/zetaquadro_bar.jpeg", players: ["Rigillo Francesco", "Capuano Nicola", "Marino Domenico", "Rauseo Giuseppe", "Pizzulo Giovanni", "Sauro Nazario", "Di Masi Euplio", "De Feo Antonio"] },
  { name: "HP", group: "B", logo: "resources/logos/hp.png", photo: "resources/images/hp.jpeg", players: ["Annichiarico Antonio", "Cagliuli Marco", "Cornacchia Andrea", "Cornacchia Giuseppe", "De Cotiis Alfonso", "De Cotiis Vito", "El Majery Zaccaria", "Ibrahim Sory Camara", "Lapolla Giuseppe", "Spada Fabrizio"] },
  { name: "Bar in Piazza", group: "B", logo: "resources/logos/bar_in_piazza.png", photo: "resources/images/bar_in_piazza.jpeg", players: ["Barbato Giuseppe", "Membrino Luigi", "Rattazzi Simone", "Di Pippa Luca", "Elviro Antonio", "Santoro Mario", "Puzo Gabriele", "Di Laurenzo Francesco C.", "Lo Conte Giovanni"] },
];

const TEAMS = TEAMS_DATA.map(t => t.name);

const MATCHES = [
  // 27 Maggio
  { id: "m1", date: "27 Maggio", time: "19:00", home: "Mirabellarum Robur", away: "Team DR", field: "Campo", group: "A" },
  { id: "m2", date: "27 Maggio", time: "20:00", home: "Red Wolves", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m3", date: "27 Maggio", time: "21:00", home: "FC Orsa Maggiore", away: "RP Team", field: "Campo", group: "A" },

  // 28 Maggio
  { id: "m4", date: "28 Maggio", time: "20:00", home: "Monteleone", away: "RP Team", field: "Campo", group: "A" },
  { id: "m5", date: "28 Maggio", time: "21:00", home: "Zetaquadro Bar", away: "Red Wolves", field: "Campo", group: "B" },

  // 29 Maggio
  { id: "m6", date: "29 Maggio", time: "19:00", home: "HP", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m7", date: "29 Maggio", time: "20:00", home: "RP Gold Team", away: "Zetaquadro Bar", field: "Campo", group: "B" },
  { id: "m8", date: "29 Maggio", time: "21:00", home: "FC Orsa Maggiore", away: "Team DR", field: "Campo", group: "A" },

  // 1 Giugno
  { id: "m9", date: "1 Giugno", time: "19:00", home: "Monteleone", away: "FC Orsa Maggiore", field: "Campo", group: "A" },
  { id: "m10", date: "1 Giugno", time: "20:00", home: "RP Gold Team", away: "HP", field: "Campo", group: "B" },
  { id: "m11", date: "1 Giugno", time: "21:00", home: "RP Team", away: "Mirabellarum Robur", field: "Campo", group: "A" },

  // 4 Giugno
  { id: "m12", date: "4 Giugno", time: "19:00", home: "Bar in Piazza", away: "RP Gold Team", field: "Campo", group: "B" },
  { id: "m13", date: "4 Giugno", time: "20:00", home: "Zetaquadro Bar", away: "HP", field: "Campo", group: "B" },
  { id: "m14", date: "4 Giugno", time: "21:00", home: "RP Team", away: "Team DR", field: "Campo", group: "A" },

  // 5 Giugno
  { id: "m15", date: "5 Giugno", time: "19:00", home: "Monteleone", away: "Mirabellarum Robur", field: "Campo", group: "A" },
  { id: "m16", date: "5 Giugno", time: "20:00", home: "Zetaquadro Bar", away: "Bar in Piazza", field: "Campo", group: "B" },
  { id: "m17", date: "5 Giugno", time: "21:00", home: "Red Wolves", away: "HP", field: "Campo", group: "B" },

  // 6 Giugno
  { id: "m18", date: "6 Giugno", time: "20:00", home: "Red Wolves", away: "RP Gold Team", field: "Campo", group: "B" },
  { id: "m19", date: "6 Giugno", time: "21:00", home: "Team DR", away: "Monteleone", field: "Campo", group: "A" },
  { id: "m20", date: "6 Giugno", time: "21:00", home: "FC Orsa Maggiore", away: "Mirabellarum Robur", field: "Campo", group: "A" },
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

function loadResultsLocally() {
  const raw = localStorage.getItem(STORAGE_MATCH_RESULTS_KEY);
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
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
      return snapshot.data().results;
    }
    const localResults = loadResultsLocally();
    return Object.keys(localResults).length ? localResults : {};
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
  if (initializeFirebase()) {
    try {
      await db.collection("tournament").doc("results").set({ results });
    } catch (error) {
      console.warn("Firestore save failed:", error);
      saveResultsLocally(results);
    }
  } else {
    saveResultsLocally(results);
  }
}

async function upsertResult(matchId, homeGoals, awayGoals) {
  const current = await loadResults();
  if (homeGoals === "" || awayGoals === "") {
    delete current[matchId];
  } else {
    current[matchId] = {
      homeGoals: Number(homeGoals),
      awayGoals: Number(awayGoals),
    };
  }
  await saveResults(current);
}

function getResultLabel(match, results) {
  const result = results[match.id];
  if (!result) {
    return "Da giocare";
  }
  return `${result.homeGoals} - ${result.awayGoals}`;
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

async function renderNextDayIfPresent() {
  const list = document.getElementById("next-day-list");
  if (!list) return;
  list.innerHTML = "";
  const nextMatches = MATCHES.slice(0, 3);
  nextMatches.forEach((match) => {
    const li = document.createElement("li");
    li.textContent = `${match.date} ${match.time} — ${match.home} vs ${match.away}`;
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
        <td>${match.date}</td>
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
    header.textContent = date;
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
    const players = (team.players || []).slice(0, 12);
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
        <td>${row.pts}</td>
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
        <td>${row.pts}</td>
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
        <td>${row.pts}</td>
      `;
      tbodyB.appendChild(tr);
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
    row.className = "admin-match-row";
    const result = results[match.id] || { homeGoals: "", awayGoals: "" };
    row.innerHTML = `
      <div class="admin-match-title">${match.date} ${match.time} · ${match.home} vs ${match.away}</div>
      <div class="score-grid">
        <div>
          <label>${match.home}</label>
          <input type="number" min="0" value="${result.homeGoals}" data-match="${match.id}" data-side="home">
        </div>
        <div>
          <label>${match.away}</label>
          <input type="number" min="0" value="${result.awayGoals}" data-match="${match.id}" data-side="away">
        </div>
        <button type="button" data-save="${match.id}">Salva</button>
      </div>
      <div class="status-msg" id="status-${match.id}"></div>
    `;
    adminMatches.appendChild(row);
  });

  adminMatches.querySelectorAll("button[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const homeInput = adminMatches.querySelector(`input[data-match="${id}"][data-side="home"]`);
      const awayInput = adminMatches.querySelector(`input[data-match="${id}"][data-side="away"]`);
      await upsertResult(id, homeInput.value, awayInput.value);
      const status = document.getElementById(`status-${id}`);
      status.textContent = "Risultato aggiornato.";
      await renderCalendarIfPresent();
      await renderStandingsIfPresent();
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
    renderAdminMatches();
  }

  function showLogin() {
    panelBox.classList.add("hidden");
    loginBox.classList.remove("hidden");
  }

  if (firebaseEnabled) {
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
    loginForm.querySelectorAll("input,button").forEach((el) => (el.disabled = true));
    showLogin();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = document.getElementById("admin-user").value.trim();
    const pass = document.getElementById("admin-pass").value;
    if (!initializeFirebase()) {
      loginMsg.textContent = "Firebase non è configurato: impossibile effettuare il login.";
      return;
    }

    try {
      const email = usernameToEmail(user);
      await auth.signInWithEmailAndPassword(email, pass);
      setAdminSession(true);
      loginMsg.textContent = "Accesso eseguito.";
      showPanel();
      return;
    } catch (error) {
      console.warn('Login error:', error);
      const code = error && error.code ? error.code : 'unknown';
      const message = error && error.message ? error.message : 'Errore di autenticazione';
      loginMsg.textContent = `Errore login: ${message} (${code}). Verifica nome utente/password e che il provider Email/Password sia attivo in Firebase.`;
      return;
    }
  });

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

function setupResultsRealtimeSync() {
  const hasCalendar = !!document.getElementById("calendar-container") || !!document.getElementById("calendar-body");
  const hasStandings = !!document.getElementById("standings-body-a") || !!document.getElementById("standings-body-b") || !!document.getElementById("standings-body");
  if (!hasCalendar && !hasStandings) return;
  if (!initializeFirebase() || !db || typeof db.collection !== "function") return;

  db.collection("tournament").doc("results").onSnapshot(
    async () => {
      if (hasCalendar) await renderCalendarIfPresent();
      if (hasStandings) await renderStandingsIfPresent();
    },
    (error) => {
      console.warn("Realtime standings/calendar sync failed:", error);
    }
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  await renderCalendarIfPresent();
  await renderStandingsIfPresent();
  await renderNextDayIfPresent();
  await renderTeamsIfPresent();
  await setupAdminPage();
  setupResultsRealtimeSync();
});
