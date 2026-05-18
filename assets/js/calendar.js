const LEADER_TABLE = "leaders";
const SONG_TABLE = "songs";
const SERVICE_TABLE = "services";
const SERVICE_SONG_TABLE = "service_songs";
const DRAFT_STORAGE_KEY = "worshipteam_service_draft";

let leadersCache = [];
let songsCache = [];
let servicesCache = [];
let serviceSongsCache = [];

function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === "function") return window.supabase;

  throw new Error(
    "Supabase client not found. Make sure your Supabase client script loads before calendar.js."
  );
}

function getDraft() {
  const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
  return storedDraft ? JSON.parse(storedDraft) : null;
}

function saveDraft(draft) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function formatDateDisplay(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function toMonthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMobileCalendarView() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function mapLeaderFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    status: row.status || "active",
    notes: row.notes || ""
  };
}

function mapSongFromDb(row) {
  return {
    id: row.id,
    title: row.title || "",
    originalArtist: row.original_artist || "",
    language: row.language || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    youtubeLink: row.youtube_link || "",
    notes: row.notes || ""
  };
}

function mapServiceFromDb(row) {
  return {
    id: row.id,
    serviceDate: row.service_date,
    leaderId: row.leader_id,
    createdAt: row.created_at
  };
}

function mapServiceSongFromDb(row) {
  return {
    id: row.id,
    serviceId: row.service_id,
    songId: row.song_id,
    category: row.category || "",
    songKey: row.song_key || "",
    notes: row.notes || "",
    rowOrder: row.row_order ?? 0,
    createdAt: row.created_at
  };
}

async function fetchLeaders() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(LEADER_TABLE)
      .select("id, name, status, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapLeaderFromDb);
  } catch (error) {
    console.error("Failed to fetch leaders:", error);
    return [];
  }
}

async function fetchSongs() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(SONG_TABLE)
      .select("id, title, original_artist, language, tags, youtube_link, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapSongFromDb);
  } catch (error) {
    console.error("Failed to fetch songs:", error);
    return [];
  }
}

async function fetchServices() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(SERVICE_TABLE)
      .select("id, service_date, leader_id, created_at")
      .order("service_date", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapServiceFromDb);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}

async function fetchServiceSongs() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(SERVICE_SONG_TABLE)
      .select("id, service_id, song_id, category, song_key, notes, row_order, created_at")
      .order("row_order", { ascending: true });

    if (error) throw error;
    return (data || []).map(mapServiceSongFromDb);
  } catch (error) {
    console.error("Failed to fetch service songs:", error);
    return [];
  }
}

