async function loadSongs() {
  const response = await fetch("../data/song-catalog.json");
  const songs = await response.json();

  const songList = document.getElementById("songList");
  const searchInput = document.getElementById("searchInput");

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
        <p><strong>Tags:</strong> ${(song.tags || []).join(", ")}</p>
        <p><strong>YouTube:</strong> ${
          song.youtubeLink
            ? `<a href="${song.youtubeLink}" target="_blank">Open link</a>`
            : "None"
        }</p>
      `;

      songList.appendChild(card);
    });
  }

  renderSongs(songs);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();

    const filteredSongs = songs.filter((song) => {
      const titleMatch = song.title.toLowerCase().includes(query);
      const artistMatch = (song.originalArtist || "").toLowerCase().includes(query);
      const tagMatch = (song.tags || []).some((tag) =>
        tag.toLowerCase().includes(query)
      );
      const languageMatch = (song.language || "").toLowerCase().includes(query);

      return titleMatch || artistMatch || tagMatch || languageMatch;
    });

    renderSongs(filteredSongs);
  });
}

loadSongs();