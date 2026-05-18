const SONG_TABLE = "songs";

function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === "function") return window.supabase;

  throw new Error(
    "Supabase client not found. Make sure your Supabase client script loads before songs.js."
  );
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

function mapSongToDb(song) {
  return {
    title: song.title,
    original_artist: song.originalArtist,
    language: song.language,
    tags: song.tags,
    youtube_link: song.youtubeLink || "",
    notes: song.notes || ""
  };
}

async function fetchSongs() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from(SONG_TABLE)
    .select("id, title, original_artist, language, tags, youtube_link, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSongFromDb);
}

function initSongsPage() {
  const songList = document.getElementById("songList");
  const searchInput = document.getElementById("searchInput");
  const toggleFormBtn = document.getElementById("toggleFormBtn");
  const songFormSection = document.getElementById("songFormSection");
  const songForm = document.getElementById("songForm");
  const cancelFormBtn = document.getElementById("cancelFormBtn");
  const formTitle = document.getElementById("formTitle");

  const songIdInput = document.getElementById("songId");
  const songTitleInput = document.getElementById("songTitle");
  const songArtistInput = document.getElementById("songArtist");
  const songLanguageInput = document.getElementById("songLanguage");
  const songYoutubeInput = document.getElementById("songYoutube");
  const songNotesInput = document.getElementById("songNotes");

  const tagCheckboxes = Array.from(document.querySelectorAll(".tag-checkbox"));
  const languageButtons = Array.from(
    document.querySelectorAll("#languageOptions .choice-btn")
  );
  const tagButtons = Array.from(document.querySelectorAll("#tagOptions .tag-btn"));

  let songs = [];

  function getSelectedTags() {
    return tagButtons
      .filter((button) => button.classList.contains("selected"))
      .map((button) => button.dataset.value);
  }

  function setSelectedTags(tags = []) {
    tagButtons.forEach((button) => {
      button.classList.toggle("selected", tags.includes(button.dataset.value));
    });

    tagCheckboxes.forEach((checkbox) => {
      checkbox.checked = tags.includes(checkbox.value);
    });
  }

  function setLanguage(value) {
    songLanguageInput.value = value;

    languageButtons.forEach((button) => {
      button.classList.toggle("selected", button.dataset.value === value);
    });
  }

  function openForm(song = null) {
    songFormSection.classList.remove("hidden");
    formTitle.textContent = song ? "Edit Song" : "Add Song";

    songIdInput.value = song ? song.id : "";
    songTitleInput.value = song ? song.title : "";
    songArtistInput.value = song ? song.originalArtist : "";
    songYoutubeInput.value = song ? song.youtubeLink || "" : "";
    songNotesInput.value = song ? song.notes || "" : "";

    setLanguage(song ? song.language : "");
    setSelectedTags(song ? song.tags || [] : []);

    window.scrollTo({
      top: songFormSection.offsetTop - 20,
      behavior: "smooth"
    });
  }

  function closeForm() {
    songFormSection.classList.add("hidden");
    songForm.reset();
    songIdInput.value = "";
    setLanguage("");
    setSelectedTags([]);
    formTitle.textContent = "Add Song";
  }

  function renderSongs(filteredSongs) {
    songList.innerHTML = "";

    if (filteredSongs.length === 0) {
      songList.innerHTML = "<p>No songs found.</p>";
      return;
    }

    filteredSongs.forEach((song) => {
      const card = document.createElement("div");
      card.className = "song-card";

      card.innerHTML = `
        <h3>${song.title}</h3>
        <p><strong>Original Artist:</strong> ${song.originalArtist || "N/A"}</p>
        <p><strong>Language:</strong> ${song.language || "N/A"}</p>
        <p><strong>Tags:</strong> ${(song.tags || []).join(", ") || "None"}</p>
        <p><strong>YouTube:</strong> ${
          song.youtubeLink
            ? `<a href="${song.youtubeLink}" target="_blank" rel="noopener noreferrer">Open link</a>`
            : "None"
        }</p>
        <p><strong>Notes:</strong> ${song.notes || "None"}</p>
        <div class="card-actions">
          <button class="action-btn edit-btn" data-id="${song.id}" type="button">Edit</button>
          
        </div>
      `;

      songList.appendChild(card);
    });

    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const songId = button.getAttribute("data-id");
        const song = songs.find((item) => item.id === songId);
        if (song) openForm(song);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const songId = button.getAttribute("data-id");
        const song = songs.find((item) => item.id === songId);
        if (!song) return;

        const confirmed = window.confirm(
          `Delete "${song.title}" by ${song.originalArtist || "Unknown Artist"}?`
        );
        if (!confirmed) return;

        try {
          const supabase = getSupabaseClient();

          const { error } = await supabase
            .from(SONG_TABLE)
            .delete()
            .eq("id", songId)
            .select("id");

          if (error) throw error;

          await loadAndRenderSongs();
               } catch (error) {
          console.error("Song delete failed:", error);

          const friendlyMessage =
            error?.message?.includes("service_songs_song_id_fkey") ||
            error?.message?.includes("violates foreign key constraint")
              ? "This song is still being used in one or more saved Sundays. Please edit or delete those service records first."
              : error.message || "Could not delete the song.";

          alert(friendlyMessage);
        }
      });
    });
  }

  function applySearch() {
    const query = searchInput.value.toLowerCase();

    const filteredSongs = songs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(query);
      const artistMatch = (song.originalArtist || "").toLowerCase().includes(query);
      const tagMatch = (song.tags || []).some((tag) => tag.toLowerCase().includes(query));
      const languageMatch = (song.language || "").toLowerCase().includes(query);

      return titleMatch || artistMatch || tagMatch || languageMatch;
    });

    renderSongs(filteredSongs);
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isSelected = button.classList.contains("selected");
      const value = button.dataset.value;

      if (isSelected) {
        setLanguage("");
      } else {
        setLanguage(value);
      }
    });
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("selected");
      const selectedTags = getSelectedTags();
      if (selectedTags.length > 0) {
        const tagError = document.getElementById("tagError");
        if (tagError) tagError.classList.add("hidden");
      }
    });
  });

  songForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = songTitleInput.value.trim();
    const originalArtist = songArtistInput.value.trim();
    const language = songLanguageInput.value.trim();
    const tags = getSelectedTags();
    const youtubeLink = songYoutubeInput.value.trim();
    const notes = songNotesInput.value.trim();

    const tagError = document.getElementById("tagError");
    if (!tags.length) {
      if (tagError) tagError.classList.remove("hidden");
      return;
    }

    const payload = mapSongToDb({
      title,
      originalArtist,
      language,
      tags,
      youtubeLink,
      notes
    });

    try {
      const supabase = getSupabaseClient();

      if (songIdInput.value) {
        const { error } = await supabase
          .from(SONG_TABLE)
          .update(payload)
          .eq("id", songIdInput.value)
          .select();

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(SONG_TABLE)
          .insert([payload])
          .select();

        if (error) throw error;
      }

      await loadAndRenderSongs();
      closeForm();
    } catch (error) {
      console.error("Song save failed:", error);
      alert(error.message || "Could not save the song.");
    }
  });

  toggleFormBtn.addEventListener("click", () => {
    if (songFormSection.classList.contains("hidden")) {
      openForm();
    } else {
      closeForm();
    }
  });

  cancelFormBtn.addEventListener("click", closeForm);
  searchInput.addEventListener("input", applySearch);

  async function loadAndRenderSongs() {
    try {
      songs = await fetchSongs();
      applySearch();
    } catch (error) {
      console.error("Failed to load songs:", error);
      songList.innerHTML = "<p>Could not load songs from Supabase.</p>";
    }
  }

  loadAndRenderSongs();
}

document.addEventListener("DOMContentLoaded", initSongsPage);