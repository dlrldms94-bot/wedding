(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var postId = params.get("id");
  var titleEl = document.getElementById("board-view-title");
  var dateEl = document.getElementById("board-view-date");
  var contentEl = document.getElementById("board-view-content");
  var errorEl = document.getElementById("board-view-error");

  if (!postId || !titleEl || !contentEl) {
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = "잘못된 접근입니다.";
    }
    return;
  }

  SiteApi.getPost(postId)
    .then(function (post) {
      titleEl.textContent = post.title;
      if (dateEl) dateEl.textContent = formatBoardDate(post.createdAt);
      contentEl.innerHTML = BoardContent.renderPostContent(post);
    })
    .catch(function () {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "게시글을 불러오지 못했습니다.";
      }
    });

  function formatBoardDate(value) {
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