async function loadAllData() {
  const results = await Promise.allSettled([
    fetchLeaders(),
    fetchSongs(),
    fetchServices(),
    fetchServiceSongs()
  ]);

  leadersCache = results[0].status === "fulfilled" ? results[0].value : [];
  songsCache = results[1].status === "fulfilled" ? results[1].value : [];
  servicesCache = results[2].status === "fulfilled" ? results[2].value : [];
  serviceSongsCache = results[3].status === "fulfilled" ? results[3].value : [];

  const names = ["leaders", "songs", "services", "service_songs"];

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Failed to load ${names[index]}:`, result.reason);
    }
  });
}

function renderLeaderOptions(selectEl, selectedLeaderId = "") {
  selectEl.innerHTML = '<option value="">Select leader</option>';

  if (!leadersCache.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No leaders available";
    selectEl.appendChild(option);
    return;
  }

  leadersCache.forEach((leader) => {
    const option = document.createElement("option");
    option.value = leader.id;
    option.textContent = `${leader.name}${leader.status === "inactive" ? " (inactive)" : ""}`;
    if (leader.id === selectedLeaderId) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

function getSongById(songId) {
  return songsCache.find((song) => song.id === songId) || null;
}

function getServiceSongsForService(serviceId) {
  return serviceSongsCache
    .filter((row) => row.serviceId === serviceId)
    .sort((a, b) => a.rowOrder - b.rowOrder);
}

function getLeaderSongHistory(leaderId, songId) {
  const history = [];
  const serviceMap = new Map(servicesCache.map((service) => [service.id, service]));

  serviceSongsCache.forEach((serviceSong) => {
    if (serviceSong.songId !== songId) return;

    const service = serviceMap.get(serviceSong.serviceId);
    if (!service || service.leaderId !== leaderId) return;

    history.push({
      serviceDate: service.serviceDate,
      key: serviceSong.songKey,
      category: serviceSong.category,
      notes: serviceSong.notes || ""
    });
  });

  history.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));
  return history;
}

function getKeyFrequency(history) {
  const frequency = {};

  history.forEach((entry) => {
    if (!entry.key) return;
    frequency[entry.key] = (frequency[entry.key] || 0) + 1;
  });

  return frequency;
}

function getMostUsedKey(frequency) {
  let topKey = "";
  let topCount = 0;

  Object.entries(frequency).forEach(([key, count]) => {
    if (count > topCount) {
      topKey = key;
      topCount = count;
    }
  });

  return topKey;
}

function buildSongIntelligenceHTML(history) {
  if (!history.length) {
    return `
      <div class="song-intelligence empty">
        <p>No previous history for this leader and song yet.</p>
      </div>
    `;
  }

  const latest = history[0];
  const frequency = getKeyFrequency(history);
  const mostUsedKey = getMostUsedKey(frequency);

  const frequencyHTML = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      return `
        <div class="intelligence-pill">
          <strong>${key}</strong>
          <span>${count}x</span>
        </div>
      `;
    })
    .join("");

  const historyHTML = history
    .slice(0, 5)
    .map((entry) => {
      return `
        <div class="history-row">
          <span>${formatDateDisplay(entry.serviceDate)}</span>
          <strong>${entry.key}</strong>
        </div>
      `;
    })
    .join("");

  return `
    <div class="song-intelligence">
      <div class="intelligence-grid">
        <div class="intelligence-box">
          <small>Most Used Key</small>
          <strong>${mostUsedKey || "N/A"}</strong>
        </div>

        <div class="intelligence-box">
          <small>Last Used Key</small>
          <strong>${latest.key || "N/A"}</strong>
        </div>

        <div class="intelligence-box">
          <small>Last Used Date</small>
          <strong>${formatDateDisplay(latest.serviceDate)}</strong>
        </div>
      </div>

      <div class="intelligence-section">
        <small class="intelligence-label">Key History</small>
        <div class="intelligence-pill-wrap">
          ${frequencyHTML}
        </div>
      </div>

      <div class="intelligence-section">
        <small class="intelligence-label">Previous Services</small>
        <div class="history-list">
          ${historyHTML}
        </div>
      </div>
    </div>
  `;
}

function songMatchesCategory(song, category) {
  if (!category) return true;
  return (song.tags || []).includes(category);
}

function songMatchesQuery(song, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const titleMatch = (song.title || "").toLowerCase().includes(q);
  const artistMatch = (song.originalArtist || "").toLowerCase().includes(q);
  const languageMatch = (song.language || "").toLowerCase().includes(q);
  const tagMatch = (song.tags || []).some((tag) => tag.toLowerCase().includes(q));

  return titleMatch || artistMatch || languageMatch || tagMatch;
}

function autoSaveDraftFromForm() {
  saveDraft(collectDraftFromForm());
}

function collectDraftFromForm() {
  const serviceId = document.getElementById("serviceId").value.trim();
  const serviceDate = document.getElementById("serviceDate").value;
  const leaderSelect = document.getElementById("leaderSelect");

  const rows = Array.from(document.querySelectorAll(".lineup-row")).map((row) => {
    return {
      rowId: row.dataset.rowId,
      category: row.querySelector(".song-category").value,
      songId: row.querySelector(".song-id").value,
      key: row.querySelector(".song-key").value.trim(),
      notes: row.querySelector(".song-notes").value.trim()
    };
  });

  return {
    serviceId,
    serviceDate,
    leaderId: leaderSelect.value,
    rows
  };
}

function createSongRow(rowData = {}) {
  const row = document.createElement("div");
  row.className = "lineup-row";
  row.dataset.rowId = rowData.rowId || `row-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  row.innerHTML = `
    <div class="lineup-grid">
      <label>
        <span class="label-text">
          Category
          <span class="required-mark">*</span>
        </span>
        <select class="song-category" required>
          <option value="">Select category</option>
          <option value="opening">Opening</option>
          <option value="praise">Praise</option>
          <option value="worship">Worship</option>
          <option value="ministry">Ministry</option>
          <option value="victory">Victory</option>
        </select>
      </label>

      <div class="field-block">
        <span class="label-text">
          Song
          <span class="required-mark">*</span>
        </span>

        <input type="hidden" class="song-id" value="" />

        <div class="song-search-shell">
          <input
            type="search"
            class="song-search"
            placeholder="Choose a category first"
            autocomplete="off"
            disabled
          />
          <div class="song-search-results hidden"></div>
        </div>

        <div class="selected-song-display hidden"></div>
        <div class="song-intelligence-wrapper hidden"></div>
      </div>

      <label>
        <span class="label-text">
          Key
          <span class="required-mark">*</span>
        </span>
        <input type="text" class="song-key" placeholder="G, A, Bb..." required />
      </label>

      <label>
        Notes
        <textarea class="song-notes" rows="2" placeholder="Optional notes"></textarea>
      </label>
    </div>

    <div class="lineup-row-actions">
      <button type="button" class="secondary-btn remove-row-btn">Remove</button>
    </div>
  `;

  const categorySelect = row.querySelector(".song-category");
  const songIdInput = row.querySelector(".song-id");
  const songSearchInput = row.querySelector(".song-search");
  const songResults = row.querySelector(".song-search-results");
  const selectedSongDisplay = row.querySelector(".selected-song-display");
  const intelligenceWrapper = row.querySelector(".song-intelligence-wrapper");
  const keyInput = row.querySelector(".song-key");
  const notesInput = row.querySelector(".song-notes");

  function renderSongResults() {
    const category = categorySelect.value;
    const query = songSearchInput.value;

    songResults.innerHTML = "";

    const filteredSongs = songsCache.filter((song) => {
      return songMatchesCategory(song, category) && songMatchesQuery(song, query);
    });

    if (!category) {
      songResults.innerHTML = `<p class="results-hint">Choose a category first to filter songs.</p>`;
      songResults.classList.remove("hidden");
      return;
    }

    if (!filteredSongs.length) {
      songResults.innerHTML = `<p class="results-hint">No songs found for that category.</p>`;
      songResults.classList.remove("hidden");
      return;
    }

    filteredSongs.forEach((song) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "song-result-btn";
      button.innerHTML = `
        <strong>${song.title}</strong>
        <span>${song.originalArtist || "N/A"}</span>
        <small>${(song.tags || []).join(", ") || "No tags"}</small>
      `;

      button.addEventListener("click", () => {
        setSelectedSong(song.id);
        autoSaveDraftFromForm();
      });

      songResults.appendChild(button);
    });

    songResults.classList.remove("hidden");
  }

  function refreshRowIntelligence() {
    const leaderId = document.getElementById("leaderSelect").value;
    const songId = songIdInput.value;

    if (!leaderId || !songId) {
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";
      return;
    }

    const history = getLeaderSongHistory(leaderId, songId);
    intelligenceWrapper.innerHTML = buildSongIntelligenceHTML(history);
    intelligenceWrapper.classList.remove("hidden");

    if (!keyInput.value.trim() && history.length > 0) {
      const frequency = getKeyFrequency(history);
      const suggestedKey = getMostUsedKey(frequency) || history[0].key || "";
      keyInput.value = suggestedKey;
    }
  }

  function setSelectedSong(songId) {
    songIdInput.value = songId || "";

    const song = songId ? getSongById(songId) : null;

    if (!song) {
      selectedSongDisplay.classList.add("hidden");
      selectedSongDisplay.innerHTML = "";
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";
      songResults.classList.remove("hidden");
      renderSongResults();
      return;
    }

    selectedSongDisplay.innerHTML = `
      <div class="selected-song-chip">
        <div>
          <strong>${song.title}</strong>
          <span>${song.originalArtist || "N/A"}</span>
          <small>${(song.tags || []).join(", ") || "No tags"}</small>
        </div>
        <button type="button" class="secondary-btn change-song-btn">Change</button>
      </div>
    `;

    selectedSongDisplay.classList.remove("hidden");
    songResults.classList.add("hidden");
    songSearchInput.value = song.title;

    const changeBtn = selectedSongDisplay.querySelector(".change-song-btn");
    changeBtn.addEventListener("click", () => {
      songIdInput.value = "";
      selectedSongDisplay.classList.add("hidden");
      selectedSongDisplay.innerHTML = "";
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";
      songSearchInput.value = "";
      songSearchInput.focus();
      renderSongResults();
    });

    refreshRowIntelligence();
  }

  function syncSongSearchState() {
    const category = categorySelect.value;
    const songId = songIdInput.value;
    const song = songId ? getSongById(songId) : null;

    songSearchInput.disabled = !category;
    songSearchInput.placeholder = category
      ? "Search by title, artist, or tag"
      : "Choose a category first";

    if (song && category && !(song.tags || []).includes(category)) {
      songIdInput.value = "";
      selectedSongDisplay.classList.add("hidden");
      selectedSongDisplay.innerHTML = "";
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";
      songSearchInput.value = "";
    }

    if (songIdInput.value) {
      const currentSong = getSongById(songIdInput.value);
      if (currentSong) {
        setSelectedSong(currentSong.id);
      }
    }

    if (!songIdInput.value) {
      selectedSongDisplay.classList.add("hidden");
      selectedSongDisplay.innerHTML = "";
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";

      if (!category) {
        songResults.classList.add("hidden");
        songResults.innerHTML = "";
      } else {
        renderSongResults();
      }
    }
  }

  categorySelect.addEventListener("change", () => {
    syncSongSearchState();
    refreshRowIntelligence();
    autoSaveDraftFromForm();
  });

  songSearchInput.addEventListener("input", () => {
    if (!categorySelect.value) return;
    renderSongResults();
    autoSaveDraftFromForm();
  });

  songSearchInput.addEventListener("focus", () => {
    if (!categorySelect.value) return;
    renderSongResults();
  });

  if (rowData.category) categorySelect.value = rowData.category;
  if (rowData.key) keyInput.value = rowData.key;
  if (rowData.notes) notesInput.value = rowData.notes;
  if (rowData.songId) songIdInput.value = rowData.songId;

  syncSongSearchState();

  if (rowData.songId) {
    setSelectedSong(rowData.songId);
  }

  row.addEventListener("input", () => {
    autoSaveDraftFromForm();
  });

  row.addEventListener("change", () => {
    autoSaveDraftFromForm();
  });

  row.querySelector(".remove-row-btn").addEventListener("click", () => {
    row.remove();
    autoSaveDraftFromForm();
  });

  return row;
}

