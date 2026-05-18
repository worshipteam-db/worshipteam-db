const LEADER_TABLE = "leaders";
const SONG_TABLE = "songs";
const SERVICE_TABLE = "services";
const SERVICE_SONG_TABLE = "service_songs";

function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === "function") return window.supabase;

  throw new Error(
    "Supabase client not found. Make sure your Supabase client script loads before archive.js."
  );
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
    leaderId: row.leader_id
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
    rowOrder: row.row_order ?? 0
  };
}

async function fetchLeaders() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(LEADER_TABLE)
    .select("id, name, status, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapLeaderFromDb);
}

async function fetchSongs() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SONG_TABLE)
    .select("id, title, original_artist, language, tags, youtube_link, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapSongFromDb);
}

async function fetchServices() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SERVICE_TABLE)
    .select("id, service_date, leader_id, created_at")
    .order("service_date", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapServiceFromDb);
}

async function fetchServiceSongs() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SERVICE_SONG_TABLE)
    .select("id, service_id, song_id, category, song_key, notes, row_order, created_at")
    .order("row_order", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapServiceSongFromDb);
}

function getServiceSongsForService(serviceId, serviceSongs, songs) {
  return serviceSongs
    .filter((row) => row.serviceId === serviceId)
    .sort((a, b) => a.rowOrder - b.rowOrder)
    .map((row) => ({
      ...row,
      song: songs.find((song) => song.id === row.songId) || null
    }));
}

function renderArchive(services, leaders, songs, serviceSongs) {
  const archiveList = document.getElementById("archiveList");

  if (!services.length) {
    archiveList.innerHTML = "<p>No saved Sundays found yet.</p>";
    return;
  }

  archiveList.innerHTML = "";

  services.forEach((service) => {
    const leader = leaders.find((item) => item.id === service.leaderId);
    const lineup = getServiceSongsForService(service.id, serviceSongs, songs);

    const card = document.createElement("div");
    card.className = "song-card";

    card.innerHTML = `
      <h3>${formatDateDisplay(service.serviceDate)}</h3>
      <p><strong>Leader:</strong> ${leader?.name || service.leaderId || "N/A"}</p>
      <p><strong>Song Count:</strong> ${lineup.length}</p>

      <div class="song-block">
        ${
          lineup.length
            ? lineup
                .map(
                  (row) => `
                    <div class="mini-card">
                      <p><span class="detail-label detail-category">Category:</span> <span class="detail-value">${row.category || "N/A"}</span></p>
                      <p><span class="detail-label detail-song">Song:</span> <span class="detail-value">${row.song?.title || row.songId || "N/A"}</span></p>
                      <p><span class="detail-label detail-artist">Original Artist:</span> <span class="detail-value">${row.song?.originalArtist || "N/A"}</span></p>
                      <p><span class="detail-label detail-key">Key:</span> <span class="detail-value">${row.songKey || "N/A"}</span></p>
                      <p><span class="detail-label detail-notes">Notes:</span> <span class="detail-value">${row.notes || "None"}</span></p>
                    </div>
                  `
                )
                .join("")
            : "<p>No songs saved for this service.</p>"
        }
      </div>

      <div class="card-actions">
        <button type="button" class="action-btn open-service-btn" data-date="${service.serviceDate}">
          Open
        </button>
       <button type="button" class="secondary-btn delete-service-btn" data-id="${service.id}">
  <i data-lucide="trash-2"></i>
  <span>Delete</span>
</button>
        </button>
      </div>
    `;

    archiveList.appendChild(card);
  });

  document.querySelectorAll(".open-service-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const date = button.dataset.date;
      window.location.href = `calendar.html?date=${encodeURIComponent(date)}`;
    });
  });

  document.querySelectorAll(".delete-service-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const serviceId = button.dataset.id;
      const confirmed = window.confirm("Delete this saved Sunday?");
      if (!confirmed) return;

      try {
        const supabase = getSupabaseClient();

        const { error } = await supabase
          .from(SERVICE_TABLE)
          .delete()
          .eq("id", serviceId)
          .select("id");

        if (error) throw error;

        await loadArchivePage();
      } catch (error) {
        console.error("Archive delete failed:", error);
        alert(error.message || "Could not delete the service.");
      }
    });
  });
}

async function loadArchivePage() {
  try {
    const [leaders, songs, services, serviceSongs] = await Promise.all([
      fetchLeaders(),
      fetchSongs(),
      fetchServices(),
      fetchServiceSongs()
    ]);

    const search = document.getElementById("archiveSearchInput").value.trim().toLowerCase();

    const filteredServices = services.filter((service) => {
      const leader = leaders.find((item) => item.id === service.leaderId);
      const lineup = getServiceSongsForService(service.id, serviceSongs, songs);

      const serviceText = [
        service.serviceDate,
        formatDateDisplay(service.serviceDate),
        leader?.name || "",
        ...lineup.map((row) => row.song?.title || ""),
        ...lineup.map((row) => row.songKey || ""),
        ...lineup.map((row) => row.category || "")
      ]
        .join(" ")
        .toLowerCase();

      return serviceText.includes(search);
    });

    renderArchive(filteredServices, leaders, songs, serviceSongs);
    lucide.createIcons();
  } catch (error) {
    console.error("Failed to load archive:", error);
    document.getElementById("archiveList").innerHTML =
      "<p>Could not load archive data from Supabase.</p>";
  }
}

function initArchivePage() {
  const searchInput = document.getElementById("archiveSearchInput");

  searchInput.addEventListener("input", loadArchivePage);
  loadArchivePage();
}

document.addEventListener("DOMContentLoaded", initArchivePage);