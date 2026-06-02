(function () {
  "use strict";

  var tabList = document.querySelector(".timetable-tabs");
  if (!tabList) return;

  var tabs = tabList.querySelectorAll(".timetable-tab");
  var panels = document.querySelectorAll(".timetable-panel");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.getAttribute("data-tab");

      tabs.forEach(function (item) {
        var isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      panels.forEach(function (panel) {
        var isTarget = panel.getAttribute("data-panel") === target;
        panel.hidden = !isTarget;
      });
    });
  });
})();
