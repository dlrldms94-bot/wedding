(function () {
  "use strict";

  var overlay = document.getElementById("site-popup");
  if (!overlay) return;

  var imageLink = document.getElementById("site-popup-image-link");
  var imageEl = document.getElementById("site-popup-image");
  var closeBtn = document.getElementById("site-popup-close");
  var hideTodayBtn = document.getElementById("site-popup-hide-today");

  var FALLBACK_POPUPS = [
    {
      id: 1,
      imageUrl: "img/event1.jpg",
      linkUrl: "intro/overview.html"
    }
  ];

  var queue = [];
  var queueIndex = 0;

  function unlockPageScroll() {
    if (overlay.hidden) {
      document.body.classList.remove("has-popup");
      document.body.style.overflow = "";
    }
  }

  function resolveAssetUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.charAt(0) === "/" && window.location.protocol === "file:") {
      return url.slice(1);
    }
    return url;
  }

  function hideOverlay() {
    overlay.hidden = true;
    document.body.classList.remove("has-popup");
    document.body.style.overflow = "";
    queue = [];
    queueIndex = 0;
  }

  function storageKey(popupId) {
    return "wedding_popup_hidden_" + popupId;
  }

  function isHiddenToday(popupId) {
    return localStorage.getItem(storageKey(popupId)) === todayKey();
  }

  function todayKey() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function filterVisiblePopups(popups) {
    return (popups || []).filter(function (popup) {
      return popup && popup.imageUrl && !isHiddenToday(popup.id);
    });
  }

  function renderPopup(popup) {
    if (!popup || !popup.imageUrl) return;

    overlay.setAttribute("data-popup-id", popup.id);
    imageEl.src = resolveAssetUrl(popup.imageUrl);
    imageEl.alt = "팝업";

    if (popup.linkUrl) {
      imageLink.href = popup.linkUrl;
      imageLink.classList.remove("is-disabled");
      imageLink.removeAttribute("aria-disabled");
    } else {
      imageLink.href = "#";
      imageLink.classList.add("is-disabled");
      imageLink.setAttribute("aria-disabled", "true");
    }

    overlay.hidden = false;
    document.body.classList.add("has-popup");
    document.body.style.overflow = "hidden";
  }

  function showQueue() {
    queue = filterVisiblePopups(queue);
    if (!queue.length) {
      hideOverlay();
      return;
    }

    if (queueIndex >= queue.length) {
      hideOverlay();
      return;
    }

    renderPopup(queue[queueIndex]);
  }

  function startPopupQueue(popups) {
    queue = filterVisiblePopups(popups);
    queueIndex = 0;

    if (!queue.length) {
      hideOverlay();
      return;
    }

    showQueue();
  }

  function closeCurrentPopup(markHiddenToday) {
    var popup = queue[queueIndex];
    if (markHiddenToday && popup && popup.id) {
      localStorage.setItem(storageKey(popup.id), todayKey());
    }

    queueIndex += 1;
    if (queueIndex < queue.length) {
      showQueue();
      return;
    }

    hideOverlay();
  }

  closeBtn.addEventListener("click", function () {
    closeCurrentPopup(false);
  });

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeCurrentPopup(false);
    }
  });

  imageLink.addEventListener("click", function (event) {
    if (imageLink.classList.contains("is-disabled")) {
      event.preventDefault();
    }
  });

  hideTodayBtn.addEventListener("click", function () {
    closeCurrentPopup(true);
  });

  unlockPageScroll();

  SiteApi.getActivePopups()
    .then(function (popups) {
      if (popups.length) {
        startPopupQueue(popups);
        return;
      }
      startPopupQueue(FALLBACK_POPUPS);
    })
    .catch(function () {
      startPopupQueue(FALLBACK_POPUPS);
    });
})();