function renderSelectedSundayCard(dateString) {
  const selectedSundayCard = document.getElementById("selectedSundayCard");

  if (!dateString) {
    selectedSundayCard.innerHTML = `
      <p>Click a Sunday on the calendar to create or edit a service.</p>
    `;
    return;
  }

  const service = servicesCache.find((item) => item.serviceDate === dateString);

  if (!service) {
    selectedSundayCard.innerHTML = `
      <h3>${formatDateDisplay(dateString)}</h3>
      <p><strong>Open Sunday</strong></p>
      <p>No service has been saved for this Sunday yet.</p>
    `;
    return;
  }

  const leader = leadersCache.find((item) => item.id === service.leaderId);
  const serviceSongs = getServiceSongsForService(service.id);

  selectedSundayCard.innerHTML = `
    <h3>${formatDateDisplay(service.serviceDate)}</h3>
    <p><strong>Leader:</strong> ${leader?.name || service.leaderId || "N/A"}</p>

    <div class="song-block">
      ${
        serviceSongs.length
          ? serviceSongs
              .map((row) => {
                const song = getSongById(row.songId);

                return `
                  <div class="mini-card">
                    <p class="detail-line"><span class="detail-label detail-category">Category:</span> <span class="detail-value">${row.category || "N/A"}</span></p>
                    <p class="detail-line"><span class="detail-label detail-song">Song:</span> <span class="detail-value">${song?.title || row.songId || "N/A"}</span></p>
                    <p class="detail-line"><span class="detail-label detail-artist">Original Artist:</span> <span class="detail-value">${song?.originalArtist || "N/A"}</span></p>
                    <p class="detail-line"><span class="detail-label detail-key">Key:</span> <span class="detail-value">${row.songKey || "N/A"}</span></p>
                    <p class="detail-line"><span class="detail-label detail-notes">Notes:</span> <span class="detail-value">${row.notes || "None"}</span></p>
                  </div>
                `;
              })
              .join("")
          : "<p>No songs added yet.</p>"
      }
    </div>

    <div class="selected-service-actions">
      <button type="button" class="secondary-btn delete-sunday-btn" data-id="${service.id}" data-date="${service.serviceDate}">
        Delete Sunday
      </button>
    </div>
  `;

  const deleteBtn = selectedSundayCard.querySelector(".delete-sunday-btn");

  deleteBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `Delete the saved service for ${formatDateDisplay(service.serviceDate)}?`
    );

    if (!confirmed) return;

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from(SERVICE_TABLE)
        .delete()
        .eq("id", service.id)
        .select("id");

      if (error) throw error;

      clearDraft();
      await loadAllData();
      resetFormForNewService(service.serviceDate);
      renderCalendar();
      renderSelectedSundayCard(service.serviceDate);
      refreshAllRowIntelligence();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error.message || "Could not delete the service.");
    }
  });
}
function renderCalendar() {
  const calendarGrid = document.getElementById("calendarGrid");
  const monthPicker = document.getElementById("monthPicker");
  const viewDate = new Date(`${monthPicker.value}-01T00:00:00`);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDayOfMonth.getDay();

  const selectedDate = document.getElementById("serviceDate").value;
  const servicesByDate = new Map(
    servicesCache.map((service) => [service.serviceDate, service])
  );

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayString = toDateInputValue(new Date());

  calendarGrid.innerHTML = "";

  weekdayLabels.forEach((day) => {
    const header = document.createElement("div");
    header.className = "weekday-cell";
    header.textContent = day;
    calendarGrid.appendChild(header);
  });

  for (let i = 0; i < startDay; i += 1) {
    const blank = document.createElement("div");
    blank.className = "day-cell empty";
    calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateString = toDateInputValue(date);
    const service = servicesByDate.get(dateString);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isSelected = selectedDate === dateString;
    const isToday = todayString === dateString;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.dataset.date = dateString;
    cell.disabled = !isSunday && !isSaturday;

    if (isSunday) cell.classList.add("is-sunday");
    if (isSaturday) cell.classList.add("is-saturday");
    if (!isSunday && !isSaturday) cell.classList.add("weekday-cell-type");
    if (service) cell.classList.add("has-service");
    if (isToday) cell.classList.add("is-today");
    if (isSelected) cell.classList.add("is-selected");

    const nextSunday = new Date(year, month, day + 1);

    cell.innerHTML = `
      <span class="day-number">${day}</span>
      ${
        isSunday
          ? `
            <span class="day-badge">${service ? "Saved" : "Sunday"}</span>
            <span class="day-summary">
              ${
                service
                  ? `${(leadersCache.find((item) => item.id === service.leaderId) || {}).name || "Leader"} • ${getServiceSongsForService(service.id).length} songs`
                  : "Open service"
              }
            </span>
          `
          : isSaturday
            ? `
              <span class="day-badge">Rehearsal</span>
              <span class="day-summary">
                Rehearsal for ${formatDateDisplay(toDateInputValue(nextSunday))} Service
              </span>
            `
            : `<span class="day-summary muted">Weekday</span>`
      }
    `;

    if (isSunday || isSaturday) {
      cell.addEventListener("click", () => {
        autoSaveDraftFromForm();

        if (isSunday) {
          document.getElementById("serviceDate").value = dateString;
          const service = servicesByDate.get(dateString);
          if (service) {
            loadServiceIntoForm(dateString);
            renderSelectedSundayCard(dateString);
          } else {
            resetFormForNewService(dateString);
            renderSelectedSundayCard(dateString);
          }
        } else {
          renderSelectedSundayCard("");
        }

        renderCalendar();
      });
    }

    calendarGrid.appendChild(cell);
  }
}
function resetFormForNewService(dateString = "") {
  const songRows = document.getElementById("songRows");
  const plannerTitle = document.getElementById("plannerTitle");
  const serviceIdInput = document.getElementById("serviceId");
  const serviceDateInput = document.getElementById("serviceDate");
  const leaderSelect = document.getElementById("leaderSelect");

  plannerTitle.textContent = "Create Service";
  serviceIdInput.value = "";
  serviceDateInput.value = dateString || "";
  leaderSelect.value = "";
  songRows.innerHTML = "";
  songRows.appendChild(createSongRow());

  if (dateString) {
    const current = new Date(`${dateString}T00:00:00`);
    document.getElementById("monthPicker").value = toMonthInputValue(current);
  }
}

