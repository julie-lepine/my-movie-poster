const HOME_MINI_GRID_IMAGES = [
  "./assets/img/12 hommes en colère.jpg",
  "./assets/img/3 Billboards, Les panneaux de la vengeance.jpg",
  "./assets/img/American Beauty.jpg",
  "./assets/img/Annie Hall.jpg",
  "./assets/img/Arrête-moi si tu peux.jpg",
  "./assets/img/Astérix et Obélix _ Mission Cléopâtre.jpg",
  "./assets/img/Bienvenue à Gattaca.jpg",
  "./assets/img/Big Fish.jpg",
  "./assets/img/Billy Elliot.jpg",
  "./assets/img/Casino Royale.jpg",
  "./assets/img/Chantons sous la Pluie.jpg",
  "./assets/img/Cloud Atlas.jpg",
  "./assets/img/Coup de Foudre à Notting Hill.jpg",
  "./assets/img/Diamants sur Canapé.jpg",
  "./assets/img/Drive.jpg",
  "./assets/img/eternal sunshine of the spotless mind.jpg",
  "./assets/img/Fight Club.jpg",
  "./assets/img/Forrest Gump.jpg",
  "./assets/img/Full Metal Jacket.jpg",
  "./assets/img/Gone Girl.jpg",
  "./assets/img/Gran Torino.jpg",
  "./assets/img/Happiness Therapy.jpg",
  "./assets/img/Il était temps.jpg",
  "./assets/img/Il faut sauver le soldat Ryan.jpg",
  "./assets/img/Imitation Game.jpg",
  "./assets/img/Incendies.jpg",
  "./assets/img/Interstellar.jpg",
  "./assets/img/Inception.jpg",
  "./assets/img/Joyeux Noël.jpg",
  "./assets/img/Jumanji (1995).jpg",
  "./assets/img/La La Land.jpg",
  "./assets/img/La ligne verte.jpg",
  "./assets/img/La Liste de Schindler.jpg",
  "./assets/img/La Rose Pourpre du Caire.jpg",
  "./assets/img/Le Cercle des poètes disparus.jpg",
  "./assets/img/Le Dîner de cons.jpg",
  "./assets/img/Le Fabuleux Destin d_Amélie Poulain.jpg",
  "./assets/img/Le Prestige.jpg",
  "./assets/img/Léon.jpg",
  "./assets/img/Les Évadés.jpg",
  "./assets/img/Lost in Translation.jpg",
  "./assets/img/Match Point.jpg",
  "./assets/img/Matrix.jpg",
  "./assets/img/Memento.jpg",
  "./assets/img/Minority Report.jpg",
  "./assets/img/Mommy.jpg",
  "./assets/img/Mr. Nobody.jpg",
  "./assets/img/Pulp Fiction.jpg",
  "./assets/img/The Grand Budapest Hotel.jpg",
  "./assets/img/Will Hunting.jpg",
];

function populateHomeMiniGrid() {
  const grid = document.querySelector(".home-mini-grid");
  if (!grid) return;

  grid.innerHTML = "";
  HOME_MINI_GRID_IMAGES.forEach((imagePath) => {
    const tile = document.createElement("span");
    tile.style.backgroundImage = `url("${imagePath}")`;
    grid.appendChild(tile);
  });
}

populateHomeMiniGrid();
