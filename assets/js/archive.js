async function loadArchive() {
  const response = await fetch("../data/weekly-services.json");
  const services = await response.json();

  const archiveList = document.getElementById("archiveList");
  const archiveSearchInput = document.getElementById("archiveSearchInput");

  function renderArchive(filteredServices) {
    archiveList.innerHTML = "";

    if (filteredServices.length === 0) {
      archiveList.innerHTML = "<p>No matching archive records found.</p>";
      return;
    }

    filteredServices.forEach((service) => {
      const card = document.createElement("div");
      card.className = "song-card";

      card.innerHTML = `
        <h3>${service.serviceDate}</h3>
        <p><strong>Leader:</strong> ${service.leaderId}</p>
        <p><strong>Status:</strong> ${service.status || "draft"}</p>
        <p><strong>Song Count:</strong> ${(service.songs || []).length}</p>
      `;

      archiveList.appendChild(card);
    });
  }

  renderArchive(services);

  archiveSearchInput.addEventListener("input", () => {
    const query = archiveSearchInput.value.toLowerCase();

    const filteredServices = services.filter((service) => {
      const dateMatch = (service.serviceDate || "").toLowerCase().includes(query);
      const leaderMatch = (service.leaderId || "").toLowerCase().includes(query);
      const statusMatch = (service.status || "").toLowerCase().includes(query);

      return dateMatch || leaderMatch || statusMatch;
    });

    renderArchive(filteredServices);
  });
}

loadArchive();