function restoreDraftToForm(draft) {
  if (!draft) return;

  document.getElementById("serviceId").value = draft.serviceId || "";
  document.getElementById("serviceDate").value = draft.serviceDate || "";
  document.getElementById("leaderSelect").value = draft.leaderId || "";

  const songRows = document.getElementById("songRows");
  songRows.innerHTML = "";

  const rows = draft.rows && draft.rows.length ? draft.rows : [{}];

  rows.forEach((rowData) => {
    songRows.appendChild(createSongRow(rowData));
  });

  renderLeaderOptions(
    document.getElementById("leaderSelect"),
    draft.leaderId || ""
  );
}

function loadServiceIntoForm(serviceOrDate) {
  const songRows = document.getElementById("songRows");
  const plannerTitle = document.getElementById("plannerTitle");
  const serviceIdInput = document.getElementById("serviceId");
  const serviceDateInput = document.getElementById("serviceDate");
  const leaderSelect = document.getElementById("leaderSelect");
  const monthPicker = document.getElementById("monthPicker");

  const service =
    typeof serviceOrDate === "string"
      ? servicesCache.find((item) => item.serviceDate === serviceOrDate)
      : serviceOrDate;

  if (!service) {
    plannerTitle.textContent = "Create Service";
    serviceIdInput.value = "";
    serviceDateInput.value = typeof serviceOrDate === "string" ? serviceOrDate : "";
    leaderSelect.value = "";
    songRows.innerHTML = "";
    songRows.appendChild(createSongRow());

    if (serviceDateInput.value) {
      const current = new Date(`${serviceDateInput.value}T00:00:00`);
      monthPicker.value = toMonthInputValue(current);
    }

    saveDraft(collectDraftFromForm());
    return;
  }

  plannerTitle.textContent = "Edit Service";
  serviceIdInput.value = service.id;
  serviceDateInput.value = service.serviceDate;
  leaderSelect.value = service.leaderId;

  const serviceSongs = getServiceSongsForService(service.id);

  songRows.innerHTML = "";

  serviceSongs.forEach((row) => {
    songRows.appendChild(
      createSongRow({
        rowId: row.id,
        category: row.category,
        songId: row.songId,
        key: row.songKey,
        notes: row.notes
      })
    );
  });

  if (!songRows.children.length) {
    songRows.appendChild(createSongRow());
  }

  const current = new Date(`${service.serviceDate}T00:00:00`);
  monthPicker.value = toMonthInputValue(current);

  saveDraft(collectDraftFromForm());
  refreshAllRowIntelligence();
}

