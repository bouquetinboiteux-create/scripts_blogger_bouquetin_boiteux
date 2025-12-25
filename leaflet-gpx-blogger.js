(function waitForMap() {

  var mapDiv = document.getElementById("map");
  if (!mapDiv) {
    setTimeout(waitForMap, 100);
    return;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet non chargé");
    return;
  }

  var gpxUrl = mapDiv.dataset.gpx;
  if (!gpxUrl) {
    console.error("Attribut data-gpx manquant sur #map");
    return;
  }

  // ======================
  // CARTE & FONDS
  // ======================

  var map = L.map("map");

  var osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenStreetMap contributors" }
  );

  var topo = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenTopoMap contributors" }
  );

  var satellite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "&copy; Esri" }
  );

  topo.addTo(map);

  L.control.layers({
    "OpenStreetMap": osm,
    "Topographique": topo,
    "Satellite": satellite
  }).addTo(map);

  // ======================
  // ICÔNE
  // ======================

  var redIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41]
  });

  // ======================
  // CHARGEMENT GPX
  // ======================

  fetch(gpxUrl)
    .then(r => r.text())
    .then(text => {

      var xml = new DOMParser().parseFromString(text, "application/xml");
      var trkpts = xml.getElementsByTagName("trkpt");

      if (!trkpts.length) {
        console.error("GPX vide ou invalide");
        return;
      }

      var latlngs = [];
      var elevations = [];

      for (var i = 0; i < trkpts.length; i++) {
        var lat = parseFloat(trkpts[i].getAttribute("lat"));
        var lon = parseFloat(trkpts[i].getAttribute("lon"));
        latlngs.push([lat, lon]);

        var ele = trkpts[i].getElementsByTagName("ele")[0];
        elevations.push(ele ? parseFloat(ele.textContent) : 0);
      }

      var polyline = L.polyline(latlngs, {
        color: "red",
        weight: 4,
        opacity: 0.9
      }).addTo(map);

      var bounds = polyline.getBounds();
      map.fitBounds(bounds, { padding: [40, 40] });

      // départ
      L.marker(latlngs[0], { icon: redIcon })
        .addTo(map)
        .bindPopup("🚩 Départ");

      // arrivée
      L.marker(latlngs[latlngs.length - 1], { icon: redIcon })
        .addTo(map)
        .bindPopup("🏁 Arrivée");

      // ======================
      // DISTANCE & D+
      // ======================

      var distance = 0;
      var denivele = 0;

      for (var i = 1; i < latlngs.length; i++) {
        distance += map.distance(latlngs[i - 1], latlngs[i]);
        var diff = elevations[i] - elevations[i - 1];
        if (diff > 0) denivele += diff;
      }

      var info = document.getElementById("info");
      if (info) {
        info.innerHTML =
          "Distance : " + (distance / 1000).toFixed(1) +
          " km — D+ : " + denivele.toFixed(0) + " m";
      }

      // ======================
      // BOUTON RECENTRER
      // ======================

      var recenterBtn = document.getElementById("recenterBtn");
      if (recenterBtn) {
        recenterBtn.onclick = function () {
          map.fitBounds(bounds, { padding: [40, 40] });
        };
      }

      // ======================
      // TÉLÉCHARGEMENT GPX
      // ======================

      var downloadBtn = document.getElementById("downloadBtn");
      if (downloadBtn) {
        downloadBtn.onclick = function () {
          fetch(gpxUrl)
            .then(r => r.blob())
            .then(blob => {
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

      // ======================
      // PROFIL ALTIMÉTRIQUE
      // ======================

      var svg = document.getElementById("profile");
      if (!svg) return;

      svg.innerHTML = "";
      svg.style.background = "#f8f8f8";
      svg.style.border = "1px solid #ccc";

      var distCum = [0];
      var distTot = 0;

      for (var i = 1; i < latlngs.length; i++) {
        distTot += map.distance(latlngs[i - 1], latlngs[i]);
        distCum.push(distTot);
      }

      var minEle = Math.min.apply(null, elevations);
      var maxEle = Math.max.apply(null, elevations);

      var width = 1000, height = 180, pad = 20;

      function x(d) {
        return pad + (d / distTot) * (width - 2 * pad);
      }

      function y(e) {
        return height - pad -
          ((e - minEle) / (maxEle - minEle)) *
          (height - 2 * pad);
      }

      var d = "";
      for (var i = 0; i < elevations.length; i++) {
        d += (i === 0 ? "M" : "L") +
             x(distCum[i]) + " " +
             y(elevations[i]) + " ";
      }

      var fillPath =
        d +
        "L " + x(distTot) + " " + (height - pad) +
        " L " + x(0) + " " + (height - pad) +
        " Z";

      var fill = document.createElementNS("http://www.w3.org/2000/svg", "path");
      fill.setAttribute("d", fillPath);
      fill.setAttribute("fill", "rgba(211,51,51,0.25)");
      svg.appendChild(fill);

      var line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", d);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#d33");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);

    });

})();
