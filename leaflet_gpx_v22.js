document.addEventListener("DOMContentLoaded", function () {

  console.log("SCRIPT GPX v22 CHARGÉ");

  var gpxUrl = document.body.dataset.gpx;
  if (!gpxUrl) return;

  // ===== CARTE =====
  var map = L.map("map");

  var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenTopoMap"
  }).addTo(map);

  var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  });

  var sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "&copy; Esri" }
  );

  L.control.layers({
    "Topographique": topo,
    "OpenStreetMap": osm,
    "Satellite": sat
  }).addTo(map);

  // ===== PROFIL SVG =====
  var svg = document.getElementById("profile");
  svg.style.background = "#f8f8f8";
  svg.style.border = "1px solid #ccc";

  var width = svg.getBoundingClientRect().width;
  var height = 180;
  var padding = 20;

  // curseur
  var cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
  cursor.setAttribute("y1", 0);
  cursor.setAttribute("y2", height);
  cursor.setAttribute("stroke", "#333");
  cursor.setAttribute("stroke-width", "1");
  svg.appendChild(cursor);

  // point mobile carte
  var movingMarker = L.circleMarker([0,0], {
    radius: 6,
    color: "#d33",
    fillColor: "#fff",
    fillOpacity: 1,
    weight: 2
  }).addTo(map);

  // ===== CHARGEMENT GPX =====
  fetch(gpxUrl).then(r => r.text()).then(text => {

    var xml = new DOMParser().parseFromString(text, "application/xml");
    var pts = xml.getElementsByTagName("trkpt");

    var latlngs = [];
    var ele = [];
    var dist = [0];
    var total = 0;

    for (let i = 0; i < pts.length; i++) {
      let lat = parseFloat(pts[i].getAttribute("lat"));
      let lon = parseFloat(pts[i].getAttribute("lon"));
      latlngs.push([lat, lon]);

      let e = pts[i].getElementsByTagName("ele")[0];
      ele.push(e ? parseFloat(e.textContent) : 0);

      if (i > 0) {
        total += map.distance(latlngs[i - 1], latlngs[i]);
        dist.push(total);
      }
    }

    // ===== TRACE =====
    var poly = L.polyline(latlngs, {
      color: "#d33",
      weight: 4,
      opacity: 0.9
    }).addTo(map);

    var bounds = poly.getBounds();
    map.fitBounds(bounds, { padding: [40, 40] });

    // ===== INFOS =====
    var deniv = 0;
    for (let i = 1; i < ele.length; i++) {
      let d = ele[i] - ele[i - 1];
      if (d > 0) deniv += d;
    }

    document.getElementById("info").innerHTML =
      "Distance : " + (total / 1000).toFixed(1) + " km — D+ : " + deniv.toFixed(0) + " m";

    // ===== PROFIL =====
    var minEle = Math.min(...ele);
    var maxEle = Math.max(...ele);

    function x(d) {
      return padding + (d / total) * (width - 2 * padding);
    }

    function y(e) {
      return height - padding -
        ((e - minEle) / (maxEle - minEle)) * (height - 2 * padding);
    }

    var path = "";
    for (let i = 0; i < ele.length; i++) {
      path += (i === 0 ? "M" : "L") + x(dist[i]) + " " + y(ele[i]) + " ";
    }

    var fillPath =
      path +
      "L " + x(total) + " " + (height - padding) +
      " L " + x(0) + " " + (height - padding) + " Z";

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

    // ===== INTERACTION PROFIL =====
    svg.addEventListener("mousemove", function (e) {
      var r = svg.getBoundingClientRect();
      var px = Math.max(padding, Math.min(e.clientX - r.left, width - padding));
      cursor.setAttribute("x1", px);
      cursor.setAttribute("x2", px);

      var ratio = (px - padding) / (width - 2 * padding);
      var d = ratio * total;

      var i = dist.findIndex(v => v >= d);
      if (i < 0) i = dist.length - 1;

      movingMarker.setLatLng(latlngs[i]);
    });

    // ===== BOUTONS =====
    document.getElementById("recenterBtn").onclick = () =>
      map.fitBounds(bounds, { padding: [40, 40] });

    document.getElementById("downloadBtn").onclick = () => {
      fetch(gpxUrl).then(r => r.blob()).then(b => {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = gpxUrl.split("/").pop();
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };

  });

});
