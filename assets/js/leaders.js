const LEADER_STORAGE_KEY = "worshipteam_leaders";

const defaultLeaders = [
  {
    id: "leader-001",
    name: "Leader A",
    status: "active",
    notes: ""
  },
  {
    id: "leader-002",
    name: "Leader B",
    status: "active",
    notes: ""
  },
  {
    id: "leader-003",
    name: "Leader C",
    status: "inactive",
    notes: "Inactive for now"
  }
];

function getLeaders() {
  const storedLeaders = localStorage.getItem(LEADER_STORAGE_KEY);

  if (storedLeaders) {
    return JSON.parse(storedLeaders);
  }

  localStorage.setItem(LEADER_STORAGE_KEY, JSON.stringify(defaultLeaders));
  return defaultLeaders;
}

function saveLeaders(leaders) {
  localStorage.setItem(LEADER_STORAGE_KEY, JSON.stringify(leaders));
}

function generateLeaderId() {
  return `leader-${Date.now()}`;
}

function initLeadersPage() {
  const leaderList = document.getElementById("leaderList");
  const leaderSearchInput = document.getElementById("leaderSearchInput");
  const toggleLeaderFormBtn = document.getElementById("toggleLeaderFormBtn");
  const leaderFormSection = document.getElementById("leaderFormSection");
  const leaderForm = document.getElementById("leaderForm");
  const cancelLeaderFormBtn = document.getElementById("cancelLeaderFormBtn");
  const leaderFormTitle = document.getElementById("leaderFormTitle");

  const leaderIdInput = document.getElementById("leaderId");
  const leaderNameInput = document.getElementById("leaderName");
  const leaderStatusInput = document.getElementById("leaderStatus");
  const leaderNotesInput = document.getElementById("leaderNotes");

  let leaders = getLeaders();

  function openForm(leader = null) {
    leaderFormSection.classList.remove("hidden");
    leaderFormTitle.textContent = leader ? "Edit Leader" : "Add Leader";

    leaderIdInput.value = leader ? leader.id : "";
    leaderNameInput.value = leader ? leader.name : "";
    leaderStatusInput.value = leader ? leader.status : "";
    leaderNotesInput.value = leader ? leader.notes || "" : "";

    window.scrollTo({
      top: leaderFormSection.offsetTop - 20,
      behavior: "smooth"
    });
  }

  function closeForm() {
    leaderFormSection.classList.add("hidden");
    leaderForm.reset();
    leaderIdInput.value = "";
    leaderFormTitle.textContent = "Add Leader";
  }

  function renderLeaders(filteredLeaders) {
    leaderList.innerHTML = "";

    if (filteredLeaders.length === 0) {
      leaderList.innerHTML = "<p>No leaders found.</p>";
      return;
    }

    filteredLeaders.forEach((leader) => {
      const card = document.createElement("div");
      card.className = "song-card";

      const statusLabel =
        leader.status === "active" ? "Active" : "Inactive";

      card.innerHTML = `
        <h3>${leader.name}</h3>
        <p><strong>Status:</strong> ${statusLabel}</p>
        <p><strong>Notes:</strong> ${leader.notes || "None"}</p>
        <button class="action-btn edit-leader-btn" data-id="${leader.id}" type="button">Edit</button>
      `;

      leaderList.appendChild(card);
    });

    document.querySelectorAll(".edit-leader-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const leaderId = button.getAttribute("data-id");
        const leader = leaders.find((item) => item.id === leaderId);
        if (leader) openForm(leader);
      });
    });
  }

  function applySearch() {
    const query = leaderSearchInput.value.toLowerCase();

    const filteredLeaders = leaders.filter((leader) => {
      const nameMatch = leader.name.toLowerCase().includes(query);
      const statusMatch = (leader.status || "").toLowerCase().includes(query);
      const notesMatch = (leader.notes || "").toLowerCase().includes(query);

      return nameMatch || statusMatch || notesMatch;
    });

    renderLeaders(filteredLeaders);
  }

  toggleLeaderFormBtn.addEventListener("click", () => {
    if (leaderFormSection.classList.contains("hidden")) {
      openForm();
    } else {
      closeForm();
    }
  });

  cancelLeaderFormBtn.addEventListener("click", closeForm);

  leaderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newLeader = {
      id: leaderIdInput.value || generateLeaderId(),
      name: leaderNameInput.value.trim(),
      status: leaderStatusInput.value,
      notes: leaderNotesInput.value.trim()
    };

    const existingIndex = leaders.findIndex((leader) => leader.id === newLeader.id);

    if (existingIndex >= 0) {
      leaders[existingIndex] = newLeader;
    } else {
      leaders.unshift(newLeader);
    }

    saveLeaders(leaders);
    closeForm();
    applySearch();
  });

  leaderSearchInput.addEventListener("input", applySearch);

  renderLeaders(leaders);
}

initLeadersPage();