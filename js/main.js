(function () {
  "use strict";

  function unlockPageScroll() {
    var menuOpen = document.querySelector(".nav-menu-wrap.is-open");
    var popupOpen = document.body.classList.contains("has-popup");
    if (!menuOpen && !popupOpen) {
      document.body.style.overflow = "";
    }
  }

  unlockPageScroll();

  var nav = document.querySelector(".site-nav");
  var toggle = document.querySelector(".nav-toggle");
  var menuWrap = document.querySelector(".nav-menu-wrap");
  var navItems = document.querySelectorAll(".nav-item.has-dropdown");

  /* Sticky nav background on scroll */
  function handleNavScroll() {
    if (!nav) return;

    if (nav.classList.contains("is-solid")) return;

    if (window.scrollY > 60) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }

  /* Mobile hamburger toggle */
  function closeMobileMenu() {
    if (!toggle || !menuWrap) return;
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded", "false");
    menuWrap.classList.remove("is-open");
    if (!document.body.classList.contains("has-popup")) {
      document.body.style.overflow = "";
    }
    navItems.forEach(function (item) {
      item.classList.remove("is-open");
    });
  }

  function openMobileMenu() {
    if (!toggle || !menuWrap) return;
    toggle.classList.add("is-active");
    toggle.setAttribute("aria-expanded", "true");
    menuWrap.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  if (toggle && menuWrap) {
    toggle.addEventListener("click", function () {
      if (menuWrap.classList.contains("is-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  /* Mobile dropdown accordion */
  navItems.forEach(function (item) {
    var link = item.querySelector(".nav-link");

    if (!link) return;

    link.addEventListener("click", function (e) {
      if (window.innerWidth > 768) return;

      e.preventDefault();
      var isOpen = item.classList.contains("is-open");

      navItems.forEach(function (other) {
        other.classList.remove("is-open");
      });

      if (!isOpen) {
        item.classList.add("is-open");
      }
    });
  });

  /* Close mobile menu on resize to desktop */
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  /* Close mobile menu when clicking a submenu link */
  document.querySelectorAll(".dropdown a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  window.addEventListener("scroll", handleNavScroll, { passive: true });
  handleNavScroll();

  /* Hero video autoplay fallback */
  var heroVideo = document.querySelector(".hero-video-wrap video");
  if (heroVideo) {
    heroVideo.play().catch(function () {
      /* Autoplay blocked — video stays as poster frame */
    });
  }
})();
