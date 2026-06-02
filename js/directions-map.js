(function () {
  "use strict";

  var MAP_CONTAINER_ID = "directions-kakao-map";
  var VENUE = {
    name: "서울식물원",
    lat: 37.563532,
    lng: 126.837013,
    level: 3
  };

  function showFallback(container, message) {
    container.innerHTML =
      '<p class="directions-map__fallback">' + message + "</p>";
  }

  function initMap(container) {
    var center = new kakao.maps.LatLng(VENUE.lat, VENUE.lng);
    var map = new kakao.maps.Map(container, {
      center: center,
      level: VENUE.level
    });

    new kakao.maps.Marker({
      map: map,
      position: center
    });

    var zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    window.addEventListener("resize", function () {
      map.relayout();
      map.setCenter(center);
    });
  }

  function loadKakaoMaps(callback) {
    if (window.kakao && window.kakao.maps) {
      kakao.maps.load(callback);
      return;
    }

    var appKey = window.KAKAO_MAP_APP_KEY;
    var script = document.createElement("script");
    script.src =
      "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
      encodeURIComponent(appKey) +
      "&autoload=false";
    script.onload = function () {
      kakao.maps.load(callback);
    };
    script.onerror = function () {
      callback(new Error("Kakao Maps SDK load failed"));
    };
    document.head.appendChild(script);
  }

  function boot() {
    var container = document.getElementById(MAP_CONTAINER_ID);
    if (!container) return;

    var appKey = window.KAKAO_MAP_APP_KEY;
    if (!appKey || appKey === "YOUR_JAVASCRIPT_KEY_HERE") {
      showFallback(
        container,
        "카카오 지도 API 키를 js/kakao-config.js에 설정해 주세요."
      );
      return;
    }

    loadKakaoMaps(function (err) {
      if (err) {
        showFallback(container, "지도를 불러오지 못했습니다.");
        return;
      }

      initMap(container);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
