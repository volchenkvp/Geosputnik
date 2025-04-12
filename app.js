require([
  "esri/Map",
  "esri/views/MapView",
  "esri/widgets/Compass",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/widgets/Search",
  "esri/geometry/Point",
  "esri/layers/FeatureLayer"
], function(Map, MapView, Compass, GraphicsLayer, Graphic, Search, Point, FeatureLayer) {
  // Инициализация карты с видом со спутника
  const map = new Map({
    basemap: "satellite"
  });

  const view = new MapView({
    container: "map",
    map: map,
    zoom: 10,
    center: [37.6173, 55.7558] // Центр Москвы
  });

  // Слой для меток
  const graphicsLayer = new GraphicsLayer();
  map.add(graphicsLayer);

  // Добавление компаса
  const compass = new Compass({
    view: view
  });
  view.ui.add(compass, "top-right");

  // Поиск населенных пунктов
  const search = new Search({
    view: view
  });
  view.ui.add(search, "top-left");

  // Подключение слоя с данными о городах
  const featureLayer = new FeatureLayer({
    url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/WorldCities/FeatureServer/0"
  });
  map.add(featureLayer);

  // Конвертация координат в СК-42
  proj4.defs("EPSG:28402", "+proj=tmerc +lat_0=0 +lon_0=39 +k=1 +x_0=2500000 +y_0=0 +ellps=krass +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12 +units=m +no_defs");
  function toSK42(lon, lat) {
    return proj4("EPSG:4326", "EPSG:28402", [lon, lat]);
  }

  // Отображение координат в СК-42
  view.on("pointer-move", function(event) {
    const point = view.toMap({ x: event.x, y: event.y });
    const sk42Coords = toSK42(point.longitude, point.latitude);
    document.getElementById("coords").innerText = `Координаты СК-42: X: ${sk42Coords[0].toFixed(2)}, Y: ${sk42Coords[1].toFixed(2)}`;
  });

  // Компас с использованием датчика устройства
  if (window.DeviceOrientationEvent) {
    // Для iOS запрос разрешения
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      document.body.addEventListener("click", function() {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === "granted") {
              startCompass();
            }
          })
          .catch(console.error);
      }, { once: true });
    } else {
      startCompass();
    }
  }

  function startCompass() {
    window.addEventListener("deviceorientation", function(event) {
      const alpha = event.alpha;
      const compassDiv = document.getElementById("compass");
      if (alpha !== null) {
        compassDiv.innerText = `Компас: ${Math.round(alpha)}°`;
      }
    });
  }

  // Добавление меток по клику
  view.on("click", function(event) {
    const point = new Point({
      longitude: event.mapPoint.longitude,
      latitude: event.mapPoint.latitude
    });

    const graphic = new Graphic({
      geometry: point,
      symbol: {
        type: "simple-marker",
        color: "red",
        size: "12px",
        outline: { color: "white", width: 2 }
      }
    });

    graphicsLayer.add(graphic);

    // Сохранение метки
    const sk42Coords = toSK42(point.longitude, point.latitude);
    const description = prompt("Описание метки:") || "Без описания";
    const marker = {
      id: Date.now(),
      lon: point.longitude,
      lat: point.latitude,
      sk42x: sk42Coords[0],
      sk42y: sk42Coords[1],
      description: description
    };
    saveMarker(marker);
    updateMarkerList();

    // Делиться меткой
    if (navigator.share) {
      navigator.share({
        title: "Метка Geosputnik",
        text: `Метка: ${description}\nСК-42 X: ${sk42Coords[0].toFixed(2)}, Y: ${sk42Coords[1].toFixed(2)}`,
        url: window.location.href
      }).catch(console.error);
    }
  });

  // Сохранение меток в localStorage
  function saveMarker(marker) {
    let markers = JSON.parse(localStorage.getItem("markers") || "[]");
    markers.push(marker);
    localStorage.setItem("markers", JSON.stringify(markers));
  }

  // Загрузка сохраненных меток
  function loadMarkers() {
    const markers = JSON.parse(localStorage.getItem("markers") || "[]");
    markers.forEach(marker => {
      const point = new Point({
        longitude: marker.lon,
        latitude: marker.lat
      });
      const graphic = new Graphic({
        geometry: point,
        symbol: {
          type: "simple-marker",
          color: "red",
          size: "12px",
          outline: { color: "white", width: 2 }
        }
      });
      graphicsLayer.add(graphic);
    });
    updateMarkerList();
  }

  // Обновление списка меток
  function updateMarkerList() {
    const markers = JSON.parse(localStorage.getItem("markers") || "[]");
    const markerList = document.getElementById("markers");
    markerList.innerHTML = "";
    if (markers.length > 0) {
      document.getElementById("markerList").classList.remove("d-none");
      markers.forEach(marker => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `
          ${marker.description}<br>
          СК-42: X: ${marker.sk42x.toFixed(2)}, Y: ${marker.sk42y.toFixed(2)}
          <button class="btn btn-sm btn-danger float-end" onclick="deleteMarker(${marker.id})">Удалить</button>
        `;
        markerList.appendChild(li);
      });
    } else {
      document.getElementById("markerList").classList.add("d-none");
    }
  }

  // Удаление метки
  window.deleteMarker = function(id) {
    let markers = JSON.parse(localStorage.getItem("markers") || "[]");
    markers = markers.filter(marker => marker.id !== id);
    localStorage.setItem("markers", JSON.stringify(markers));
    graphicsLayer.removeAll();
    loadMarkers();
  };

  // Инициализация
  loadMarkers();
});
