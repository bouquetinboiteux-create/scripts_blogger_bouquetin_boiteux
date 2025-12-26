(function () {

  console.log("Leaflet GPX Blog v18)");

  function init() {

    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      setTimeout(init, 200);
      return;
    }

    var gpxUrl = mapDiv.dataset.gpx;
    if (!gpxUrl) {
      console.error("data-gpx manquant sur #map");
      return;
    }

    /* =========================
       CARTE & FONDS
    ========================= */
    var map = L.map("map");

    var topo = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenTopoMap" }
    ).addTo(map);

    var osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap" }
    );

    var satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "&copy; Esri" }
    );

    L.control.layers({
      "Topographique": topo,
      "OpenStreetMap": osm,
      "Satellite": satellite
    }).addTo(map);

    /* =========================
       PLEIN ÉCRAN
    ========================= */
    var Fullscreen = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function () {
        var btn = L.DomUtil.create("a", "leaflet-bar");
        btn.innerHTML = "⛶";
        btn.style.background = "white";
        btn.style.width = "30px";
        btn.style.height = "30px";
        btn.style.lineHeight = "30px";
        btn.style.textAlign = "center";
        btn.style.cursor = "pointer";

        L.DomEvent.on(btn, "click", function (e) {
          L.DomEvent.stop(e);
          if (!document.fullscreenElement) {
            mapDiv.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        });

        return btn;
      }
    });
    map.addControl(new Fullscreen());

    document.addEventListener("fullscreenchange", function () {
      setTimeout(function () {
        map.invalidateSize();
      }, 200);
    });

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

    var cursorMarker = L.circleMarker([0, 0], {
      radius: 6,
      color: "#c00",
      fillColor: "#c00",
      fillOpacity: 1
    });

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
          color: "red",
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

        /* ===== PROFIL ===== */
        drawProfile(dist, elevations, total, latlngs);
      });

    /* =========================
       PROFIL ALTIMÉTRIQUE INTERACTIF
    ========================= */
    function drawProfile(dist, ele, total, latlngs) {

      var svg = document.getElementById("profile");
      if (!svg) return;

      svg.innerHTML = "";
      svg.style.background = "#f7f7f7";
      svg.style.border = "1px solid #ccc";
      svg.style.cursor = "crosshair";

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

      var fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      fillPath.setAttribute("d", fill);
      fillPath.setAttribute("fill", "rgba(200,0,0,0.25)");
      svg.appendChild(fillPath);

      var linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      linePath.setAttribute("d", d);
      linePath.setAttribute("fill", "none");
      linePath.setAttribute("stroke", "#c00");
      linePath.setAttribute("stroke-width", "2");
      svg.appendChild(linePath);

      /* ===== Curseur vertical ===== */
      var cursorLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      cursorLine.setAttribute("y1", p);
      cursorLine.setAttribute("y2", h - p);
      cursorLine.setAttribute("stroke", "#000");
      cursorLine.setAttribute("stroke-width", "1");
      cursorLine.setAttribute("opacity", "0.5");
      svg.appendChild(cursorLine);

      /* ===== Interaction ===== */
      function moveCursor(evt) {
        var rect = svg.getBoundingClientRect();
      
        var clientX = evt.touches
          ? evt.touches[0].clientX
          : evt.clientX;
      
        // position en pixels écran
        var pxScreen = clientX - rect.left;
      
        // conversion vers coordonnées SVG (viewBox = 1000)
        var px = (pxScreen / rect.width) * 1000;
      
        px = Math.max(p, Math.min(w - p, px));
      
        cursorLine.setAttribute("x1", px);
        cursorLine.setAttribute("x2", px);
      
        var ratio = (px - p) / (w - 2 * p);
        var dTarget = ratio * total;
      
        var i = 0;
        while (i < dist.length && dist[i] < dTarget) i++;
        i = Math.min(i, latlngs.length - 1);
      
        cursorMarker.setLatLng(latlngs[i]).addTo(map);
      }

      svg.addEventListener("mousemove", moveCursor);
      svg.addEventListener("touchmove", moveCursor);
      svg.addEventListener("mouseleave", function () {
        map.removeLayer(cursorMarker);
      });
    }
  }

  init();

})();
