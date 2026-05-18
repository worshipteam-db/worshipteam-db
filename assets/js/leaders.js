const LEADER_TABLE = "leaders";

function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === "function") return window.supabase;

  throw new Error(
    "Supabase client not found. Make sure your Supabase client script loads before leaders.js."
  );
}

function mapLeaderFromDb(row) {
  return {
    id: row.id,
    name: row.name || "",
    status: row.status || "active",
    notes: row.notes || ""
  };
}

function mapLeaderToDb(leader) {
  return {
    name: leader.name,
    status: leader.status,
    notes: leader.notes || ""
  };
}

async function fetchLeaders() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(LEADER_TABLE)
    .select("id, name, status, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapLeaderFromDb);
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

  let leaders = [];

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

      const statusLabel = leader.status === "active" ? "Active" : "Inactive";

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

  async function loadAndRenderLeaders() {
    try {
      leaders = await fetchLeaders();
      applySearch();
    } catch (error) {
      console.error("Failed to load leaders:", error);
      leaderList.innerHTML = "<p>Could not load leaders from Supabase.</p>";
    }
  }

  toggleLeaderFormBtn.addEventListener("click", () => {
    if (leaderFormSection.classList.contains("hidden")) {
      openForm();
    } else {
      closeForm();
    }
  });

  cancelLeaderFormBtn.addEventListener("click", closeForm);

  leaderForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = leaderNameInput.value.trim();
    const status = leaderStatusInput.value;
    const notes = leaderNotesInput.value.trim();

    const payload = mapLeaderToDb({
      name,
      status,
      notes
    });

    try {
      const supabase = getSupabaseClient();

      if (leaderIdInput.value) {
        const { error } = await supabase
          .from(LEADER_TABLE)
          .update(payload)
          .eq("id", leaderIdInput.value)
          .select();

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(LEADER_TABLE)
          .insert([payload])
          .select();

        if (error) throw error;
      }

      await loadAndRenderLeaders();
      closeForm();
    } catch (error) {
      console.error("Leader save failed:", error);
      alert(error.message || "Could not save the leader.");
    }
  });

  leaderSearchInput.addEventListener("input", applySearch);

  loadAndRenderLeaders();
}

document.addEventListener("DOMContentLoaded", initLeadersPage);