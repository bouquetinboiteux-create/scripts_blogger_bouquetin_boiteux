document.addEventListener("DOMContentLoaded", function () {

  var mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  var gpxUrl = mapDiv.dataset.gpx;
  if (!gpxUrl) {
    console.error("Aucun GPX défini (data-gpx)");
    return;
  }

  // ----- TAILLE CARTE -----
  mapDiv.style.height = mapDiv.dataset.height || "420px";

  // ----- CARTE -----
  var map = L.map("map");

  var osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenStreetMap" }
  ).addTo(map);

  var topo = L.tileLayer(
    "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenTopoMap" }
  );

  var sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/" +
    "World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "&copy; Esri" }
  );

  L.control.layers(
    {
      "Plan": osm,
      "Topo": topo,
      "Satellite": sat
    },
    null,
    { position: "topright" }
  ).addTo(map);

  // ----- BOUTON PLEIN ÉCRAN -----
  var fullscreenBtn;

  var FullscreenControl = L.Control.extend({
    options: { position: "topleft" },

    onAdd: function () {
      fullscreenBtn = L.DomUtil.create("a", "leaflet-bar leaflet-control");
      fullscreenBtn.href = "#";
      fullscreenBtn.title = "Plein écran";

      fullscreenBtn.style.width = "30px";
      fullscreenBtn.style.height = "30px";
      fullscreenBtn.style.display = "flex";
      fullscreenBtn.style.alignItems = "center";
      fullscreenBtn.style.justifyContent = "center";
      fullscreenBtn.style.fontSize = "18px";
      fullscreenBtn.style.fontWeight = "bold";
      fullscreenBtn.style.backgroundColor = "white";
      fullscreenBtn.style.color = "#000";
      fullscreenBtn.style.borderRadius = "4px";
      fullscreenBtn.style.cursor = "pointer";
      fullscreenBtn.style.userSelect = "none";

      fullscreenBtn.innerHTML = "⛶";

      L.DomEvent.on(fullscreenBtn, "click", function (e) {
        L.DomEvent.stop(e);
        toggleFullscreen();
      });

      return fullscreenBtn;
    }
  });

  map.addControl(new FullscreenControl());

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      mapDiv.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  document.addEventListener("fullscreenchange", function () {
    if (!fullscreenBtn) return;

    fullscreenBtn.innerHTML = document.fullscreenElement ? "⤡" : "⛶";
    setTimeout(function () {
      map.invalidateSize();
    }, 200);
  });

  // ----- GPX -----
  new L.GPX(gpxUrl, { async: true })
    .on("loaded", function (e) {

      var gpx = e.target;
      map.fitBounds(gpx.getBounds(), { padding: [40, 40] });

      // ----- PROFIL ALTIMÉTRIQUE -----
      var latlngs = gpx.getLayers()[0].getLatLngs();
      var elevations = latlngs.map(p => p.meta.ele || 0);

      if (!document.getElementById("profile")) return;

      var dist = [0];
      var total = 0;

      for (var i = 1; i < latlngs.length; i++) {
        total += map.distance(latlngs[i - 1], latlngs[i]);
        dist.push(total);
      }

      var minEle = Math.min.apply(null, elevations);
      var maxEle = Math.max.apply(null, elevations);

      var svg = document.getElementById("profile");
      svg.innerHTML = "";
      svg.style.background = "#f8f8f8";
      svg.style.border = "1px solid #ccc";

      var w = 1000, h = 180, pad = 20;

      function x(d) {
        return pad + (d / total) * (w - 2 * pad);
      }
      function y(e) {
        return h - pad - ((e - minEle) / (maxEle - minEle)) * (h - 2 * pad);
      }

      var path = "";
      for (var i = 0; i < elevations.length; i++) {
        path += (i === 0 ? "M" : "L") + x(dist[i]) + " " + y(elevations[i]) + " ";
      }

      var fillPath =
        path +
        "L " + x(total) + " " + (h - pad) +
        " L " + x(0) + " " + (h - pad) + " Z";

      var fill = document.createElementNS("http://www.w3.org/2000/svg", "path");
      fill.setAttribute("d", fillPath);
      fill.setAttribute("fill", "rgba(211,51,51,0.25)");
      svg.appendChild(fill);

      var line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", path);
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#d33");
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);

    })
    .addTo(map);
});
