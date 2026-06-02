(function (global) {
  "use strict";

  var modal;
  var gridEl;
  var folderTabs;
  var uploadInput;
  var uploadBtn;
  var closeBtn;
  var activeInputId = null;
  var activeFolder = "all";
  var fields = {};

  function init() {
    modal = document.getElementById("admin-media-modal");
    gridEl = document.getElementById("admin-media-grid");
    folderTabs = document.querySelectorAll("[data-media-folder-tab]");
    uploadInput = document.getElementById("admin-media-upload-input");
    uploadBtn = document.getElementById("admin-media-upload-btn");
    closeBtn = document.getElementById("admin-media-close");

    if (!modal || !gridEl) return;

    document.querySelectorAll("[data-media-open]").forEach(function (button) {
      button.addEventListener("click", function () {
        open(button.getAttribute("data-media-open"));
      });
    });

    document.querySelectorAll("[data-media-clear]").forEach(function (button) {
      button.addEventListener("click", function () {
        setValue(button.getAttribute("data-media-clear"), "");
      });
    });

    folderTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activeFolder = tab.getAttribute("data-media-folder-tab");
        folderTabs.forEach(function (item) {
          item.classList.toggle("is-active", item === tab);
        });
        loadMedia();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", close);
    }

    modal.addEventListener("click", function (event) {
      if (event.target === modal || event.target.classList.contains("admin-media-modal__backdrop")) {
        close();
      }
    });

    if (uploadBtn && uploadInput) {
      uploadBtn.addEventListener("click", function () {
        uploadInput.click();
      });

      uploadInput.addEventListener("change", function () {
        if (!uploadInput.files || !uploadInput.files[0]) return;

        var formData = new FormData();
        formData.append("file", uploadInput.files[0]);

        uploadBtn.disabled = true;
        uploadBtn.textContent = "업로드 중...";

        SiteApi.adminUpload("/api/admin/media/upload", formData)
          .then(function (file) {
            activeFolder = "uploads";
            folderTabs.forEach(function (item) {
              item.classList.toggle("is-active", item.getAttribute("data-media-folder-tab") === "uploads");
            });
            return loadMedia().then(function () {
              if (file && file.path) {
                selectFile(file.path);
              }
            });
          })
          .catch(function (error) {
            alert(error.message);
          })
          .finally(function () {
            uploadBtn.disabled = false;
            uploadBtn.textContent = "새 이미지 업로드";
            uploadInput.value = "";
          });
      });
    }

    registerField("admin-post-image");
    registerField("admin-popup-image");
  }

  function registerField(inputId) {
    fields[inputId] = {
      input: document.getElementById(inputId),
      preview: document.getElementById(inputId + "-preview"),
      path: document.getElementById(inputId + "-path")
    };
  }

  function open(inputId) {
    if (!modal) return;
    activeInputId = inputId;
    modal.hidden = false;
    document.body.classList.add("admin-media-open");
    loadMedia();
  }

  function close() {
    if (!modal) return;
    modal.hidden = true;
    activeInputId = null;
    document.body.classList.remove("admin-media-open");
  }

  function loadMedia() {
    return SiteApi.adminRequest("/api/admin/media?folder=" + encodeURIComponent(activeFolder))
      .then(function (files) {
        if (!files.length) {
          gridEl.innerHTML = '<p class="admin-media-empty">표시할 이미지가 없습니다.</p>';
          return;
        }

        gridEl.innerHTML = files.map(function (file) {
          return (
            '<button type="button" class="admin-media-item" data-media-path="' + escapeAttr(file.path) + '">' +
              '<img src="' + escapeAttr(file.path) + '" alt="' + escapeAttr(file.name) + '">' +
              '<span class="admin-media-item__name">' + escapeHtml(file.name) + "</span>" +
            "</button>"
          );
        }).join("");

        gridEl.querySelectorAll("[data-media-path]").forEach(function (button) {
          button.addEventListener("click", function () {
            selectFile(button.getAttribute("data-media-path"));
          });
        });
      })
      .catch(function () {
        gridEl.innerHTML = '<p class="admin-media-empty">이미지 목록을 불러오지 못했습니다.</p>';
      });
  }

  function selectFile(path) {
    if (!activeInputId) return;
    setValue(activeInputId, path);
    close();
  }

  function setValue(inputId, path) {
    var field = fields[inputId];
    if (!field || !field.input) return;

    field.input.value = path || "";

    if (field.path) {
      field.path.textContent = path || "선택된 이미지 없음";
    }

    if (field.preview) {
      if (path) {
        field.preview.innerHTML = '<img src="' + escapeAttr(path) + '" alt="">';
        field.preview.hidden = false;
      } else {
        field.preview.innerHTML = "";
        field.preview.hidden = true;
      }
    }
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

  global.AdminMediaPicker = {
    init: init,
    setValue: setValue
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