async function saveServiceFromForm(event) {
  event.preventDefault();

  const serviceError = document.getElementById("serviceError");
  const serviceId = document.getElementById("serviceId").value.trim();
  const serviceDate = document.getElementById("serviceDate").value;
  const leaderId = document.getElementById("leaderSelect").value;
  const rows = Array.from(document.querySelectorAll(".lineup-row"));

  serviceError.classList.add("hidden");

  if (!serviceDate) {
    serviceError.textContent = "Please choose a service date.";
    serviceError.classList.remove("hidden");
    return;
  }

  const dateObj = new Date(`${serviceDate}T00:00:00`);
  if (dateObj.getDay() !== 0) {
    serviceError.textContent = "Please choose a Sunday date for the service.";
    serviceError.classList.remove("hidden");
    return;
  }

  const duplicate = servicesCache.find(
    (service) => service.serviceDate === serviceDate && service.id !== serviceId
  );

  if (duplicate) {
    serviceError.textContent = `An existing record already exists for ${formatDateDisplay(serviceDate)}. Please edit/remove the completed form instead.`;
    serviceError.classList.remove("hidden");
    return;
  }

  if (!leaderId) {
    serviceError.textContent = "Please select a leader.";
    serviceError.classList.remove("hidden");
    return;
  }

  if (!rows.length) {
    serviceError.textContent = "Please add at least one song row.";
    serviceError.classList.remove("hidden");
    return;
  }

  const lineup = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const category = row.querySelector(".song-category").value;
    const songId = row.querySelector(".song-id").value;
    const key = row.querySelector(".song-key").value.trim();
    const notes = row.querySelector(".song-notes").value.trim();

    if (!category || !songId || !key) {
      serviceError.textContent = "Every song row must have a category, song, and key.";
      serviceError.classList.remove("hidden");
      return;
    }

    const song = getSongById(songId);
    if (!song) {
      serviceError.textContent = "One of the selected songs was not found. Please add it first.";
      serviceError.classList.remove("hidden");
      return;
    }

    lineup.push({
      songId: song.id,
      category,
      key,
      notes,
      rowOrder: i
    });
  }

  const leader = leadersCache.find((item) => item.id === leaderId);
  if (!leader) {
    serviceError.textContent = "Selected leader was not found. Please add them first.";
    serviceError.classList.remove("hidden");
    return;
  }

  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("save_service_with_songs", {
      p_service_id: serviceId || null,
      p_service_date: serviceDate,
      p_leader_id: leader.id,
      p_songs: lineup
    });

    if (error) throw error;

    clearDraft();
    await loadAllData();

    const savedDate = serviceDate;
    resetFormForNewService(savedDate);
    renderCalendar();
    renderSelectedSundayCard(savedDate);
    refreshAllRowIntelligence();

    if (data) {
      document.getElementById("serviceId").value = data;
    }
  } catch (error) {
    console.error("Service save failed:", error);
    serviceError.textContent = error.message || "Could not save the service.";
    serviceError.classList.remove("hidden");
  }
}

