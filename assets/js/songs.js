const SONG_STORAGE_KEY = "worshipteam_songs";

const defaultSongs = [
  {
    id: "song-001",
    title: "You Are The Greatest",
    originalArtist: "Hillsong",
    tags: ["opening", "praise", "worship"],
    language: "English",
    youtubeLink: "",
    notes: ""
  },
  {
    id: "song-002",
    title: "You Are The Greatest",
    originalArtist: "Planetshakers",
    tags: ["worship", "ministry"],
    language: "English",
    youtubeLink: "https://www.youtube.com/watch?v=example",
    notes: ""
  }
];

function getSongs() {
  const storedSongs = localStorage.getItem(SONG_STORAGE_KEY);

  if (storedSongs) {
    return JSON.parse(storedSongs);
  }

  localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(defaultSongs));

  return defaultSongs;
}

function saveSongs(songs) {
  localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(songs));
}

function generateSongId() {
  return `song-${Date.now()}`;
}

function initSongsPage() {
  const songList = document.getElementById("songList");
  const searchInput = document.getElementById("searchInput");
  const toggleFormBtn = document.getElementById("toggleFormBtn");
  const songFormSection = document.getElementById("songFormSection");
  const songForm = document.getElementById("songForm");
  const cancelFormBtn = document.getElementById("cancelFormBtn");
  const formTitle = document.getElementById("formTitle");
  const tagError = document.getElementById("tagError");

  const songIdInput = document.getElementById("songId");
  const songTitleInput = document.getElementById("songTitle");
  const songArtistInput = document.getElementById("songArtist");
  const songLanguageInput = document.getElementById("songLanguage");
  const songYoutubeInput = document.getElementById("songYoutube");
  const songNotesInput = document.getElementById("songNotes");

  const languageButtons = Array.from(
    document.querySelectorAll("#languageOptions .choice-btn")
  );

  const tagButtons = Array.from(
    document.querySelectorAll("#tagOptions .tag-btn")
  );

  let songs = getSongs();

  function setLanguage(value) {
    songLanguageInput.value = value;

    languageButtons.forEach((button) => {
      button.classList.toggle(
        "selected",
        button.dataset.value === value
      );
    });
  }

  function getSelectedTags() {
    return tagButtons
      .filter((button) => button.classList.contains("selected"))
      .map((button) => button.dataset.value);
  }

  function setSelectedTags(tags = []) {
    tagButtons.forEach((button) => {
      button.classList.toggle(
        "selected",
        tags.includes(button.dataset.value)
      );
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

    tagError.classList.add("hidden");

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

    tagError.classList.add("hidden");

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

        <p>
          <strong>Original Artist:</strong>
          ${song.originalArtist || "N/A"}
        </p>

        <p>
          <strong>Language:</strong>
          ${song.language || "N/A"}
        </p>

        <p>
          <strong>Tags:</strong>
          ${(song.tags || []).join(", ") || "None"}
        </p>

        <p>
          <strong>YouTube:</strong>
          ${
            song.youtubeLink
              ? `<a href="${song.youtubeLink}" target="_blank" rel="noopener noreferrer">Open link</a>`
              : "None"
          }
        </p>

        <p>
          <strong>Notes:</strong>
          ${song.notes || "None"}
        </p>

        <button
          class="action-btn edit-btn"
          data-id="${song.id}"
          type="button"
        >
          Edit
        </button>
      `;

      songList.appendChild(card);
    });

    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const songId = button.getAttribute("data-id");

        const song = songs.find((item) => item.id === songId);

        if (song) {
          openForm(song);
        }
      });
    });
  }

  function applySearch() {
    const query = searchInput.value.toLowerCase();

    const filteredSongs = songs.filter((song) => {
      const titleMatch = song.title
        .toLowerCase()
        .includes(query);

      const artistMatch = (song.originalArtist || "")
        .toLowerCase()
        .includes(query);

      const tagMatch = (song.tags || []).some((tag) =>
        tag.toLowerCase().includes(query)
      );

      const languageMatch = (song.language || "")
        .toLowerCase()
        .includes(query);

      return (
        titleMatch ||
        artistMatch ||
        tagMatch ||
        languageMatch
      );
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
        tagError.classList.add("hidden");
      }
    });
  });

  toggleFormBtn.addEventListener("click", () => {
    if (songFormSection.classList.contains("hidden")) {
      openForm();
    } else {
      closeForm();
    }
  });

  cancelFormBtn.addEventListener("click", closeForm);

  songForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedLanguage = songLanguageInput.value.trim();

    const selectedTags = getSelectedTags();

    if (selectedTags.length === 0) {
      tagError.classList.remove("hidden");
      return;
    }

    tagError.classList.add("hidden");

    const newSong = {
      id: songIdInput.value || generateSongId(),
      title: songTitleInput.value.trim(),
      originalArtist: songArtistInput.value.trim(),
      language: selectedLanguage,
      tags: selectedTags,
      youtubeLink: songYoutubeInput.value.trim(),
      notes: songNotesInput.value.trim()
    };

    const existingIndex = songs.findIndex(
      (song) => song.id === newSong.id
    );

    if (existingIndex >= 0) {
      songs[existingIndex] = newSong;
    } else {
      songs.unshift(newSong);
    }

    saveSongs(songs);

    closeForm();

    applySearch();
  });

  searchInput.addEventListener("input", applySearch);

  renderSongs(songs);
}

initSongsPage();