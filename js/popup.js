(function () {
  "use strict";

  var overlay = document.getElementById("site-popup");
  if (!overlay) return;

  var imageLink = document.getElementById("site-popup-image-link");
  var imageEl = document.getElementById("site-popup-image");
  var closeBtn = document.getElementById("site-popup-close");
  var hideTodayBtn = document.getElementById("site-popup-hide-today");

  function hidePopup() {
    overlay.hidden = true;
    document.body.classList.remove("has-popup");
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

  function showPopup(popup) {
    if (!popup.imageUrl) return;

    imageEl.src = popup.imageUrl;
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

  SiteApi.getActivePopup()
    .then(function (popup) {
      if (!popup || !popup.imageUrl || isHiddenToday(popup.id)) return;
      overlay.setAttribute("data-popup-id", popup.id);
      showPopup(popup);
    })
    .catch(function () {
      /* no popup */
    });
})();
