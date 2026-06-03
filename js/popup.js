(function () {
  "use strict";

  var overlay = document.getElementById("site-popup");
  if (!overlay) return;

  var imageLink = document.getElementById("site-popup-image-link");
  var imageEl = document.getElementById("site-popup-image");
  var closeBtn = document.getElementById("site-popup-close");
  var hideTodayBtn = document.getElementById("site-popup-hide-today");

  var FALLBACK_POPUP = {
    id: 1,
    imageUrl: "img/event1.jpg",
    linkUrl: "intro/overview.html"
  };

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

  function hidePopup() {
    overlay.hidden = true;
    document.body.classList.remove("has-popup");
    document.body.style.overflow = "";
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

  function tryShow(popup) {
    if (!popup || !popup.imageUrl || isHiddenToday(popup.id)) return false;
    overlay.setAttribute("data-popup-id", popup.id);
    showPopup(popup);
    return true;
  }

  function showPopup(popup) {
    if (!popup.imageUrl) return;

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

  closeBtn.addEventListener("click", hidePopup);
  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) hidePopup();
  });

  imageLink.addEventListener("click", function (event) {
    if (imageLink.classList.contains("is-disabled")) {
      event.preventDefault();
    }
  });

  hideTodayBtn.addEventListener("click", function () {
    var popupId = overlay.getAttribute("data-popup-id");
    if (popupId) {
      localStorage.setItem(storageKey(popupId), todayKey());
    }
    hidePopup();
  });

  unlockPageScroll();

  SiteApi.getActivePopup()
    .then(function (popup) {
      if (tryShow(popup)) return;
      tryShow(FALLBACK_POPUP);
    })
    .catch(function () {
      tryShow(FALLBACK_POPUP);
    });
})();
