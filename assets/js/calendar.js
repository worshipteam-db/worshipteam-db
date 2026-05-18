async function loadServices() {
  const response = await fetch("../data/weekly-services.json");
  const services = await response.json();

  const currentService = document.getElementById("currentService");
  const serviceArchive = document.getElementById("serviceArchive");

  if (!services || services.length === 0) {
    currentService.innerHTML = "<p>No service data found.</p>";
    serviceArchive.innerHTML = "<p>No archived services yet.</p>";
    return;
  }

  const sortedServices = [...services].sort((a, b) => {
    return new Date(b.serviceDate) - new Date(a.serviceDate);
  });

  const latestService = sortedServices[0];

  currentService.innerHTML = `
    <h2>Current Service</h2>
    <p><strong>Date:</strong> ${latestService.serviceDate}</p>
    <p><strong>Leader:</strong> ${latestService.leaderId}</p>
    <p><strong>Status:</strong> ${latestService.status || "draft"}</p>
    <div class="song-block">
      <h3>Songs</h3>
      ${
        latestService.songs && latestService.songs.length > 0
          ? latestService.songs
              .map(
                (song) => `
                <div class="mini-card">
                  <p><strong>Category:</strong> ${song.category}</p>
                  <p><strong>Song:</strong> ${song.customTitle || song.songId}</p>
                  <p><strong>Key:</strong> ${song.key}</p>
                  <p><strong>Notes:</strong> ${song.notes || "None"}</p>
                </div>
              `
              )
              .join("")
          : "<p>No songs added yet.</p>"
      }
    </div>
  `;

  serviceArchive.innerHTML = "";

  sortedServices.forEach((service) => {
    const card = document.createElement("div");
    card.className = "song-card";

    card.innerHTML = `
      <h3>${service.serviceDate}</h3>
      <p><strong>Leader:</strong> ${service.leaderId}</p>
      <p><strong>Status:</strong> ${service.status || "draft"}</p>
      <p><strong>Song Count:</strong> ${(service.songs || []).length}</p>
    `;

    serviceArchive.appendChild(card);
  });
}

loadServices();