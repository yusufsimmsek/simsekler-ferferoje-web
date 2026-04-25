(() => {
  const disabledHref = "#";
  const fullLogoSrc = "/assets/simseklermuhendislik.png";
  const markLogoSrc = "/assets/simsekler-mark.svg";
  const homeSectionPaths = new Set(["", "/", "/home-1"]);
  const fallbackRoutes = new Map([
    ["/home-4", "/about-us/"],
  ]);

  const blockedHrefPattern = /^(https?:|mailto:|tel:)/i;
  const fullLogoPattern = /Logo%20(?:Dark|Light)%20Ironis\.svg/i;
  const markLogoPattern = /Icon%20Logo\.svg/i;
  const faviconPattern = /Ironis%20(?:Favicon|Webclip)\.png/i;

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .promotion-labels-wrapper-to-remove {
        display: none !important;
      }

      .local-template-graphic-hidden {
        display: none !important;
      }

      .local-only-disabled-link,
      .local-only-disabled-link * {
        cursor: default !important;
      }

      .local-only-disabled-link {
        opacity: 0.68;
      }

      .local-brand-full-logo,
      .local-brand-mark {
        display: block;
        width: auto !important;
        object-fit: contain;
      }

      .brand .local-brand-full-logo,
      .brand-tablet .local-brand-full-logo {
        height: 38px !important;
        max-width: 182px !important;
      }

      .subscribe-footer-wrapper > a .local-brand-full-logo {
        max-width: 240px !important;
        width: 100% !important;
        height: auto !important;
      }

      .top-content-wrapper.local-no-mark {
        justify-content: flex-start !important;
      }

      .top-content-wrapper.local-no-mark .left-top-title-wrapper.width---55 {
        width: 100% !important;
      }

      .contact-wrapper.local-contact-full-width {
        justify-content: flex-start !important;
      }

      .contact-wrapper.local-contact-full-width .contact-content-wrapper {
        width: 100% !important;
        max-width: none !important;
      }

      .menu-wrap.local-simple-menu .nav-link {
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .menu-wrap.local-simple-menu {
        align-items: center;
      }

      .local-home-process-grid .number-wrap {
        min-height: 100%;
      }

      .local-home-process-grid .number-wrap p {
        max-width: 240px;
      }

      .local-home-process-actions {
        margin-top: 40px;
      }

      .icon-logo.local-brand-mark {
        height: 160px !important;
        max-width: 160px !important;
      }

      @media (max-width: 991px) {
        .brand .local-brand-full-logo,
        .brand-tablet .local-brand-full-logo {
          height: 34px !important;
          max-width: 164px !important;
        }

        .icon-logo.local-brand-mark {
          height: 140px !important;
          max-width: 140px !important;
        }

        .local-home-process-actions {
          margin-top: 30px;
        }
      }

      @media (max-width: 479px) {
        .icon-logo.local-brand-mark {
          height: 100px !important;
          max-width: 100px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function sanitizeAnchor(anchor) {
    const rawHref = (anchor.getAttribute("href") || "").trim();
    if (!rawHref) {
      return;
    }

    const fallbackHref = fallbackRoutes.get(rawHref);
    if (fallbackHref) {
      anchor.setAttribute("href", fallbackHref);
      anchor.removeAttribute("target");
      return;
    }

    if (!blockedHrefPattern.test(rawHref)) {
      return;
    }

    anchor.dataset.originalHref = rawHref;
    anchor.setAttribute("href", disabledHref);
    anchor.removeAttribute("target");
    anchor.classList.add("local-only-disabled-link");
    anchor.setAttribute("aria-disabled", "true");
  }

  function sanitizeAnchors() {
    document.querySelectorAll("a[href]").forEach(sanitizeAnchor);
  }

  function replaceBrandAssets() {
    document.querySelectorAll("img[src]").forEach((img) => {
      const rawSrc = img.getAttribute("src") || "";
      const alt = (img.getAttribute("alt") || "").trim();

      if (fullLogoPattern.test(rawSrc) || /^(Black|White) Logo$/i.test(alt)) {
        img.setAttribute("src", fullLogoSrc);
        img.removeAttribute("srcset");
        img.setAttribute("alt", "Simsekler Muhendislik Logo");
        img.classList.add("local-brand-full-logo");
        return;
      }

      if (markLogoPattern.test(rawSrc)) {
        img.setAttribute("src", markLogoSrc);
        img.removeAttribute("srcset");
        img.setAttribute("alt", "Simsekler Muhendislik Marka Isareti");
        img.classList.add("local-brand-mark");
      }
    });

    document
      .querySelectorAll("link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel~='icon']")
      .forEach((link) => {
        const rawHref = link.getAttribute("href") || "";
        if (!faviconPattern.test(rawHref) && !/Ironis/i.test(rawHref)) {
          return;
        }

        link.setAttribute("href", fullLogoSrc);
      });
  }

  function removeTemplateGraphics() {
    document
      .querySelectorAll("img.icon-logo, img[src*='/assets/simsekler-mark.svg'], img[src*='Image%20Vector.png']")
      .forEach((img) => {
        const rawSrc = img.getAttribute("src") || "";

        if (/Image%20Vector\.png/i.test(rawSrc)) {
          const imageWrapper = img.closest(".image-primary-wrapper");
          if (imageWrapper) {
            imageWrapper.classList.add("local-template-graphic-hidden");
            const contactWrapper = imageWrapper.closest(".contact-wrapper");
            if (contactWrapper) {
              contactWrapper.classList.add("local-contact-full-width");
            }
            return;
          }
        }

        img.classList.add("local-template-graphic-hidden");
        const topContentWrapper = img.closest(".top-content-wrapper");
        if (topContentWrapper) {
          topContentWrapper.classList.add("local-no-mark");
        }
      });
  }

  function normalizePath(pathname) {
    const path = (pathname || "/").replace(/index\.html$/i, "");
    if (!path || path === "/") {
      return "/";
    }

    return path.replace(/\/+$/, "");
  }

  function isHomeLikePath(pathname) {
    return homeSectionPaths.has(normalizePath(pathname));
  }

  function createNavLink(href, label) {
    const link = document.createElement("a");
    const currentPath = normalizePath(window.location.pathname);
    const targetPath = normalizePath(href);

    link.href = href;
    link.className = "nav-link w-nav-link";
    link.textContent = label;

    if (currentPath === targetPath) {
      link.classList.add("w--current");
      link.setAttribute("aria-current", "page");
    }

    return link;
  }

  function simplifyNavigation() {
    const navItems = [
      { href: "/about-us/", label: "Hakkımızda" },
      { href: "/services/", label: "Hizmetler" },
      { href: "/projects/", label: "Projeler" },
      { href: "/faq/", label: "SSS" },
      { href: "/contact-us/", label: "İletişim" },
    ];

    document.querySelectorAll(".nav-menu .menu-wrap").forEach((menuWrap) => {
      if (menuWrap.dataset.localSimpleNav === "true") {
        return;
      }

      const tabletButton = menuWrap.querySelector(".tablet-button-wrapper");
      menuWrap.classList.add("local-simple-menu");
      menuWrap.replaceChildren();

      navItems.forEach((item) => {
        menuWrap.appendChild(createNavLink(item.href, item.label));
      });

      if (tabletButton) {
        menuWrap.appendChild(tabletButton);
      }

      menuWrap.dataset.localSimpleNav = "true";
    });
  }

  function injectHomeContent() {
    if (!isHomeLikePath(window.location.pathname) || document.querySelector(".local-home-extra-section")) {
      return;
    }

    const projectsHeading = Array.from(document.querySelectorAll(".big-h2")).find((heading) =>
      /Projeler/i.test(heading.textContent || ""),
    );
    const projectsSection = projectsHeading?.closest(".section");

    if (!projectsSection) {
      return;
    }

    const section = document.createElement("section");
    section.className = "section without-top-spacing local-home-extra-section";
    section.innerHTML = `
      <div class="w-layout-blockcontainer base-container w-container">
        <div class="top-big-section-wrapper-with-line">
          <div class="left-title-wrapper">
            <div class="subtitle-wrapper">
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688c88b9fa8c1caa83be789b_Subtitle%20icon%20Black.svg" loading="lazy" alt=""/>
              <div class="subtitle-text black-text">Süreç</div>
            </div>
            <h2 class="big-h2">İşin başından montaja kadar net bir akış.</h2>
          </div>
          <div class="right-title-wrapper">
            <p>Ölçü alma, tasarımı netleştirme, üretim ve montaj adımlarını gecikmesiz ve şeffaf biçimde yönetiyoruz. Bodrum villaları ve yaşam alanları için süreci kolaylaştırıyoruz.</p>
          </div>
        </div>
        <div class="w-layout-grid big-numbers-wrapper local-home-process-grid">
          <div class="number-wrap">
            <div class="big-number">01</div>
            <p>Keşif ve ölçü.
            Mekânı yerinde görür, kullanım ihtiyacını ve teknik detayları netleştiririz.</p>
          </div>
          <div class="number-wrap">
            <div class="big-number">02</div>
            <p>Tasarım ve teklif.
            Uygun model, malzeme ve uygulama kapsamıyla net bir yol haritası sunarız.</p>
          </div>
          <div class="number-wrap">
            <div class="big-number">03</div>
            <p>Atölye üretimi.
            Ferforje, kapı ve çelik işlerini ölçüye uygun şekilde disiplinli üretiriz.</p>
          </div>
          <div class="number-wrap">
            <div class="big-number">04</div>
            <p>Temiz montaj ve teslim.
            Uygulamayı sahada tamamlar, son kontrollerle birlikte kullanıma hazır teslim ederiz.</p>
          </div>
        </div>
        <div class="section-button-wrapper local-home-process-actions">
          <a href="/contact-us/" class="primary-button w-inline-block">
            <div>Keşif Planla</div>
            <div class="arrows-button">
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b32a64d16109629c8c8d0_Button%20Arrow.svg" loading="lazy" alt="Top Arrow" class="arrow-button black-arrow"/>
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b3461a12b76a2afb251ff_Arrow%20Botton%202%20Yellow.svg" loading="lazy" alt="Primary Right Arrow" class="arrow-button absolute-arrow"/>
            </div>
          </a>
          <div class="link-hover-wrapper">
            <a href="/projects/" class="link-with-icon">Projeleri İncele<span class="arrow-link"> </span></a>
            <div class="line-link"></div>
          </div>
        </div>
      </div>
    `;

    projectsSection.before(section);
  }

  function installClickGuard() {
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a.local-only-disabled-link");
      if (!anchor) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    });
  }

  function boot() {
    injectStyles();
    replaceBrandAssets();
    removeTemplateGraphics();
    simplifyNavigation();
    injectHomeContent();
    sanitizeAnchors();
    installClickGuard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
