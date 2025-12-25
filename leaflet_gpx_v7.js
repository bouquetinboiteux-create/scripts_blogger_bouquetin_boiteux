(function () {

  console.log("Leaflet GPX v7");

  function init() {

    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      setTimeout(init, 200);
      return;
    }

    var gpxUrl = mapDiv.dataset.gpx;
    if (!gpxUrl || typeof L === "undefined") return;

    /* =========================
       CARTE & FONDS
    ========================= */
    var map = L.map("map");

    var osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap" }
    );

    var topo = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenTopoMap" }
    );

    topo.addTo(map);

    L.control.layers({
      "Topographique": topo,
      "OpenStreetMap": osm
    }).addTo(map);

    /* =========================
       ICÔNES
    ========================= */
    var redIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      shadowUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41]
    });

    /* =========================
       FLÈCHE SVG (STYLE INTERNE)
    ========================= */
    function arrowIcon(angle) {
      return L.divIcon({
        className: "",
        iconSize: [16, 16],
        html:
          '<svg width="16" height="16" viewBox="0 0 24 24" ' +
          'style="transform:rotate(' + angle + 'deg)">' +
          '<path d="M4 12h12l-4-4m4 4l-4 4" ' +
          'fill="none" stroke="#c00" stroke-width="2"/></svg>'
      });
    }

    /* =========================
       CHARGEMENT GPX
    ========================= */
    fetch(gpxUrl)
      .then(r => r.text())
      .then(text => {

        var xml = new DOMParser().parseFromString(text, "application/xml");
        var pts = xml.getElementsByTagName("trkpt");

        var latlngs = [];
        var elevations = [];
        var dist = [0];
        var total = 0;

        for (var i = 0; i < pts.length; i++) {
          var lat = parseFloat(pts[i].getAttribute("lat"));
          var lon = parseFloat(pts[i].getAttribute("lon"));
          latlngs.push([lat, lon]);

          var ele = pts[i].getElementsByTagName("ele")[0];
          elevations.push(ele ? parseFloat(ele.textContent) : 0);

          if (i > 0) {
            total += map.distance(latlngs[i - 1], latlngs[i]);
            dist.push(total);
          }
        }

        /* ===== TRACE ===== */
        var line = L.polyline(latlngs, {
          color: "#c00",
          weight: 4,
          opacity: 0.9
        }).addTo(map);

        var bounds = line.getBounds();
        map.fitBounds(bounds, { padding: [50, 50] });

        /* ===== MARQUEURS ===== */
        L.marker(latlngs[0], { icon: redIcon })
          .addTo(map)
          .bindPopup("🚩 Départ");

        L.marker(latlngs[latlngs.length - 1], { icon: redIcon })
          .addTo(map)
          .bindPopup("🏁 Arrivée");

        /* =========================
           FLÈCHES DE DIRECTION
        ========================= */
        var step = 400; // mètres entre flèches

        for (var i = 1; i < latlngs.length; i++) {

          if (dist[i] % step > step / 2) continue;

          var p1 = L.latLng(latlngs[i - 1]);
          var p2 = L.latLng(latlngs[i]);

          var angle = Math.atan2(
            p2.lng - p1.lng,
            p2.lat - p1.lat
          ) * 180 / Math.PI;

          L.marker(p2, {
            icon: arrowIcon(angle),
            interactive: false
          }).addTo(map);
        }

        drawProfile(dist, elevations, total);
      });

    /* =========================
       PROFIL ALTIMÉTRIQUE
    ========================= */
    function drawProfile(dist, ele, total) {

      var svg = document.getElementById("profile");
      if (!svg) return;

      svg.innerHTML = "";
      svg.style.background = "#f7f7f7";
      svg.style.border = "1px solid #ccc";

      var w = 1000, h = 180, p = 20;
      var min = Math.min.apply(null, ele);
      var max = Math.max.apply(null, ele);

      function x(d) {
        return p + (d / total) * (w - 2 * p);
      }

      function y(e) {
        return h - p - ((e - min) / (max - min)) * (h - 2 * p);
      }

      var d = "";
      for (var i = 0; i < ele.length; i++) {
        d += (i ? "L" : "M") + x(dist[i]) + " " + y(ele[i]) + " ";
      }

      var fill = d +
        "L " + x(total) + " " + (h - p) +
        " L " + x(0) + " " + (h - p) + " Z";

      var f = document.createElementNS("http://www.w3.org/2000/svg", "path");
      f.setAttribute("d", fill);
      f.setAttribute("fill", "rgba(200,0,0,0.25)");
      svg.appendChild(f);

      var l = document.createElementNS("http://www.w3.org/2000/svg", "path");
      l.setAttribute("d", d);
      l.setAttribute("fill", "none");
      l.setAttribute("stroke", "#c00");
      l.setAttribute("stroke-width", "2");
      svg.appendChild(l);
    }

    /* =========================
       BOUTONS
    ========================= */
    var recenterBtn = document.getElementById("recenterBtn");
    if (recenterBtn) {
      recenterBtn.onclick = function () {
        map.fitBounds(map.getBounds(), { padding: [50, 50] });
      };
    }

    var downloadBtn = document.getElementById("downloadBtn");
    if (downloadBtn) {
      downloadBtn.onclick = function () {
        fetch(gpxUrl)
          .then(r => r.blob())
          .then(blob => {
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = gpxUrl.split("/").pop();
            a.click();
            URL.revokeObjectURL(a.href);
          });
      };
    }
  }

  init();

})();
