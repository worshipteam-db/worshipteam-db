console.log("WorshipTeam DB loaded");

async function loadJSON(path) {
  const response = await fetch(path);
  return await response.json();
}