(function () {

  console.log("LEAFLET GPX SCRIPT V2 OK");

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

        map.fitBounds(line.getBounds(), { padding: [40, 40] });

        // départ
        L.marker(latlngs[0], { icon: redIcon })
          .addTo(map)
          .bindPopup("🚩 Départ");

        // arrivée
        L.marker(latlngs[latlngs.length - 1], { icon: redIcon })
          .addTo(map)
          .bindPopup("🏁 Arrivée");

      });

  }

  init();

})();
