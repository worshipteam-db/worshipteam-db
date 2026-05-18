async function loadLeaders() {
  const response = await fetch("../data/leaders.json");
  const leaders = await response.json();

  const leaderList = document.getElementById("leaderList");
  const leaderSearchInput = document.getElementById("leaderSearchInput");

  function renderLeaders(filteredLeaders) {
    leaderList.innerHTML = "";

    if (filteredLeaders.length === 0) {
      leaderList.innerHTML = "<p>No leaders found.</p>";
      return;
    }

    filteredLeaders.forEach((leader) => {
      const card = document.createElement("div");
      card.className = "song-card";

      card.innerHTML = `
        <h3>${leader.name}</h3>
        <p><strong>Status:</strong> ${leader.active ? "Active" : "Inactive"}</p>
        <p><strong>Notes:</strong> ${leader.notes || "None"}</p>
      `;

      leaderList.appendChild(card);
    });
  }

  renderLeaders(leaders);

  leaderSearchInput.addEventListener("input", () => {
    const query = leaderSearchInput.value.toLowerCase();

    const filteredLeaders = leaders.filter((leader) => {
      const nameMatch = leader.name.toLowerCase().includes(query);
      const notesMatch = (leader.notes || "").toLowerCase().includes(query);

      return nameMatch || notesMatch;
    });

    renderLeaders(filteredLeaders);
  });
}

loadLeaders();