function refreshAllRowIntelligence() {
  document.querySelectorAll(".lineup-row").forEach((row) => {
    const intelligenceWrapper = row.querySelector(".song-intelligence-wrapper");
    const songId = row.querySelector(".song-id").value;
    const leaderId = document.getElementById("leaderSelect").value;
    const keyInput = row.querySelector(".song-key");

    if (!leaderId || !songId) {
      intelligenceWrapper.classList.add("hidden");
      intelligenceWrapper.innerHTML = "";
      return;
    }

    const history = getLeaderSongHistory(leaderId, songId);
    intelligenceWrapper.innerHTML = buildSongIntelligenceHTML(history);
    intelligenceWrapper.classList.remove("hidden");

    if (!keyInput.value.trim() && history.length > 0) {
      const frequency = getKeyFrequency(history);
      const suggestedKey = getMostUsedKey(frequency) || history[0].key || "";
      keyInput.value = suggestedKey;
    }
  });
}

function initCalendarPage() {
  const serviceForm = document.getElementById("serviceForm");
  const serviceError = document.getElementById("serviceError");
  const addSongRowBtn = document.getElementById("addSongRowBtn");
  const clearDraftBtn = document.getElementById("clearDraftBtn");
  const goToLeadersBtn = document.getElementById("goToLeadersBtn");
  const goToSongsBtn = document.getElementById("goToSongsBtn");
  const songRows = document.getElementById("songRows");
  const leaderSelect = document.getElementById("leaderSelect");
  const monthPicker = document.getElementById("monthPicker");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  const serviceDateInput = document.getElementById("serviceDate");
  const plannerTitle = document.getElementById("plannerTitle");

  const draft = getDraft();

  const urlParams = new URLSearchParams(window.location.search);
const requestedDate = urlParams.get("date");

  const initialDate = requestedDate
  ? new Date(`${requestedDate}T00:00:00`)
  : draft && draft.serviceDate
    ? new Date(`${draft.serviceDate}T00:00:00`)
    : new Date();

  monthPicker.value = toMonthInputValue(initialDate);

  leaderSelect.addEventListener("change", () => {
    refreshAllRowIntelligence();
    autoSaveDraftFromForm();
    renderCalendar();
  });

  serviceDateInput.addEventListener("change", () => {
    const dateValue = serviceDateInput.value;
    if (!dateValue) return;

    const current = new Date(`${dateValue}T00:00:00`);
    monthPicker.value = toMonthInputValue(current);
    renderCalendar();
    renderSelectedSundayCard(dateValue);
    autoSaveDraftFromForm();
  });

  prevMonthBtn.addEventListener("click", () => {
    const current = new Date(`${monthPicker.value}-01T00:00:00`);
    current.setMonth(current.getMonth() - 1);
    monthPicker.value = toMonthInputValue(current);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    const current = new Date(`${monthPicker.value}-01T00:00:00`);
    current.setMonth(current.getMonth() + 1);
    monthPicker.value = toMonthInputValue(current);
    renderCalendar();
  });

  monthPicker.addEventListener("change", () => {
    renderCalendar();
  });


  goToLeadersBtn.addEventListener("click", () => {
    autoSaveDraftFromForm();
    window.location.href = "leaders.html";
  });

  goToSongsBtn.addEventListener("click", () => {
    autoSaveDraftFromForm();
    window.location.href = "songs.html";
  });

  addSongRowBtn.addEventListener("click", () => {
    songRows.appendChild(createSongRow());
    autoSaveDraftFromForm();
    renderCalendar();
    refreshAllRowIntelligence();
  });

  clearDraftBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Clear the current draft?");
    if (!confirmed) return;

    clearDraft();
    serviceForm.reset();
    plannerTitle.textContent = "Create Service";
    serviceError.classList.add("hidden");
    songRows.innerHTML = "";
    songRows.appendChild(createSongRow());
    renderLeaderOptions(leaderSelect, "");
    renderSelectedSundayCard("");
    renderCalendar();
  });

  serviceForm.addEventListener("input", () => {
    autoSaveDraftFromForm();
  });

  serviceForm.addEventListener("change", () => {
    autoSaveDraftFromForm();
  });

  serviceForm.addEventListener("submit", saveServiceFromForm);

  (async () => {
    try {
      await loadAllData();

      renderLeaderOptions(leaderSelect, draft ? draft.leaderId : "");
if (requestedDate) {
  serviceDateInput.value = requestedDate;
}
      renderCalendar();

    if (draft) {
  restoreDraftToForm(draft);
  plannerTitle.textContent = draft.serviceId ? "Edit Service" : "Create Service";
  renderSelectedSundayCard(draft.serviceDate || "");
} else if (requestedDate) {
  resetFormForNewService(requestedDate);
  renderSelectedSundayCard(requestedDate);
} else {
  songRows.appendChild(createSongRow());
  renderSelectedSundayCard("");
}

      if (!songRows.children.length) {
        songRows.appendChild(createSongRow());
      }

      refreshAllRowIntelligence();
    } catch (error) {
      console.error("Failed to initialize calendar:", error);
      serviceError.textContent = "Could not load calendar data from Supabase.";serviceError.textContent = error.message || "Could not load calendar data from Supabase.";
      serviceError.classList.remove("hidden");
    }
  })();
}

document.addEventListener("DOMContentLoaded", initCalendarPage);