const LEADER_STORAGE_KEY = "worshipteam_leaders";
const SONG_STORAGE_KEY = "worshipteam_songs";
const SERVICE_STORAGE_KEY = "worshipteam_services";
const DRAFT_STORAGE_KEY = "worshipteam_service_draft";

function getLeaders() {
  const storedLeaders = localStorage.getItem(LEADER_STORAGE_KEY);
  return storedLeaders ? JSON.parse(storedLeaders) : [];
}

function getSongs() {
  const storedSongs = localStorage.getItem(SONG_STORAGE_KEY);
  return storedSongs ? JSON.parse(storedSongs) : [];
}

function getServices() {
  const storedServices = localStorage.getItem(SERVICE_STORAGE_KEY);
  return storedServices ? JSON.parse(storedServices) : [];
}

function saveServices(services) {
  localStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(services));
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

function generateServiceId() {
  return `service-${Date.now()}`;
}

function generateRowId() {
  return `row-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getSongById(songId) {
  return getSongs().find((song) => song.id === songId) || null;
}

function getLeaderSongHistory(leaderId, songId) {
  const services = getServices();

  const history = [];

  services.forEach((service) => {
    if (service.leaderId !== leaderId) return;

    (service.songs || []).forEach((song) => {
      if (song.songId !== songId) return;

      history.push({
        serviceDate: service.serviceDate,
        key: song.key,
        category: song.category,
        notes: song.notes || ""
      });
    });
  });

  history.sort((a, b) => {
    return new Date(b.serviceDate) - new Date(a.serviceDate);
  });

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

function renderLeaderOptions(selectEl, selectedLeaderId = "") {
  const leaders = getLeaders();

  selectEl.innerHTML = '<option value="">Select leader</option>';

  if (!leaders.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No leaders available";
    selectEl.appendChild(option);
    return;
  }

  leaders.forEach((leader) => {
    const option = document.createElement("option");
    option.value = leader.id;
    option.textContent = `${leader.name}${leader.status === "inactive" ? " (inactive)" : ""}`;
    if (leader.id === selectedLeaderId) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

function renderSelectedSundayCard(dateString) {
  const selectedSundayCard = document.getElementById("selectedSundayCard");
  const services = getServices();
  const service = services.find((item) => item.serviceDate === dateString);

  if (!dateString) {
    selectedSundayCard.innerHTML = `
      <p>Click a Sunday on the calendar to create or edit a service.</p>
    `;
    return;
  }

  if (!service) {
    selectedSundayCard.innerHTML = `
      <h3>${formatDateDisplay(dateString)}</h3>
      <p><strong>Status:</strong> Open Sunday</p>
      <p>No service has been saved for this Sunday yet.</p>
    `;
    return;
  }

  selectedSundayCard.innerHTML = `
    <h3>${formatDateDisplay(service.serviceDate)}</h3>
    <p><strong>Leader:</strong> ${service.leaderName || service.leaderId || "N/A"}</p>
    <div class="song-block">
      ${
        service.songs && service.songs.length
          ? service.songs
              .map(
                (song) => `
                  <div class="mini-card">
                    <p><strong>Category:</strong> ${song.category || "N/A"}</p>
                    <p><strong>Song:</strong> ${song.songTitle || "N/A"}</p>
                    <p><strong>Original Artist:</strong> ${song.originalArtist || "N/A"}</p>
                    <p><strong>Key:</strong> ${song.key || "N/A"}</p>
                    <p><strong>Notes:</strong> ${song.notes || "None"}</p>
                  </div>
                `
              )
              .join("")
          : "<p>No songs added yet.</p>"
      }
    </div>

    <div class="selected-service-actions">
      <button type="button" class="secondary-btn delete-sunday-btn" data-date="${service.serviceDate}">
        Delete Sunday
      </button>
    </div>
  `;

  const deleteBtn = selectedSundayCard.querySelector(".delete-sunday-btn");

  deleteBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      `Delete the saved service for ${formatDateDisplay(service.serviceDate)}?`
    );

    if (!confirmed) return;

    const updatedServices = getServices().filter(
      (item) => item.serviceDate !== service.serviceDate
    );

    saveServices(updatedServices);

    const serviceDateInput = document.getElementById("serviceDate");
    const serviceIdInput = document.getElementById("serviceId");
    const songRows = document.getElementById("songRows");
    const plannerTitle = document.getElementById("plannerTitle");

    clearDraft();

    serviceIdInput.value = "";
    plannerTitle.textContent = "Create Service";
    serviceDateInput.value = service.serviceDate;
    songRows.innerHTML = "";
    songRows.appendChild(createSongRow());
    renderLeaderOptions(document.getElementById("leaderSelect"), "");
    renderSelectedSundayCard(service.serviceDate);
    renderCalendar();
    autoSaveDraftFromForm();
  });
}

function createSongRow(rowData = {}) {
  const row = document.createElement("div");
  row.className = "lineup-row";
  row.dataset.rowId = rowData.rowId || generateRowId();

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

  function setSelectedSong(songId) {
    songIdInput.value = songId || "";

    const song = songId ? getSongById(songId) : null;

    if (!song) {
      selectedSongDisplay.classList.add("hidden");
      selectedSongDisplay.innerHTML = "";
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
    const leaderId = document.getElementById("leaderSelect").value;

if (leaderId && songId) {
  const history = getLeaderSongHistory(leaderId, songId);

  intelligenceWrapper.innerHTML = buildSongIntelligenceHTML(history);

  intelligenceWrapper.classList.remove("hidden");

  if (!keyInput.value && history.length > 0) {
    const frequency = getKeyFrequency(history);

    const suggestedKey =
      getMostUsedKey(frequency) || history[0].key;

    keyInput.value = suggestedKey;
  }
} else {
  intelligenceWrapper.classList.add("hidden");
  intelligenceWrapper.innerHTML = "";
}
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
  }

  function renderSongResults() {
    const category = categorySelect.value;
    const query = songSearchInput.value;
    const songs = getSongs();

    songResults.innerHTML = "";

    const filteredSongs = songs.filter((song) => {
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

function autoSaveDraftFromForm() {
  const draft = collectDraftFromForm();
  saveDraft(draft);
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

function renderCurrentServiceCard() {
  const currentServiceCard = document.getElementById("currentServiceCard");
  const services = getServices();

  if (!services.length) {
    currentServiceCard.innerHTML = "<p>No service records yet.</p>";
    return;
  }

  const latestService = [...services].sort((a, b) => {
    return new Date(b.serviceDate) - new Date(a.serviceDate);
  })[0];

  const leaderName = latestService.leaderName || latestService.leaderId || "N/A";

  currentServiceCard.innerHTML = `
    <h3>${formatDateDisplay(latestService.serviceDate)}</h3>
    <p><strong>Leader:</strong> ${leaderName}</p>
    <div class="song-block">
      ${
        latestService.songs && latestService.songs.length
          ? latestService.songs
              .map(
                (song) => `
                  <div class="mini-card">
                    <p><strong>Category:</strong> ${song.category || "N/A"}</p>
                    <p><strong>Song:</strong> ${song.songTitle || "N/A"}</p>
                    <p><strong>Original Artist:</strong> ${song.originalArtist || "N/A"}</p>
                    <p><strong>Key:</strong> ${song.key || "N/A"}</p>
                    <p><strong>Notes:</strong> ${song.notes || "None"}</p>
                  </div>
                `
              )
              .join("")
          : "<p>No songs added yet.</p>"
      }
    </div>
  `;
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

  const servicesByDate = new Map(
    getServices().map((service) => [service.serviceDate, service])
  );

  const selectedDate = document.getElementById("serviceDate").value;

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    cell.dataset.date = dateString;
    cell.disabled = !isSunday;

    if (isSunday) cell.classList.add("is-sunday");
if (isSaturday) cell.classList.add("is-saturday");
if (!isSunday && !isSaturday) {
  cell.classList.add("weekday-cell-type");
}
    if (service) cell.classList.add("has-service");
    if (isSelected) cell.classList.add("is-selected");

    cell.innerHTML = `
      <span class="day-number">${day}</span>
      ${
  isSunday
    ? `
      <span class="day-badge">${service ? "Saved" : "Sunday"}</span>
      <span class="day-summary">
        ${
          service
            ? `${service.leaderName || "Leader"} • ${(service.songs || []).length} songs`
            : "Open service"
        }
      </span>
    `
    : isSaturday
      ? `
        <span class="day-badge">Rehearsal</span>
        <span class="day-summary">
          Rehearsal for ${formatDateDisplay(
            toDateInputValue(
              new Date(year, month, day + 1)
            )
          )} Service
        </span>
      `
      : `<span class="day-summary muted">Weekday</span>`
}
    `;

    if (isSunday) {
      cell.addEventListener("click", () => {
        autoSaveDraftFromForm();
        loadServiceIntoForm(dateString);
        renderCalendar();
        renderSelectedSundayCard(dateString);
        window.scrollTo({
          top: document.getElementById("selectedSundayCard").offsetTop - 20,
          behavior: "smooth"
        });
      });
    }

    calendarGrid.appendChild(cell);
  }
}

function loadServiceIntoForm(serviceOrDate) {
  const songRows = document.getElementById("songRows");
  const plannerTitle = document.getElementById("plannerTitle");
  const serviceIdInput = document.getElementById("serviceId");
  const serviceDateInput = document.getElementById("serviceDate");
  const leaderSelect = document.getElementById("leaderSelect");

  const service =
    typeof serviceOrDate === "string"
      ? getServices().find((item) => item.serviceDate === serviceOrDate)
      : serviceOrDate;

  if (!service) {
    plannerTitle.textContent = "Create Service";
    serviceIdInput.value = "";
    serviceDateInput.value = typeof serviceOrDate === "string" ? serviceOrDate : "";
    leaderSelect.value = "";
    songRows.innerHTML = "";
    songRows.appendChild(createSongRow());
    saveDraft(collectDraftFromForm());
    renderSelectedSundayCard(serviceDateInput.value);
    return;
  }

  plannerTitle.textContent = "Edit Service";
  serviceIdInput.value = service.id;
  serviceDateInput.value = service.serviceDate;

  renderLeaderOptions(leaderSelect, service.leaderId);

  songRows.innerHTML = "";

  (service.songs || []).forEach((song) => {
    songRows.appendChild(
      createSongRow({
        rowId: song.rowId,
        category: song.category,
        songId: song.songId,
        key: song.key,
        notes: song.notes
      })
    );
  });

  if (!songRows.children.length) {
    songRows.appendChild(createSongRow());
  }

  saveDraft(collectDraftFromForm());
  renderSelectedSundayCard(service.serviceDate);
}

function initCalendarPage() {
  const serviceForm = document.getElementById("serviceForm");
  const plannerTitle = document.getElementById("plannerTitle");
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

  const draft = getDraft();
  const initialDate = draft && draft.serviceDate ? new Date(`${draft.serviceDate}T00:00:00`) : new Date();

  monthPicker.value = toMonthInputValue(initialDate);

  renderLeaderOptions(leaderSelect, draft ? draft.leaderId : "");
  renderSelectedSundayCard(draft ? draft.serviceDate : "");
  renderCalendar();

  if (draft) {
    restoreDraftToForm(draft);
    plannerTitle.textContent = draft.serviceId ? "Edit Service" : "Create Service";
  } else {
    songRows.appendChild(createSongRow());
  }

  if (!songRows.children.length) {
    songRows.appendChild(createSongRow());
  }

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

  serviceDateInput.addEventListener("change", () => {
    const dateValue = serviceDateInput.value;
    if (dateValue) {
      const current = new Date(`${dateValue}T00:00:00`);
      monthPicker.value = toMonthInputValue(current);
      renderCalendar();
      renderSelectedSundayCard(dateValue);
      saveDraft(collectDraftFromForm());
    }
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
  });

  clearDraftBtn.addEventListener("click", () => {
    const confirmed = window.confirm("Clear the current draft?");
    if (!confirmed) return;

    clearDraft();
    serviceForm.reset();
    document.getElementById("serviceId").value = "";
    plannerTitle.textContent = "Create Service";
    serviceError.classList.add("hidden");
    songRows.innerHTML = "";
    renderLeaderOptions(leaderSelect, "");
    songRows.appendChild(createSongRow());
    renderSelectedSundayCard("");
    renderCalendar();
  });

  serviceForm.addEventListener("input", () => {
    autoSaveDraftFromForm();
    renderCalendar();
  });

  serviceForm.addEventListener("change", () => {
    autoSaveDraftFromForm();
    renderCalendar();
  });

  serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();

    serviceError.classList.add("hidden");

    const serviceId = document.getElementById("serviceId").value.trim() || generateServiceId();
    const serviceDate = document.getElementById("serviceDate").value;
    const leaderId = leaderSelect.value;
    const leaders = getLeaders();
    const songs = getSongs();
    const services = getServices();

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

    const existingServiceByDate = services.find((service) => service.serviceDate === serviceDate);
    if (existingServiceByDate && existingServiceByDate.id !== serviceId) {
      serviceError.textContent = `An existing record already exists for ${formatDateDisplay(serviceDate)}. Please edit/remove the completed form instead.`;
      serviceError.classList.remove("hidden");
      return;
    }

    if (!leaderId) {
      serviceError.textContent = "Please select a leader.";
      serviceError.classList.remove("hidden");
      return;
    }

    const leader = leaders.find((item) => item.id === leaderId);
    if (!leader) {
      serviceError.textContent = "Selected leader was not found. Please add them first.";
      serviceError.classList.remove("hidden");
      return;
    }

    const rows = Array.from(document.querySelectorAll(".lineup-row"));

    if (!rows.length) {
      serviceError.textContent = "Please add at least one song row.";
      serviceError.classList.remove("hidden");
      return;
    }

    const lineup = [];

    for (const row of rows) {
      const category = row.querySelector(".song-category").value;
      const songId = row.querySelector(".song-id").value;
      const key = row.querySelector(".song-key").value.trim();
      const notes = row.querySelector(".song-notes").value.trim();

      if (!category || !songId || !key) {
        serviceError.textContent = "Every song row must have a category, song, and key.";
        serviceError.classList.remove("hidden");
        return;
      }

      const song = songs.find((item) => item.id === songId);
      if (!song) {
        serviceError.textContent = "One of the selected songs was not found. Please add it first.";
        serviceError.classList.remove("hidden");
        return;
      }

      lineup.push({
        rowId: row.dataset.rowId,
        category,
        songId: song.id,
        songTitle: song.title,
        originalArtist: song.originalArtist || "",
        key,
        notes
      });
    }

    const existingIndex = services.findIndex((service) => service.id === serviceId);

    const serviceRecord = {
      id: serviceId,
      serviceDate,
      leaderId: leader.id,
      leaderName: leader.name,
      songs: lineup
    };

    if (existingIndex >= 0) {
      services[existingIndex] = serviceRecord;
    } else {
      services.unshift(serviceRecord);
    }

    saveServices(services);
    clearDraft();
    serviceForm.reset();
    document.getElementById("serviceId").value = "";
    plannerTitle.textContent = "Create Service";
    songRows.innerHTML = "";
    songRows.appendChild(createSongRow());
    renderLeaderOptions(leaderSelect, "");
    renderSelectedSundayCard(serviceDate);
    renderCalendar();
  });
}

initCalendarPage();