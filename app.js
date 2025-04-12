// Функция для отображения ошибок
function showError(message) {
  const errorDiv = document.getElementById("error");
  errorDiv.innerText = message;
  errorDiv.style.display = "block";
  setTimeout(() => errorDiv.style.display = "none", 5000);
}

try {
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
    console.log("ArcGIS API loaded successfully");

    // Инициализация карты
    const map = new Map({
      basemap: "satellite"
    });

    const view = new MapView({
      container: "map",
      map: map,
      zoom: 10,
      center: [37.6173, 55.7558] // Центр Москвы
    });

    view.when(() => console.log("MapView initialized"), error => {
      console.error("MapView failed:", error);
      showError("Ошибка загрузки карты");
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
    try {
      const featureLayer = new FeatureLayer({
        url: "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/WorldCities/FeatureServer/0"
      });
      map.add(featureLayer);
      console.log("FeatureLayer added");
    } catch (error) {
      console.error("FeatureLayer failed:", error);
      showError("Ошибка загрузки данных о городах");
    }

    // Конвертация координат в СК-42
    try {
      proj4.defs("EPSG:28402", "+proj=tmerc +lat_0=0 +lon_0=39 +k=1 +x_0=2500000 +y_0=0 +ellps=krass +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12 +units=m +no_defs");
      console.log("Proj4js initialized");
    } catch (error) {
      console.error("Proj4js failed:", error);
      showError("Ошибка настройки СК-42");
    }

    function toSK42(lon, lat) {
      try {
        return proj4("EPSG:4326", "EPSG:28402", [lon, lat]);
      } catch (error) {
        console.error("SK-42 conversion failed:", error);
        return [0, 0];
      }
    }

    // Отображение координат в СК-42
    view.on("pointer-move", function(event) {
      try {
        const point = view.toMap({ x: event.x, y: event.y });
        if (point) {
          const sk42Coords = toSK42(point.longitude, point.latitude);
          document.getElementById("coords").innerText = `Координаты СК-42: X: ${sk42Coords[0].toFixed(2)}, Y: ${sk42Coords[1].toFixed(2)}`;
        }
      } catch (error) {
        console.error("Pointer-move error:", error);
      }
    });

    // Компас с использованием датчика устройства
    function startCompass() {
      if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", function(event) {
          const alpha = event.alpha;
          const compassDiv = document.getElementById("compass");
          if (alpha !== null) {
            compassDiv.innerText = `Компас: ${Math.round(alpha)}°`;
          } else {
            compassDiv.innerText = "Компас: недоступен";
          }
        });
        console.log("Compass initialized");
      } else {
        console.warn("DeviceOrientationEvent not supported");
        document.getElementById("compass").innerText = "Компас: не поддерживается";
      }
    }

    // Запрос разрешения для iOS
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      document.body.addEventListener("click", function() {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === "granted") {
              startCompass();
            } else {
              console.warn("Compass permission denied");
              document.getElementById("compass").innerText = "Компас: доступ запрещен";
            }
          })
          .catch(error => {
            console.error("Compass permission error:", error);
            showError("Ошибка доступа к компасу");
          });
      }, { once: true });
    } else {
      startCompass();
    }

    // Добавление меток по клику
    view.on("click", function(event) {
      try {
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
          }).catch(error => console.error("Share failed:", error));
        } else {
          console.warn("Web Share API not supported");
        }
      } catch (error) {
        console.error("Marker creation failed:", error);
        showError("Ошибка добавления метки");
      }
    });

    // Сохранение меток в localStorage
    function saveMarker(marker) {
      try {
        let markers = JSON.parse(localStorage.getItem("markers") || "[]");
        markers.push(marker);
        localStorage.setItem("markers", JSON.stringify(markers));
        console.log("Marker saved:", marker);
      } catch (error) {
        console.error("Save marker failed:", error);
        showError("Ошибка сохранения метки");
      }
    }

    // Загрузка сохраненных меток
    function loadMarkers() {
      try {
        const markers = JSON.parse(localStorage.getItem("markers") || "[]");
        graphicsLayer.removeAll();
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
        console.log("Markers loaded:", markers.length);
        updateMarkerList();
      } catch (error) {
        console.error("Load markers failed:", error);
        showError("Ошибка загрузки меток");
      }
    }

    // Обновление списка меток
    function updateMarkerList() {
      try {
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
        console.log("Marker list updated");
      } catch (error) {
        console.error("Update marker list failed:", error);
        showError("Ошибка обновления списка меток");
      }
    }

    // Удаление метки
    window.deleteMarker = function(id) {
      try {
        let markers = JSON.parse(localStorage.getItem("markers") || "[]");
        markers = markers.filter(marker => marker.id !== id);
        localStorage.setItem("markers", JSON.stringify(markers));
        graphicsLayer.removeAll();
        loadMarkers();
        console.log("Marker deleted:", id);
      } catch (error) {
        console.error("Delete marker failed:", error);
        showError("Ошибка удаления метки");
      }
    };

    // Инициализация
    loadMarkers();
  }, error => {
    console.error("ArcGIS API failed to load:", error);
    showError("Ошибка загрузки ArcGIS API");
  });
} catch (error) {
  console.error("Global error:", error);
  showError("Критическая ошибка приложения");
}