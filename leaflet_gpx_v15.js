(function () {

  console.log("Leaflet GPX Blog v15");

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
       ICÔNE DÉPART / ARRIVÉE
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
       POINT MOBILE LIÉ AU PROFIL
    ========================= */
    var hoverMarker = L.circleMarker(latlngs[0], {
      radius: 6,
      color: "#c00",
      fillColor: "#c00",
      fillOpacity: 1,
      weight: 2
    }).addTo(map);

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

        /* ===== PROFIL ALTIM hookup hookup ===== */
        drawProfile(dist, elevations, total);

        /* ===== BOUTONS ===== */
        var recenterBtn = document.getElementById("recenterBtn");
        if (recenterBtn) {
          recenterBtn.onclick = function () {
            map.fitBounds(bounds, { padding: [50, 50] });
          };
        }

        var downloadBtn = document.getElementById("downloadBtn");
        if (downloadBtn) {
          downloadBtn.onclick = function () {
            fetch(gpxUrl)
              .then(r => r.blob())
              .then(blob => {
                var name = gpxUrl.split("/").pop();
                var a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = name;
                a.click();
                URL.revokeObjectURL(a.href);
              });
          };
        }
      });

    /* =========================
       PROFIL ALTIMÉTRIQUE SVG
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
  }

  init();

})();
