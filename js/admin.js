(function () {
  "use strict";

  var loginSection = document.getElementById("admin-login");
  var dashboardSection = document.getElementById("admin-dashboard");
  var loginForm = document.getElementById("admin-login-form");
  var loginError = document.getElementById("admin-login-error");
  var logoutBtn = document.getElementById("admin-logout");
  var tabs = document.querySelectorAll("[data-admin-tab]");
  var panels = document.querySelectorAll("[data-admin-panel]");
  var postForm = document.getElementById("admin-post-form");
  var popupForm = document.getElementById("admin-popup-form");
  var postList = document.getElementById("admin-post-list");
  var popupList = document.getElementById("admin-popup-list");
  var postResetBtn = document.getElementById("admin-post-reset");
  var popupResetBtn = document.getElementById("admin-popup-reset");

  var editingPostId = null;
  var editingPopupId = null;

  function showDashboard() {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadPosts();
    loadPopups();
  }

  function showLogin() {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    sessionStorage.removeItem("adminToken");
  }

  function switchTab(name) {
    tabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.getAttribute("data-admin-tab") === name);
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-admin-panel") !== name;
    });
  }

  function resetPostForm() {
    editingPostId = null;
    postForm.reset();
    document.getElementById("admin-post-id").value = "";
    document.getElementById("admin-post-date").value = todayString();
    document.getElementById("admin-post-notice").checked = false;
    document.getElementById("admin-post-submit").textContent = "게시글 등록";
    AdminMediaPicker.setValue("admin-post-image", "");
  }

  function resetPopupForm() {
    editingPopupId = null;
    popupForm.reset();
    document.getElementById("admin-popup-id").value = "";
    document.getElementById("admin-popup-active").checked = true;
    document.getElementById("admin-popup-submit").textContent = "팝업 등록";
    AdminMediaPicker.setValue("admin-popup-image", "");
  }

  function todayString() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function loadPosts() {
    SiteApi.adminRequest("/api/admin/posts")
      .then(function (posts) {
        if (!posts.length) {
          postList.innerHTML = '<p class="admin-empty">등록된 게시글이 없습니다.</p>';
          return;
        }

        postList.innerHTML = posts.map(function (post) {
          var noticeLabel = post.isNotice ? '<span class="admin-item__badge">공지</span>' : "";
          return (
            '<article class="admin-item">' +
              '<div class="admin-item__head">' +
                "<strong>" + escapeHtml(post.title) + noticeLabel + "</strong>" +
                '<span class="admin-item__meta">' + escapeHtml(formatAdminDate(post.createdAt)) + "</span>" +
              "</div>" +
              '<p class="admin-item__preview">' + escapeHtml(post.content.slice(0, 80)) + "...</p>" +
              '<div class="admin-item__actions">' +
                '<button type="button" class="admin-btn admin-btn--ghost" data-edit-post="' + post.id + '">수정</button>' +
                '<button type="button" class="admin-btn admin-btn--danger" data-delete-post="' + post.id + '">삭제</button>' +
              "</div>" +
            "</article>"
          );
        }).join("");
      })
      .catch(function () {
        postList.innerHTML = '<p class="admin-empty">게시글 목록을 불러오지 못했습니다.</p>';
      });
  }

  function loadPopups() {
    SiteApi.adminRequest("/api/admin/popups")
      .then(function (popups) {
        if (!popups.length) {
          popupList.innerHTML = '<p class="admin-empty">등록된 팝업이 없습니다.</p>';
          return;
        }

        popupList.innerHTML = popups.map(function (popup) {
          var preview = popup.imageUrl
            ? '<img src="' + escapeAttr(popup.imageUrl) + '" alt="" class="admin-item__thumb">'
            : "";
          var linkText = popup.linkUrl || "링크 없음";

          return (
            '<article class="admin-item admin-item--popup">' +
              '<div class="admin-item__head">' +
                '<strong>' + escapeHtml(linkText) + "</strong>" +
                '<span class="admin-item__meta">' + (popup.active ? "노출" : "비노출") + "</span>" +
              "</div>" +
              preview +
              '<p class="admin-item__preview">' + escapeHtml(popup.imageUrl || "이미지 없음") + "</p>" +
              '<div class="admin-item__actions">' +
                '<button type="button" class="admin-btn admin-btn--ghost" data-edit-popup="' + popup.id + '">수정</button>' +
                '<button type="button" class="admin-btn admin-btn--danger" data-delete-popup="' + popup.id + '">삭제</button>' +
              "</div>" +
            "</article>"
          );
        }).join("");
      })
      .catch(function () {
        popupList.innerHTML = '<p class="admin-empty">팝업 목록을 불러오지 못했습니다.</p>';
      });
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loginError.hidden = true;

    SiteApi.request("/api/admin/login", {
      method: "POST",
      body: { password: document.getElementById("admin-password").value }
    })
      .then(function (data) {
        sessionStorage.setItem("adminToken", data.token);
        showDashboard();
      })
      .catch(function (error) {
        loginError.hidden = false;
        loginError.textContent = error.message;
      });
  });

  logoutBtn.addEventListener("click", function () {
    SiteApi.adminRequest("/api/admin/logout", { method: "POST" }).finally(showLogin);
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      switchTab(tab.getAttribute("data-admin-tab"));
    });
  });

  postForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = {
      title: document.getElementById("admin-post-title").value,
      content: document.getElementById("admin-post-content").value,
      imageUrl: document.getElementById("admin-post-image").value,
      youtubeUrl: document.getElementById("admin-post-youtube").value,
      createdAt: document.getElementById("admin-post-date").value,
      isNotice: document.getElementById("admin-post-notice").checked
    };

    var request = editingPostId
      ? SiteApi.adminRequest("/api/admin/posts/" + editingPostId, { method: "PUT", body: payload })
      : SiteApi.adminRequest("/api/admin/posts", { method: "POST", body: payload });

    request.then(function () {
      resetPostForm();
      loadPosts();
    }).catch(function (error) {
      alert(error.message);
    });
  });

  popupForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var imageUrl = document.getElementById("admin-popup-image").value.trim();
    if (!imageUrl) {
      alert("팝업 이미지를 선택해 주세요.");
      return;
    }

    var payload = {
      imageUrl: imageUrl,
      linkUrl: document.getElementById("admin-popup-link").value,
      active: document.getElementById("admin-popup-active").checked,
      startDate: document.getElementById("admin-popup-start").value,
      endDate: document.getElementById("admin-popup-end").value
    };

    var request = editingPopupId
      ? SiteApi.adminRequest("/api/admin/popups/" + editingPopupId, { method: "PUT", body: payload })
      : SiteApi.adminRequest("/api/admin/popups", { method: "POST", body: payload });

    request.then(function () {
      resetPopupForm();
      loadPopups();
    }).catch(function (error) {
      alert(error.message);
    });
  });

  postResetBtn.addEventListener("click", resetPostForm);
  popupResetBtn.addEventListener("click", resetPopupForm);

  postList.addEventListener("click", function (event) {
    var editId = event.target.getAttribute("data-edit-post");
    var deleteId = event.target.getAttribute("data-delete-post");

    if (editId) {
      SiteApi.getPost(editId).then(function (post) {
        editingPostId = post.id;
        document.getElementById("admin-post-id").value = post.id;
        document.getElementById("admin-post-title").value = post.title;
        document.getElementById("admin-post-content").value = post.content;
        AdminMediaPicker.setValue("admin-post-image", post.imageUrl || "");
        document.getElementById("admin-post-youtube").value = post.youtubeUrl || "";
        document.getElementById("admin-post-date").value = post.createdAt;
        document.getElementById("admin-post-notice").checked = Boolean(post.isNotice);
        document.getElementById("admin-post-submit").textContent = "게시글 수정";
      });
    }

    if (deleteId && confirm("이 게시글을 삭제할까요?")) {
      SiteApi.adminRequest("/api/admin/posts/" + deleteId, { method: "DELETE" }).then(loadPosts);
    }
  });

  popupList.addEventListener("click", function (event) {
    var editId = event.target.getAttribute("data-edit-popup");
    var deleteId = event.target.getAttribute("data-delete-popup");

    if (editId) {
      SiteApi.adminRequest("/api/admin/popups").then(function (popups) {
        var popup = popups.find(function (item) {
          return String(item.id) === String(editId);
        });
        if (!popup) return;

        editingPopupId = popup.id;
        document.getElementById("admin-popup-id").value = popup.id;
        AdminMediaPicker.setValue("admin-popup-image", popup.imageUrl || "");
        document.getElementById("admin-popup-link").value = popup.linkUrl || "";
        document.getElementById("admin-popup-active").checked = Boolean(popup.active);
        document.getElementById("admin-popup-start").value = popup.startDate || "";
        document.getElementById("admin-popup-end").value = popup.endDate || "";
        document.getElementById("admin-popup-submit").textContent = "팝업 수정";
      });
    }

    if (deleteId && confirm("이 팝업을 삭제할까요?")) {
      SiteApi.adminRequest("/api/admin/popups/" + deleteId, { method: "DELETE" }).then(loadPopups);
    }
  });

  if (sessionStorage.getItem("adminToken")) {
    showDashboard();
  } else {
    showLogin();
  }

  resetPostForm();
  resetPopupForm();

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

  function formatAdminDate(value) {
    if (!value) return "";

    var text = String(value).slice(0, 10);
    var parts = text.split("-");

    if (parts.length !== 3) {
      parts = String(value).split(".");
    }

    if (parts.length !== 3) return String(value);

    return parts[0] + "." + padDatePart(parts[1]) + "." + padDatePart(parts[2]);
  }

  function padDatePart(value) {
    return String(Number(value)).padStart(2, "0");
  }
})();
