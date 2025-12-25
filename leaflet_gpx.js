(function () {

  console.log("SCRIPT LEAFLET GPX OK");

  function waitForMap() {
    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      setTimeout(waitForMap, 200);
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

    var map = L.map("map").setView([45, 6], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

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

        var line = L.polyline(latlngs, { color: "red" }).addTo(map);
        map.fitBounds(line.getBounds());

      });
  }

  waitForMap();

})();
