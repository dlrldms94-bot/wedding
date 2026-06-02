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
      contentEl.innerHTML = renderPostContent(post);
    })
    .catch(function () {
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "게시글을 불러오지 못했습니다.";
      }
    });

  function renderPostContent(post) {
    var html = "";

    if (post.imageUrl) {
      html += (
        '<figure class="board-view__figure">' +
          '<img src="' + escapeAttr(post.imageUrl) + '" alt="">' +
        "</figure>"
      );
    }

    html += post.content
      .split("\n")
      .map(renderContentLine)
      .join("");

    if (post.youtubeUrl) {
      html += renderYoutubeEmbed(post.youtubeUrl);
    }

    return html;
  }

  function renderContentLine(line) {
    var trimmed = line.trim();
    if (!trimmed) return "";

    if (/^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/)/.test(trimmed) && extractYoutubeId(trimmed)) {
      return renderYoutubeEmbed(trimmed);
    }

    return "<p>" + escapeHtml(trimmed) + "</p>";
  }

  function renderYoutubeEmbed(url) {
    var videoId = extractYoutubeId(url);
    if (!videoId) return "";

    return (
      '<div class="board-view__video">' +
        '<div class="board-view__video-wrap">' +
          '<iframe src="https://www.youtube.com/embed/' + escapeAttr(videoId) + '" ' +
            'title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        "</div>" +
      "</div>"
    );
  }

  function extractYoutubeId(url) {
    if (!url) return null;

    var value = String(url).trim();
    var match;

    match = value.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    match = value.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    match = value.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    match = value.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    return null;
  }

  function formatBoardDate(value) {
    if (!value) return "";
    var text = String(value).slice(0, 10);
    var parts = text.split("-");
    if (parts.length !== 3) return text;
    return parts[0] + "." + parts[1] + "." + parts[2];
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
})();
