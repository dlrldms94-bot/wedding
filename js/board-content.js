(function (global) {
  "use strict";

  var YOUTUBE_LINE =
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?|embed\/|shorts\/)|youtu\.be\/)/;

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

  function linkifyText(text) {
    var escaped = escapeHtml(text);

    return escaped.replace(
      /(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]}>]*)|(www\.[^\s<]+[^\s<.,;:!?"')\]}>]*)/gi,
      function (match) {
        var href = match;
        if (/^www\./i.test(href)) {
          href = "https://" + href;
        }
        return (
          '<a href="' +
          escapeAttr(href) +
          '" class="board-view__link" target="_blank" rel="noopener noreferrer">' +
          match +
          "</a>"
        );
      }
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

  function renderYoutubeEmbed(url) {
    var videoId = extractYoutubeId(url);
    if (!videoId) return "";

    return (
      '<div class="board-view__video">' +
        '<div class="board-view__video-wrap">' +
          '<iframe src="https://www.youtube.com/embed/' +
          escapeAttr(videoId) +
          '" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        "</div>" +
      "</div>"
    );
  }

  function isTableRow(line) {
    return /^\s*\|.+\|\s*$/.test(line);
  }

  function parseTableCells(line) {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map(function (cell) {
        return cell.trim();
      });
  }

  function isTableSeparatorRow(cells) {
    return (
      cells.length > 0 &&
      cells.every(function (cell) {
        return /^:?-{3,}:?$/.test(cell);
      })
    );
  }

  function renderTableCell(cell) {
    return "<td>" + linkifyText(cell) + "</td>";
  }

  function renderTableHeaderCell(cell) {
    return "<th scope=\"col\">" + linkifyText(cell) + "</th>";
  }

  function renderTable(lines) {
    var parsed = lines.map(parseTableCells).filter(function (cells) {
      return cells.length > 0;
    });

    if (!parsed.length) return "";

    var colCount = parsed[0].length;
    var tableClass = "board-view__table";
    var colgroup = "";

    if (colCount === 3) {
      tableClass += " board-view__table--vendor";
      colgroup =
        "<colgroup>" +
          '<col class="board-view__col-name">' +
          '<col class="board-view__col-phone">' +
          '<col class="board-view__col-url">' +
        "</colgroup>";
    }

    var html =
      '<div class="board-view__table-wrap"><table class="' + tableClass + '">' + colgroup;
    var bodyStart = 0;

    if (!isTableSeparatorRow(parsed[0])) {
      html +=
        '<thead class="board-view__table-head"><tr class="board-view__table-title">' +
        parsed[0].map(renderTableHeaderCell).join("") +
        "</tr></thead>";
      bodyStart = 1;
      if (parsed.length > 1 && isTableSeparatorRow(parsed[1])) {
        bodyStart = 2;
      }
    }

    html += "<tbody>";
    for (var i = bodyStart; i < parsed.length; i += 1) {
      if (isTableSeparatorRow(parsed[i])) continue;
      html += "<tr>" + parsed[i].map(renderTableCell).join("") + "</tr>";
    }
    html += "</tbody></table></div>";

    return html;
  }

  function parseContentBlocks(content) {
    var lines = String(content || "").split("\n");
    var blocks = [];
    var index = 0;

    while (index < lines.length) {
      var line = lines[index];

      if (isTableRow(line)) {
        var tableLines = [];
        while (index < lines.length && isTableRow(lines[index])) {
          tableLines.push(lines[index]);
          index += 1;
        }
        blocks.push({ type: "table", lines: tableLines });
        continue;
      }

      blocks.push({ type: "line", line: line });
      index += 1;
    }

    return blocks;
  }

  function renderContentLine(line) {
    var trimmed = line.trim();
    if (!trimmed) return "";

    if (YOUTUBE_LINE.test(trimmed) && extractYoutubeId(trimmed)) {
      return renderYoutubeEmbed(trimmed);
    }

    return "<p>" + linkifyText(trimmed) + "</p>";
  }

  function renderPostContent(post) {
    var html = "";

    if (post.imageUrl) {
      html +=
        '<figure class="board-view__figure">' +
        '<img src="' +
        escapeAttr(post.imageUrl) +
        '" alt="">' +
        "</figure>";
    }

    var blocks = parseContentBlocks(post.content);
    blocks.forEach(function (block) {
      if (block.type === "table") {
        html += renderTable(block.lines);
        return;
      }
      html += renderContentLine(block.line);
    });

    if (post.youtubeUrl) {
      html += renderYoutubeEmbed(post.youtubeUrl);
    }

    return html;
  }

  function getTableTemplate() {
    return [
      "| 업체명 | 전화번호 | 홈페이지 |",
      "| --- | --- | --- |",
      "| 예시 업체 | 02-000-0000 | https://seoulweddingfesta.kr |",
      ""
    ].join("\n");
  }

  global.BoardContent = {
    renderPostContent: renderPostContent,
    getTableTemplate: getTableTemplate,
    linkifyText: linkifyText
  };
})(window);
