console.log("SCRIPT CHARGÉ");

(function check() {
  var mapDiv = document.getElementById("map");

  if (!mapDiv) {
    console.log("map non trouvée, nouvelle tentative");
    setTimeout(check, 200);
    return;
  }

  console.log("map trouvée !");
  mapDiv.innerHTML = "✅ SCRIPT OK";

})();
