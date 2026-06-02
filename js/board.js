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

      listBody.innerHTML = posts.map(function (post, index) {
        return (
          "<tr>" +
            "<td>" + (posts.length - index) + "</td>" +
            '<td class="board-list__title"><a href="board-view.html?id=' + post.id + '">' + escapeHtml(post.title) + "</a></td>" +
            "<td>" + escapeHtml(post.createdAt) + "</td>" +
          "</tr>"
        );
      }).join("");
    })
    .catch(function () {
      listBody.innerHTML =
        '<tr><td colspan="3" class="board-list__error">게시글을 불러오지 못했습니다. 서버가 실행 중인지 확인해 주세요.</td></tr>';
    });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
