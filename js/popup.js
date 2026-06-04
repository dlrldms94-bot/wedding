(function () {
  "use strict";

  var overlay = document.getElementById("site-popup");
  var stage = document.getElementById("site-popup-stage");
  if (!overlay || !stage) return;

  var DESKTOP_MQ = window.matchMedia("(min-width: 1025px)");

  var FALLBACK_POPUPS = [
    {
      id: 1,
      imageUrl: "img/event1.jpg",
      linkUrl: "intro/overview.html"
    }
  ];

  var queue = [];
  var queueIndex = 0;

  function isDesktopLayout() {
    return DESKTOP_MQ.matches;
  }

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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function hideOverlay() {
    overlay.hidden = true;
    stage.innerHTML = "";
    stage.className = "site-popup__stage";
    document.body.classList.remove("has-popup");
    document.body.style.overflow = "";
    queue = [];
    queueIndex = 0;
  }

  function lockPageScroll() {
    overlay.hidden = false;
    document.body.classList.add("has-popup");
    document.body.style.overflow = "hidden";
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

  function stageLayoutClass(count) {
    if (count <= 1) return "site-popup__stage--single";
    if (count === 2) return "site-popup__stage--dual";
    return "site-popup__stage--multi";
  }

  function buildPopupBox(popup) {
    var linkUrl = popup.linkUrl || "#";
    var hasLink = Boolean(popup.linkUrl);
    var linkClass = hasLink ? "site-popup__image-link" : "site-popup__image-link is-disabled";
    var linkAttrs = hasLink
      ? ' href="' + escapeAttr(linkUrl) + '"'
      : ' href="#" aria-disabled="true"';

    var box = document.createElement("article");
    box.className = "site-popup__box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "팝업");
    box.setAttribute("data-popup-id", popup.id);

    box.innerHTML =
      '<button type="button" class="site-popup__close" data-popup-close aria-label="팝업 닫기">&times;</button>' +
      '<div class="site-popup__image-wrap">' +
        '<a class="' + linkClass + '"' + linkAttrs + ">" +
          '<img src="' + escapeAttr(resolveAssetUrl(popup.imageUrl)) + '" alt="팝업">' +
        "</a>" +
      "</div>" +
      '<div class="site-popup__footer">' +
        '<button type="button" class="site-popup__hide-today" data-popup-hide-today>오늘 하루 보지 않기</button>' +
      "</div>";

    return box;
  }

  function renderDesktopAll(popups) {
    stage.innerHTML = "";
    stage.className = "site-popup__stage " + stageLayoutClass(popups.length);

    popups.forEach(function (popup) {
      stage.appendChild(buildPopupBox(popup));
    });

    lockPageScroll();
  }

  function renderMobileOne() {
    queue = filterVisiblePopups(queue);

    if (!queue.length) {
      hideOverlay();
      return;
    }

    if (queueIndex >= queue.length) {
      hideOverlay();
      return;
    }

    var popup = queue[queueIndex];
    stage.innerHTML = "";
    stage.className = "site-popup__stage site-popup__stage--single";
    stage.appendChild(buildPopupBox(popup));
    lockPageScroll();
  }

  function removePopupById(popupId, markHiddenToday) {
    if (markHiddenToday && popupId) {
      localStorage.setItem(storageKey(popupId), todayKey());
    }

    queue = queue.filter(function (popup) {
      return String(popup.id) !== String(popupId);
    });

    if (!queue.length) {
      hideOverlay();
      return;
    }

    if (isDesktopLayout()) {
      renderDesktopAll(queue);
      return;
    }

    if (queueIndex >= queue.length) {
      queueIndex = Math.max(0, queue.length - 1);
    }
    renderMobileOne();
  }

  function startPopupQueue(popups) {
    queue = filterVisiblePopups(popups);
    queueIndex = 0;

    if (!queue.length) {
      hideOverlay();
      return;
    }

    if (isDesktopLayout()) {
      renderDesktopAll(queue);
      return;
    }

    renderMobileOne();
  }

  function closeCurrentMobile(markHiddenToday) {
    var popup = queue[queueIndex];
    if (markHiddenToday && popup && popup.id) {
      localStorage.setItem(storageKey(popup.id), todayKey());
    }

    queueIndex += 1;
    renderMobileOne();
  }

  overlay.addEventListener("click", function (event) {
    if (event.target !== overlay) return;

    if (isDesktopLayout()) {
      hideOverlay();
      return;
    }

    closeCurrentMobile(false);
  });

  stage.addEventListener("click", function (event) {
    var closeBtn = event.target.closest("[data-popup-close]");
    if (closeBtn) {
      var box = closeBtn.closest("[data-popup-id]");
      var popupId = box && box.getAttribute("data-popup-id");
      if (isDesktopLayout()) {
        removePopupById(popupId, false);
      } else {
        closeCurrentMobile(false);
      }
      return;
    }

    var hideBtn = event.target.closest("[data-popup-hide-today]");
    if (hideBtn) {
      var hideBox = hideBtn.closest("[data-popup-id]");
      var hideId = hideBox && hideBox.getAttribute("data-popup-id");
      if (isDesktopLayout()) {
        removePopupById(hideId, true);
      } else {
        closeCurrentMobile(true);
      }
      return;
    }

    var link = event.target.closest(".site-popup__image-link.is-disabled");
    if (link) {
      event.preventDefault();
    }
  });

  DESKTOP_MQ.addEventListener("change", function () {
    if (overlay.hidden || !queue.length) return;
    queueIndex = 0;
    queue = filterVisiblePopups(queue);
    if (!queue.length) {
      hideOverlay();
      return;
    }
    startPopupQueue(queue);
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
