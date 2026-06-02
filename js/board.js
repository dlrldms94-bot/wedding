(function () {
  "use strict";

  var listBody = document.getElementById("board-list");
  var emptyEl = document.getElementById("board-empty");

  if (!listBody) return;

  SiteApi.getPosts()
    .then(function (posts) {
      if (!posts.length) {
        if (emptyEl) emptyEl.hidden = false;
        return;
      }

      var regularCount = 0;

      listBody.innerHTML = posts.map(function (post) {
        var isNotice = Boolean(post.isNotice);
        var numberCell = isNotice ? "공지" : String(++regularCount);
        var rowClass = isNotice ? ' class="board-list__row board-list__row--notice"' : ' class="board-list__row"';
        var titleHtml = isNotice
          ? '<span class="board-list__badge">공지</span><a href="board-view.html?id=' + post.id + '">' + escapeHtml(post.title) + "</a>"
          : '<a href="board-view.html?id=' + post.id + '">' + escapeHtml(post.title) + "</a>";

        return (
          "<tr" + rowClass + ">" +
            '<td class="board-list__num">' + numberCell + "</td>" +
            '<td class="board-list__title">' + titleHtml + "</td>" +
            "<td>" + escapeHtml(formatBoardDate(post.createdAt)) + "</td>" +
          "</tr>"
        );
      }).join("");
    })
    .catch(function () {
      listBody.innerHTML =
        '<tr><td colspan="3" class="board-list__error">게시글을 불러오지 못했습니다. 서버가 실행 중인지 확인해 주세요.</td></tr>';
    });

  function formatBoardDate(value) {
    if (!value) return "";

    var text = String(value).slice(0, 10);
    var parts = text.split("-");

    if (parts.length !== 3) {
      parts = String(value).split(".");
    }

    if (parts.length !== 3) return String(value);

    return Number(parts[0]) + "." + Number(parts[1]) + "." + Number(parts[2]);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
