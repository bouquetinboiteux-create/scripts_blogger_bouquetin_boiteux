(function () {

  console.log("LEAFLET GPX v3");

  function init() {

    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      setTimeout(init, 200);
      return;
    }

    if (typeof L === "undefined") {
      console.error("Leaflet non chargé");
      return;
    }

    var gpxUrl = mapDiv.dataset.gpx;
    if (!gpxUrl) {
      console.error("data-gpx manquant");
      return;
    }

    // ---- Carte ----
    var map = L.map("map");

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap" }
    ).addTo(map);

    // ---- Icône rouge ----
    var redIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      shadowUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    var bounds; // mémorisation pour recentrage

    // ---- GPX ----
    fetch(gpxUrl)
      .then(function (r) { return r.text(); })
      .then(function (text) {

        var xml = new DOMParser().parseFromString(text, "application/xml");
        var pts = xml.getElementsByTagName("trkpt");
        var latlngs = [];

        for (var i = 0; i < pts.length; i++) {
          latlngs.push([
            parseFloat(pts[i].getAttribute("lat")),
            parseFloat(pts[i].getAttribute("lon"))
          ]);
        }

        var line = L.polyline(latlngs, {
          color: "red",
          weight: 4
        }).addTo(map);

        bounds = line.getBounds();
        map.fitBounds(bounds, { padding: [40, 40] });

        // départ
        L.marker(latlngs[0], { icon: redIcon })
          .addTo(map)
          .bindPopup("🚩 Départ");

        // arrivée
        L.marker(latlngs[latlngs.length - 1], { icon: redIcon })
          .addTo(map)
          .bindPopup("🏁 Arrivée");

      });

    // ---- Bouton RECENTRER ----
    var recenterBtn = document.getElementById("recenterBtn");
    if (recenterBtn) {
      recenterBtn.onclick = function () {
        if (bounds) {
          map.fitBounds(bounds, { padding: [40, 40] });
        }
      };
    }

    // ---- Bouton TÉLÉCHARGER GPX ----
    var downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
      downloadBtn.onclick = function () {

        fetch(gpxUrl)
          .then(function (response) {
            return response.blob();
          })
          .then(function (blob) {

            // nom original du fichier
            var filename = gpxUrl.split("/").pop();

            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          });
      };
    }

  }

  init();

})();
