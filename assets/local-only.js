(() => {
  const disabledHref = "#";
  const fullLogoSrc = "/assets/simseklermuhendislik.png";
  const markLogoSrc = "/assets/simsekler-mark.svg";
  const homeSectionPaths = new Set(["", "/", "/home-1"]);
  const serviceImageReplacements = new Map([
    ["ferforje", "/assets/services/ferforje.png"],
    ["celik konstruksiyon", "/assets/services/celik-konstruksiyon.png"],
    ["kapi uretimleri", "/assets/services/kapi-uretimleri.png"],
    ["korkuluk & balkon demirleri", "/assets/services/korkuluk-balkon-demirleri.png"],
    ["korkuluk balkon demirleri", "/assets/services/korkuluk-balkon-demirleri.png"],
    ["ozel tasarim", "/assets/services/ozel-tasarim-bridge.png"],
    ["boardex uygulamalari", "/assets/services/boardex-generated.png"],
  ]);
  const serviceDetailImageReplacements = new Map([
    ["/hizmetler/ferforje", "/assets/services/ferforje.png"],
    ["/hizmetler/celik-konstruksiyon", "/assets/services/celik-konstruksiyon.png"],
    ["/hizmetler/kapi-uretimleri", "/assets/services/kapi-uretimleri.png"],
    ["/hizmetler/korkuluk-balkon", "/assets/services/korkuluk-balkon-demirleri.png"],
    ["/hizmetler/ozel-tasarim", "/assets/services/ozel-tasarim-bridge.png"],
    ["/hizmetler/boardex-uygulamalari", "/assets/services/boardex-generated.png"],
  ]);
  const projectCardImageReplacements = new Map([
    ["villa giris kapisi", "/assets/services/kapi-uretimleri.png"],
    ["ferforje korkuluklar", "/assets/services/korkuluk-balkon-demirleri.png"],
    ["celik pergola", "/assets/services/celik-konstruksiyon.png"],
    ["boardex dis cephe", "/assets/services/boardex-generated.png"],
  ]);
  const projectDetailImageReplacements = new Map([
    ["/projeler/modern-staircase-design", "/assets/services/kapi-uretimleri.png"],
    ["/projeler/architectural-metalwork", "/assets/services/korkuluk-balkon-demirleri.png"],
    ["/projeler/sheet-metal-creations", "/assets/services/celik-konstruksiyon.png"],
    ["/projeler/custom-machine-parts", "/assets/services/boardex-generated.png"],
  ]);
  const extraHomeServices = [
    {
      href: "/hizmetler/korkuluk-balkon",
      title: "Korkuluk & Balkon Demirleri",
      description:
        "Balkon, merdiven ve duvar \u00fcst\u00fc uygulamalarda dayan\u0131kl\u0131 korkuluk \u00e7\u00f6z\u00fcmleri \u00fcretiyoruz.",
      imageSrc: "/assets/services/korkuluk-balkon-demirleri.png",
    },
    {
      href: "/hizmetler/ozel-tasarim",
      title: "\u00d6zel Tasar\u0131m",
      description: "Mekana \u00f6zel ferforje ve metal detaylar\u0131 tasar\u0131mdan \u00fcretime ta\u015f\u0131yoruz.",
      imageSrc: "/assets/services/ozel-tasarim-bridge.png",
    },
    {
      href: "/hizmetler/boardex-uygulamalari",
      title: "BoardeX Uygulamalar\u0131",
      description:
        "BoardeX uygulamalar\u0131nda do\u011fru sistem detaylar\u0131yla cephe ve yard\u0131mc\u0131 alan \u00e7\u00f6z\u00fcmleri sunuyoruz.",
      imageSrc: "/assets/services/boardex-generated.png",
    },
  ];
  const fallbackRoutes = new Map([
    ["/home-4", "/hakkimizda/"],
  ]);

  const instagramUrl = "https://www.instagram.com/simseklerferforje/";
  const facebookUrl = "https://www.facebook.com/simseklerferforje/?locale=tr_TR";
  const blockedHrefPattern = /^(https?:|mailto:|tel:)/i;
  const allowedExternalHrefPatterns = [
    /https?:\/\/(www\.)?instagram\.com\/simseklerferforje\/?/i,
    /https?:\/\/(www\.)?facebook\.com\/simseklerferforje\/?/i,
  ];
  const fullLogoPattern = /Logo%20(?:Dark|Light)%20Ironis\.svg/i;
  const markLogoPattern = /Icon%20Logo\.svg/i;
  const faviconPattern = /Ironis%20(?:Favicon|Webclip)\.png/i;

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --brand-primary: #b89a2a;
        --brand-secondary: #8a8a8a;
        --brand-dark: #0b0b0b;
        --brand-light: #f4efe5;
        --primary-light: #f7f2e9;
        --black: #1d1a16;
        --paragraph-gray: #6f665c;
        --gray: rgba(138, 138, 138, 0.22);
        --white: #fbfaf7;
        --primary: #b89a2a;
        --light-gray: rgba(138, 138, 138, 0.14);
        --white-50: rgba(251, 250, 247, 0.58);
        --dark-gray-50: rgba(138, 138, 138, 0.5);
      }

      html {
        background-color: var(--brand-light);
      }

      body {
        background:
          radial-gradient(circle at top right, rgba(184, 154, 42, 0.16), transparent 26%),
          radial-gradient(circle at top left, rgba(138, 138, 138, 0.08), transparent 22%),
          linear-gradient(180deg, #f8f4ec 0%, #f3ede2 100%);
        color: var(--black);
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6,
      .big-h2,
      .big-number,
      .small-number,
      .h2-footer,
      .team-member-text {
        color: var(--black);
      }

      p,
      .footer-rights,
      .footer-copyright,
      .gray-text,
      .light-paragraph,
      .paragraph-width---95,
      .right-title-wrapper p,
      .text-team-member-wrapper p,
      .rich-text-style p,
      .rich-text-style li,
      .rich-text-style blockquote {
        color: var(--paragraph-gray);
      }

      a,
      .nav-link,
      .nav-item-title,
      .nav-dropdown-link,
      .dropdown-nav-link,
      .link-with-icon,
      .service-name,
      .footer-link,
      .footer-copyright-link {
        color: var(--black);
      }

      a:hover,
      .nav-link:hover,
      .nav-link.w--current,
      .nav-dropdown-link:hover,
      .nav-dropdown-link.w--current,
      .dropdown-nav-link:hover,
      .dropdown-nav-link.w--current,
      .link-with-icon:hover,
      .service-name:hover,
      .footer-link:hover,
      .footer-link.social-link,
      .footer-copyright-link:hover {
        color: var(--primary) !important;
      }

      .black-text,
      .primary-text-color,
      .subtitle-text,
      .subtitle-text.black-text,
      .subtitle-text.white-text,
      .white-semibold-text {
        color: var(--primary) !important;
      }

      .white-text,
      .white-text.medium-text,
      .inner-h1 {
        color: var(--black) !important;
      }

      .subtitle-wrapper img {
        filter: brightness(0) saturate(100%) invert(68%) sepia(31%) saturate(836%) hue-rotate(10deg) brightness(90%) contrast(88%);
      }

      .navbar {
        background-color: rgba(252, 249, 243, 0.88);
        border-bottom: 1px solid rgba(138, 138, 138, 0.14);
        backdrop-filter: blur(18px);
      }

      .footer {
        margin-top: 40px;
        background: linear-gradient(180deg, #f5f0e6 0%, #efe7d9 100%);
        border-top: 1px solid rgba(138, 138, 138, 0.14);
      }

      .nav-dropdown-list,
      .nav-dropdown-list.megamenu,
      .w-dropdown-list {
        border: 1px solid rgba(138, 138, 138, 0.14);
        background-color: rgba(255, 255, 255, 0.97);
        box-shadow: 0 18px 60px rgba(54, 42, 20, 0.12);
      }

      .nav-dropdown-link-line,
      .line-text,
      .line-small-value,
      .footer-bottom-wrapper,
      .top-big-section-wrapper-with-line {
        border-color: rgba(138, 138, 138, 0.24) !important;
      }

      .line-link,
      .line-values {
        background-color: rgba(138, 138, 138, 0.24) !important;
      }

      .services-home-wrapper,
      .collection-item-service,
      .white-info-about-us,
      .form-contact-wrapper {
        border: 1px solid rgba(138, 138, 138, 0.14);
        background-color: rgba(255, 255, 255, 0.92) !important;
        box-shadow: 0 18px 48px rgba(54, 42, 20, 0.1);
      }

      .info-contact-wrapper {
        border: 1px solid rgba(184, 154, 42, 0.14);
        box-shadow: 0 22px 70px rgba(33, 25, 12, 0.18);
      }

      .primary-info-about-us,
      .image-primary-wrapper,
      .contact-wrapper.full-primary {
        background: linear-gradient(135deg, #c6ab45 0%, #b89a2a 60%, #94781b 100%) !important;
        box-shadow: 0 22px 70px rgba(0, 0, 0, 0.24);
      }

      .primary-info-about-us *,
      .image-primary-wrapper *,
      .contact-wrapper.full-primary * {
        color: var(--brand-dark) !important;
      }

      .values-big-wrapper,
      .black-background-team,
      .big-info-about-us {
        border: 1px solid rgba(184, 154, 42, 0.12);
        background: linear-gradient(180deg, rgba(31, 27, 22, 0.96) 0%, rgba(19, 17, 14, 0.96) 100%) !important;
        box-shadow: 0 22px 70px rgba(33, 25, 12, 0.16);
      }

      .values-big-wrapper h1,
      .values-big-wrapper h2,
      .values-big-wrapper h3,
      .values-big-wrapper h4,
      .values-big-wrapper h5,
      .values-big-wrapper h6,
      .black-background-team h1,
      .black-background-team h2,
      .black-background-team h3,
      .black-background-team h4,
      .black-background-team h5,
      .black-background-team h6,
      .big-info-about-us h1,
      .big-info-about-us h2,
      .big-info-about-us h3,
      .big-info-about-us h4,
      .big-info-about-us h5,
      .big-info-about-us h6,
      .home-1-heading,
      .paragraph-banner-home-1,
      .values-banner-home-1 .medium-text {
        color: var(--white) !important;
      }

      .section.banner-home-1 .white-text,
      .section.history-banner .inner-h1,
      .section.history-banner .white-text,
      .section.service-details-banner .inner-h1,
      .section.service-details-banner .white-text,
      .info-contact-wrapper .white-text,
      .values-big-wrapper .white-text,
      .black-background-team .white-text,
      .big-info-about-us .white-text {
        color: var(--white) !important;
      }

      .values-big-wrapper p,
      .info-contact-wrapper p,
      .black-background-team p,
      .big-info-about-us p,
      .values-big-wrapper a,
      .info-contact-wrapper .contact-link,
      .black-background-team a,
      .big-info-about-us a,
      .values-big-wrapper .light-paragraph,
      .info-contact-wrapper .gray-text,
      .black-background-team .gray-text {
        color: rgba(251, 250, 247, 0.8) !important;
      }

      .info-contact-wrapper h1,
      .info-contact-wrapper h2,
      .info-contact-wrapper h3,
      .info-contact-wrapper h4,
      .info-contact-wrapper h5,
      .info-contact-wrapper h6,
      .info-contact-wrapper .icon-contact {
        color: var(--white) !important;
      }

      .info-contact-wrapper .subtitle-text,
      .info-contact-wrapper .subtitle-text.white-text,
      .info-contact-wrapper .contact-link:hover {
        color: var(--primary) !important;
      }

      .service-name,
      .project-name,
      .team-member-text,
      .h2-footer {
        color: var(--black);
      }

      .icon-value-wrap {
        background-color: var(--primary);
      }

      .primary-button,
      .primary-button-black,
      .primary-button-grey,
      .secondary-button,
      .primary-button-without-icon {
        border-color: var(--primary) !important;
        background-color: var(--primary) !important;
        color: var(--brand-dark) !important;
      }

      .primary-button:hover,
      .primary-button-black:hover,
      .primary-button-grey:hover,
      .secondary-button:hover,
      .primary-button-without-icon:hover {
        border-color: var(--primary) !important;
        background-color: var(--brand-dark) !important;
        color: var(--primary) !important;
      }

      .text-field,
      .w-input,
      .w-select,
      textarea {
        border-color: rgba(138, 138, 138, 0.24) !important;
        background-color: rgba(255, 255, 255, 0.92);
        color: var(--black);
      }

      .text-field:focus,
      .w-input:focus,
      .w-select:focus,
      textarea:focus {
        border-color: var(--primary) !important;
      }

      .text-field::placeholder,
      .w-input::placeholder,
      textarea::placeholder {
        color: rgba(111, 102, 92, 0.62);
      }

      .submit-button {
        background-color: var(--primary) !important;
      }

      .submit-button:hover {
        background-color: #c6ab45 !important;
      }

      .icon-linkedin,
      .nav-dropdown-icon,
      .text-block-2 {
        color: var(--primary) !important;
      }

      .image-burger,
      .nav-close-icon {
        filter: none;
      }

      .overlay-background-home {
        z-index: 1;
        background-image: linear-gradient(90deg, rgba(11, 11, 11, 0.42), rgba(11, 11, 11, 0.1));
      }

      .section.banner-home-1 {
        position: relative;
        overflow: hidden;
      }

      .section.banner-home-1 .background-video {
        z-index: 0;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .section.banner-home-1 .background-video > video {
        z-index: 0 !important;
        opacity: 1 !important;
        visibility: visible !important;
        inset: 0 !important;
        object-fit: cover;
        object-position: center center;
      }

      .section.banner-home-1 .content-banner-home-1 {
        z-index: 2;
        position: relative;
      }

      .section.contact-us-banner .inner-h1 {
        color: var(--black) !important;
      }

      .promotion-labels-wrapper-to-remove {
        display: none !important;
      }

      .w-webflow-badge,
      .w-webflow-badge > img,
      .w-webflow-badge * {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
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

      .footer-wrapper {
        gap: 28px !important;
      }

      .footer-links-wrapper.align-bottom {
        align-items: flex-start !important;
        justify-content: flex-start !important;
        gap: 12px;
      }

      .local-footer-social-title {
        margin-bottom: 6px;
      }

      .local-footer-social-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .local-footer-social-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        width: 100%;
        padding: 12px 16px;
        border: 1px solid rgba(138, 138, 138, 0.18);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.74);
        color: var(--black) !important;
        text-decoration: none;
        transition: border-color 180ms ease, transform 180ms ease, background-color 180ms ease;
      }

      .local-footer-social-link:hover {
        border-color: rgba(184, 154, 42, 0.42);
        background: rgba(255, 255, 255, 0.94);
        transform: translateY(-1px);
      }

      .local-footer-social-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .local-footer-social-name {
        font-weight: 600;
        color: var(--black);
      }

      .local-footer-social-tag {
        color: var(--paragraph-gray);
        font-size: 13px;
        line-height: 1.3;
      }

      .local-footer-social-arrow {
        color: var(--primary);
        font-size: 18px;
        line-height: 1;
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

      .services-home-wrapper.local-service-cards .collection-list-services {
        align-items: stretch;
      }

      .services-home-wrapper.local-service-cover-enabled {
        position: relative;
        overflow: hidden;
      }

      .local-services-cover {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
        gap: 24px;
        margin-bottom: 28px;
        padding: 34px 36px;
        border: 1px solid rgba(184, 154, 42, 0.18);
        border-radius: 28px;
        background:
          radial-gradient(circle at top right, rgba(184, 154, 42, 0.18), transparent 34%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(247, 242, 233, 0.94) 100%);
        box-shadow: 0 22px 56px rgba(54, 42, 20, 0.08);
      }

      .local-services-cover-copy {
        max-width: 720px;
      }

      .local-services-cover-kicker {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
        color: var(--primary);
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.02em;
      }

      .local-services-cover-kicker::before {
        content: "";
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--primary);
        box-shadow: 0 0 0 6px rgba(184, 154, 42, 0.12);
      }

      .local-services-cover-title {
        margin: 0;
        font-size: clamp(34px, 4vw, 58px);
        line-height: 1.02;
        letter-spacing: -0.03em;
      }

      .local-services-cover-title span {
        color: var(--primary);
      }

      .local-services-cover-text {
        max-width: 650px;
        margin: 16px 0 0;
        font-size: 18px;
        line-height: 1.7;
        color: var(--paragraph-gray);
      }

      .local-services-cover-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
      }

      .local-services-cover-chip {
        display: inline-flex;
        align-items: center;
        min-height: 38px;
        padding: 9px 16px;
        border: 1px solid rgba(138, 138, 138, 0.18);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        color: var(--black);
        font-size: 14px;
        font-weight: 500;
      }

      .local-services-cover-meta {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 20px;
        min-height: 100%;
        padding: 24px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(29, 26, 22, 0.96) 0%, rgba(20, 18, 15, 0.96) 100%);
        color: var(--white);
        box-shadow: inset 0 0 0 1px rgba(184, 154, 42, 0.12);
      }

      .local-services-cover-meta::after {
        content: "";
        position: absolute;
        inset: auto -48px -56px auto;
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(184, 154, 42, 0.22) 0%, transparent 68%);
        pointer-events: none;
      }

      .local-services-cover-stat {
        position: relative;
        z-index: 1;
      }

      .local-services-cover-stat strong {
        display: block;
        color: var(--white);
        font-size: clamp(34px, 3.6vw, 52px);
        line-height: 1;
        letter-spacing: -0.04em;
      }

      .local-services-cover-stat span {
        display: block;
        margin-top: 10px;
        color: rgba(251, 250, 247, 0.78);
        font-size: 15px;
        line-height: 1.6;
      }

      .local-services-cover-points {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 12px;
      }

      .local-services-cover-point {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(251, 250, 247, 0.92);
        font-size: 14px;
        line-height: 1.45;
      }

      .local-services-cover-point::before {
        content: "";
        width: 8px;
        height: 8px;
        flex: 0 0 auto;
        border-radius: 999px;
        background: var(--primary);
      }

      .services-home-wrapper.local-service-cards .collection-item-service {
        min-height: 100%;
        overflow: hidden;
      }

      .services-home-wrapper.local-service-cards .content-service-wrapper {
        flex: 1 0 228px;
        min-height: 228px;
      }

      .services-home-wrapper.local-service-cards .link-photo-service {
        aspect-ratio: 16 / 10;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: auto !important;
        min-height: 220px;
        line-height: 0;
        background-color: rgba(247, 242, 233, 0.82);
      }

      .services-home-wrapper.local-service-cards .small-image-service {
        display: block;
        width: 100%;
        height: 100% !important;
        max-height: none !important;
        object-fit: contain !important;
        object-position: center center;
      }

      .services-home-wrapper.local-home-service-cards .collection-item-service:last-child {
        display: flex !important;
      }

      .icon-logo.local-brand-mark {
        height: 160px !important;
        max-width: 160px !important;
      }

      @media (max-width: 991px) {
        .local-services-cover {
          grid-template-columns: 1fr;
          padding: 28px;
        }

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
        .local-services-cover {
          margin-bottom: 20px;
          padding: 22px 18px;
          border-radius: 22px;
        }

        .local-services-cover-title {
          font-size: 31px;
        }

        .local-services-cover-text {
          font-size: 16px;
        }

        .local-services-cover-meta {
          padding: 18px;
        }

        .services-home-wrapper.local-service-cards .content-service-wrapper {
          min-height: 0;
          flex-basis: auto;
        }

        .services-home-wrapper.local-service-cards .link-photo-service {
          min-height: 0;
        }

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

    if (allowedExternalHrefPatterns.some((pattern) => pattern.test(rawHref))) {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      anchor.classList.remove("local-only-disabled-link");
      anchor.removeAttribute("aria-disabled");
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

  function customizeFooter() {
    document.querySelectorAll(".footer").forEach((footer) => {
      footer.querySelectorAll(".footer-link").forEach((link) => {
        if (/^about$/i.test((link.textContent || "").trim())) {
          link.textContent = "Hakkımızda";
        }
      });

      const socialWrapper = footer.querySelector(".footer-links-wrapper.align-bottom");
      if (!socialWrapper) {
        return;
      }

      socialWrapper.innerHTML = `
        <h6 class="title-links-footer local-footer-social-title">Sosyal Medya</h6>
        <div class="local-footer-social-list">
          <a href="${instagramUrl}" class="local-footer-social-link">
            <span class="local-footer-social-copy">
              <span class="local-footer-social-name">Instagram</span>
              <span class="local-footer-social-tag">@simseklerferforje</span>
            </span>
            <span class="local-footer-social-arrow">↗</span>
          </a>
          <a href="${facebookUrl}" class="local-footer-social-link">
            <span class="local-footer-social-copy">
              <span class="local-footer-social-name">Facebook</span>
              <span class="local-footer-social-tag">simseklerferforje</span>
            </span>
            <span class="local-footer-social-arrow">↗</span>
          </a>
        </div>
      `;
    });
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

  function normalizeText(value) {
    return (value || "")
      .replace(/İ/g, "I")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function replaceServiceCardImages() {
    document.querySelectorAll(".collection-item-service").forEach((card) => {
      const serviceName = card.querySelector(".service-name");
      const image = card.querySelector("img.small-image-service");
      if (!serviceName || !image) {
        return;
      }

      const normalizedName = normalizeText(serviceName.textContent);
      const replacementSrc = serviceImageReplacements.get(normalizedName);
      if (!replacementSrc) {
        return;
      }

      image.setAttribute("src", replacementSrc);
      image.removeAttribute("srcset");
      image.setAttribute("alt", serviceName.textContent.trim());
    });
  }

  function replaceServiceDetailImages() {
    const replacementSrc = serviceDetailImageReplacements.get(normalizePath(window.location.pathname));
    if (!replacementSrc) {
      return;
    }

    document.querySelectorAll("img.image-banner-details, img.details-image-collection").forEach((image) => {
      image.setAttribute("src", replacementSrc);
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
    });
  }

  function replaceProjectCardImages() {
    document.querySelectorAll(".collection-item, .collection-item-project").forEach((card) => {
      const projectName = card.querySelector(".project-name");
      const image = card.querySelector("img.big-project-photo, img.project-small-photo");
      if (!projectName || !image) {
        return;
      }

      const normalizedName = normalizeText(projectName.textContent);
      const replacementSrc = projectCardImageReplacements.get(normalizedName);
      if (!replacementSrc) {
        return;
      }

      image.setAttribute("src", replacementSrc);
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.setAttribute("alt", projectName.textContent.trim());
    });
  }

  function replaceProjectDetailImages() {
    const replacementSrc = projectDetailImageReplacements.get(normalizePath(window.location.pathname));
    if (!replacementSrc) {
      return;
    }

    const projectTitle = document.querySelector(".project-details .inner-h1")?.textContent?.trim() || "Proje";
    document.querySelectorAll("img.project-image, .project-details .rich-text-style img").forEach((image) => {
      image.setAttribute("src", replacementSrc);
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.setAttribute("alt", projectTitle);
    });
  }

  function appendHomeServiceCards() {
    if (!isHomeLikePath(window.location.pathname)) {
      return;
    }

    const serviceList = document.querySelector(".services-home-wrapper .collection-list-services");
    if (!serviceList || serviceList.dataset.localExtraCards === "true") {
      return;
    }

    const existingServices = new Set(
      Array.from(serviceList.querySelectorAll(".service-name")).map((item) => normalizeText(item.textContent)),
    );

    extraHomeServices.forEach((service) => {
      if (existingServices.has(normalizeText(service.title))) {
        return;
      }

      const card = document.createElement("div");
      card.className = "collection-item-service w-dyn-item";
      card.innerHTML = `
        <div class="content-service-wrapper">
          <a href="${service.href}" class="service-name">${service.title}</a>
          <p>${service.description}</p>
          <div class="link-hover-wrapper mt---10">
            <a href="${service.href}" class="link-with-icon">Detaylar<span class="arrow-link"> </span></a>
            <div class="line-link"></div>
          </div>
        </div>
        <a href="${service.href}" class="link-photo-service w-inline-block">
          <img src="${service.imageSrc}" loading="lazy" alt="${service.title}" class="small-image-service"/>
        </a>
      `;

      serviceList.appendChild(card);
    });

    serviceList.dataset.localExtraCards = "true";
  }

  function enhanceHomeServicesCover() {
    if (!isHomeLikePath(window.location.pathname)) {
      return;
    }

    const servicesWrapper = document.querySelector(".services-home-wrapper");
    const serviceList = servicesWrapper?.querySelector(".collection-list-services");
    if (!servicesWrapper || !serviceList || servicesWrapper.dataset.localCoverEnhanced === "true") {
      return;
    }

    const serviceNames = Array.from(serviceList.querySelectorAll(".service-name"))
      .map((item) => item.textContent?.trim())
      .filter(Boolean);

    const cover = document.createElement("div");
    cover.className = "local-services-cover";
    cover.innerHTML = `
      <div class="local-services-cover-copy">
        <div class="local-services-cover-kicker">Hizmetler</div>
        <h2 class="local-services-cover-title">Ferforje, çelik ve <span>özel üretimde</span> ölçüye uygun çözümler.</h2>
        <p class="local-services-cover-text">
          Villa girişlerinden pergolalara, kapı üretimlerinden BoardeX uygulamalarına kadar her işi aynı atölye disiplini,
          temiz uygulama ve mimariye uygun detay anlayışıyla ele alıyoruz.
        </p>
        <div class="local-services-cover-chips">
          ${serviceNames
            .slice(0, 6)
            .map((name) => `<span class="local-services-cover-chip">${name}</span>`)
            .join("")}
        </div>
      </div>
      <div class="local-services-cover-meta">
        <div class="local-services-cover-stat">
          <strong>${serviceNames.length} ana çözüm</strong>
          <span>Bodrum odaklı üretim, sahaya uygun ölçü alma ve uygulama planıyla ilerliyoruz.</span>
        </div>
        <div class="local-services-cover-points">
          <div class="local-services-cover-point">Ölçüye özel imalat ve temiz montaj yaklaşımı</div>
          <div class="local-services-cover-point">Ferforje, kapı, korkuluk, pergola ve BoardeX kapsaması</div>
          <div class="local-services-cover-point">Villa projelerine uyumlu estetik ve dayanım dengesi</div>
        </div>
      </div>
    `;

    servicesWrapper.classList.add("local-service-cover-enabled");
    servicesWrapper.prepend(cover);
    servicesWrapper.dataset.localCoverEnhanced = "true";
  }

  function restoreHeroVideo() {
    if (!isHomeLikePath(window.location.pathname)) {
      return;
    }

    const video = document.querySelector(".section.banner-home-1 .background-video video");
    if (!video) {
      return;
    }

    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");

    const tryPlay = () => {
      const maybePromise = video.play();
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {});
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("loadeddata", tryPlay, { once: true });
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && video.paused) {
        tryPlay();
      }
    });
  }

  function enhanceHomeServiceCards() {
    const serviceWrappers = document.querySelectorAll(".services-home-wrapper");
    if (!serviceWrappers.length) {
      return;
    }

    serviceWrappers.forEach((servicesWrapper) => {
      servicesWrapper.classList.add("local-service-cards");
    });

    if (isHomeLikePath(window.location.pathname)) {
      serviceWrappers.forEach((servicesWrapper) => {
        servicesWrapper.classList.add("local-home-service-cards");
      });
    }
  }

  function removeWebflowBadge() {
    document.querySelectorAll(".w-webflow-badge").forEach((badge) => {
      badge.remove();
    });
  }

  function watchForInjectedBadges() {
    if (!document.body) {
      return;
    }

    const observer = new MutationObserver(() => {
      removeWebflowBadge();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
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
      { href: "/hakkimizda/", label: "Hakkımızda" },
      { href: "/hizmetler/", label: "Hizmetler" },
      { href: "/projeler/", label: "Projeler" },
      { href: "/sss/", label: "SSS" },
      { href: "/iletisim/", label: "İletişim" },
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
          <a href="/iletisim/" class="primary-button w-inline-block">
            <div>Keşif Planla</div>
            <div class="arrows-button">
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b32a64d16109629c8c8d0_Button%20Arrow.svg" loading="lazy" alt="Top Arrow" class="arrow-button black-arrow"/>
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b3461a12b76a2afb251ff_Arrow%20Botton%202%20Yellow.svg" loading="lazy" alt="Primary Right Arrow" class="arrow-button absolute-arrow"/>
            </div>
          </a>
          <div class="link-hover-wrapper">
            <a href="/projeler/" class="link-with-icon">Projeleri İncele<span class="arrow-link"> </span></a>
            <div class="line-link"></div>
          </div>
        </div>
      </div>
    `;

    projectsSection.before(section);
  }

  function removeUnwantedHomeSections() {
    if (!isHomeLikePath(window.location.pathname)) {
      return;
    }

    document.querySelectorAll("section").forEach((section) => {
      if (section.querySelector(".collection-list-blog, .collection-item-blog, .blog-image-wrapper")) {
        section.remove();
        return;
      }

      if (section.querySelector(".contact-wrapper .values-small-wrapper.center-values")) {
        section.remove();
        return;
      }

      const text = normalizeText(section.textContent || "");
      if (!text) {
        return;
      }

      if (text.includes("faydali icerikler")) {
        section.remove();
        return;
      }

      if (text.includes("biz kimiz") && section.querySelector(".team-member-big-image, .who-we-are-wrapper")) {
        section.remove();
        return;
      }

      if (text.includes("simsekler ferforje ile projenizi planlayin") && section.querySelector(".contact-wrapper")) {
        section.remove();
      }
    });
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

  function normalizeText(value) {
    return (value || "")
      .replace(/Ä°/g, "İ")
      .replace(/Ä±/g, "ı")
      .replace(/Åž/g, "Ş")
      .replace(/ÅŸ/g, "ş")
      .replace(/Ãœ/g, "Ü")
      .replace(/Ã¼/g, "ü")
      .replace(/Ã–/g, "Ö")
      .replace(/Ã¶/g, "ö")
      .replace(/Ã‡/g, "Ç")
      .replace(/Ã§/g, "ç")
      .replace(/Äž/g, "Ğ")
      .replace(/ÄŸ/g, "ğ")
      .replace(/[İIı]/g, "i")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function customizeFooter() {
    document.querySelectorAll(".footer").forEach((footer) => {
      footer.querySelectorAll(".footer-link").forEach((link) => {
        if (/^about$/i.test((link.textContent || "").trim())) {
          link.textContent = "Hakkımızda";
        }
      });

      const socialWrapper = footer.querySelector(".footer-links-wrapper.align-bottom");
      if (!socialWrapper) {
        return;
      }

      socialWrapper.innerHTML = `
        <h6 class="title-links-footer local-footer-social-title">Sosyal Medya</h6>
        <div class="local-footer-social-list">
          <a href="${instagramUrl}" class="local-footer-social-link">
            <span class="local-footer-social-copy">
              <span class="local-footer-social-name">Instagram</span>
              <span class="local-footer-social-tag">@simseklerferforje</span>
            </span>
            <span class="local-footer-social-arrow">↗</span>
          </a>
          <a href="${facebookUrl}" class="local-footer-social-link">
            <span class="local-footer-social-copy">
              <span class="local-footer-social-name">Facebook</span>
              <span class="local-footer-social-tag">simseklerferforje</span>
            </span>
            <span class="local-footer-social-arrow">↗</span>
          </a>
        </div>
      `;
    });
  }

  function simplifyNavigation() {
    const navItems = [
      { href: "/hakkimizda/", label: "Hakkımızda" },
      { href: "/hizmetler/", label: "Hizmetler" },
      { href: "/projeler/", label: "Projeler" },
      { href: "/sss/", label: "SSS" },
      { href: "/iletisim/", label: "İletişim" },
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

  function enhanceHomeServicesCover() {
    if (!isHomeLikePath(window.location.pathname)) {
      return;
    }

    const servicesWrapper = document.querySelector(".services-home-wrapper");
    const serviceList = servicesWrapper?.querySelector(".collection-list-services");
    if (!servicesWrapper || !serviceList || servicesWrapper.dataset.localCoverEnhanced === "true") {
      return;
    }

    const serviceNames = Array.from(serviceList.querySelectorAll(".service-name"))
      .map((item) => item.textContent?.trim())
      .filter(Boolean);

    const cover = document.createElement("div");
    cover.className = "local-services-cover";
    cover.innerHTML = `
      <div class="local-services-cover-copy">
        <div class="local-services-cover-kicker">Hizmetler</div>
        <h2 class="local-services-cover-title">Ferforje, çelik ve <span>özel üretimde</span> ölçüye uygun çözümler.</h2>
        <p class="local-services-cover-text">
          Villa girişlerinden pergolalara, kapı üretimlerinden BoardeX uygulamalarına kadar her işi aynı atölye disiplini,
          temiz uygulama ve mimariye uygun detay anlayışıyla ele alıyoruz.
        </p>
        <div class="local-services-cover-chips">
          ${serviceNames
            .slice(0, 6)
            .map((name) => `<span class="local-services-cover-chip">${name}</span>`)
            .join("")}
        </div>
      </div>
      <div class="local-services-cover-meta">
        <div class="local-services-cover-stat">
          <strong>${serviceNames.length} ana çözüm</strong>
          <span>Bodrum odaklı üretim, sahaya uygun ölçü alma ve uygulama planıyla ilerliyoruz.</span>
        </div>
        <div class="local-services-cover-points">
          <div class="local-services-cover-point">Ölçüye özel imalat ve temiz montaj yaklaşımı</div>
          <div class="local-services-cover-point">Ferforje, kapı, korkuluk, pergola ve BoardeX kapsamı</div>
          <div class="local-services-cover-point">Villa projelerine uyumlu estetik ve dayanım dengesi</div>
        </div>
      </div>
    `;

    servicesWrapper.classList.add("local-service-cover-enabled");
    servicesWrapper.prepend(cover);
    servicesWrapper.dataset.localCoverEnhanced = "true";
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
          <a href="/iletisim/" class="primary-button w-inline-block">
            <div>Keşif Planla</div>
            <div class="arrows-button">
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b32a64d16109629c8c8d0_Button%20Arrow.svg" loading="lazy" alt="Top Arrow" class="arrow-button black-arrow"/>
              <img src="https://cdn.prod.website-files.com/688b105b2269d2924df670a4/688b3461a12b76a2afb251ff_Arrow%20Botton%202%20Yellow.svg" loading="lazy" alt="Primary Right Arrow" class="arrow-button absolute-arrow"/>
            </div>
          </a>
          <div class="link-hover-wrapper">
            <a href="/projeler/" class="link-with-icon">Projeleri İncele<span class="arrow-link"> </span></a>
            <div class="line-link"></div>
          </div>
        </div>
      </div>
    `;

    projectsSection.before(section);
  }

  function localizeContactContent() {
    const currentPath = normalizePath(window.location.pathname);

    if (currentPath === "/iletisim") {
      document.title = "İletişim | Şimşekler Ferforje";
      document
        .querySelectorAll("meta[property='og:title'], meta[property='twitter:title']")
        .forEach((meta) => meta.setAttribute("content", "İletişim | Şimşekler Ferforje"));
    }

    document.querySelectorAll(".section.contact-us-banner .inner-h1").forEach((heading) => {
      heading.innerHTML = "Teklif ve keşif için bize ulaşın.<br/>";
    });

    const contactForm = document.querySelector(".form-block-contact form");
    if (contactForm) {
      const inputConfigs = [
        { id: "contact-first-name", name: "first_name", label: "Ad*", placeholder: "Adınız" },
        { id: "contact-last-name", name: "last_name", label: "Soyad*", placeholder: "Soyadınız" },
        { id: "contact-email", name: "email", label: "E-posta*", placeholder: "ornek@eposta.com" },
        { id: "contact-phone", name: "phone", label: "Telefon*", placeholder: "05xx xxx xx xx" },
      ];

      Array.from(contactForm.querySelectorAll(".text-field-wrap")).forEach((wrap, index) => {
        const config = inputConfigs[index];
        const label = wrap.querySelector(".field-label");
        const input = wrap.querySelector("input");
        if (!config || !label || !input) {
          return;
        }

        label.textContent = config.label;
        label.setAttribute("for", config.id);
        input.id = config.id;
        input.name = config.name;
        input.placeholder = config.placeholder;
      });

      const formSections = Array.from(contactForm.querySelectorAll(".contact-form-wrap"));
      const serviceWrap = formSections[0];
      const messageWrap = formSections[1];

      const serviceLabel = serviceWrap?.querySelector(".field-label");
      const serviceSelect = serviceWrap?.querySelector("select");
      if (serviceLabel && serviceSelect) {
        serviceLabel.textContent = "Hizmet*";
        serviceLabel.setAttribute("for", "contact-service");
        serviceSelect.id = "contact-service";
        serviceSelect.name = "service";
        if (serviceSelect.options[0]) {
          serviceSelect.options[0].textContent = "Hizmet seçin";
        }
      }

      const messageLabel = messageWrap?.querySelector(".field-label");
      const messageField = messageWrap?.querySelector("textarea");
      if (messageLabel && messageField) {
        messageLabel.textContent = "Mesajınız*";
        messageLabel.setAttribute("for", "contact-message");
        messageField.id = "contact-message";
        messageField.name = "message";
        messageField.placeholder = "Projenizi, yaklaşık ölçüleri ve beklentinizi kısaca yazın.";
      }

      const submitButton = contactForm.querySelector("input[type='submit']");
      if (submitButton) {
        submitButton.value = "Talep Gönder";
        submitButton.setAttribute("data-wait", "Gönderiliyor...");
      }
    }

    const infoWrapper = document.querySelector(".info-contact-wrapper");
    if (infoWrapper) {
      const subtitle = infoWrapper.querySelector(".subtitle-text");
      const headings = infoWrapper.querySelectorAll("h3");
      const paragraphs = infoWrapper.querySelectorAll("p");
      const links = infoWrapper.querySelectorAll(".contact-link");

      if (subtitle) {
        subtitle.textContent = "İletişim";
      }

      if (headings[0]) {
        headings[0].textContent = "Ferforje, kapı, çelik ve BoardeX işleriniz için bize yazın.";
      }

      if (paragraphs[0]) {
        paragraphs[0].textContent =
          "En hızlı teklif süreci için mümkünse alanın 2-3 fotoğrafını ve yaklaşık ölçüleri paylaşın. Sonrasında keşif, ölçü ve uygulama planını birlikte netleştirelim.";
      }

      if (headings[1]) {
        headings[1].textContent = "Atölye / Bodrum";
      }

      if (links[0]) {
        links[0].textContent = "6171. Sokak No:28, Bodrum/Muğla";
        links[0].setAttribute("href", "#");
        links[0].classList.add("local-only-disabled-link");
        links[0].setAttribute("aria-disabled", "true");
      }

      if (links[1]) {
        links[1].textContent = "simsek_ferforje@hotmail.com";
        links[1].setAttribute("href", "mailto:simsek_ferforje@hotmail.com");
      }

      if (links[2]) {
        links[2].textContent = "0532 359 53 49";
        links[2].setAttribute("href", "tel:+905323595349");
      }
    }
  }

  function boot() {
    injectStyles();
    removeWebflowBadge();
    watchForInjectedBadges();
    replaceBrandAssets();
    enhanceHomeServiceCards();
    appendHomeServiceCards();
    enhanceHomeServicesCover();
    restoreHeroVideo();
    replaceServiceCardImages();
    replaceServiceDetailImages();
    replaceProjectCardImages();
    replaceProjectDetailImages();
    removeTemplateGraphics();
    simplifyNavigation();
    customizeFooter();
    injectHomeContent();
    localizeContactContent();
    removeUnwantedHomeSections();
    sanitizeAnchors();
    installClickGuard();
    customizeHeaderButtons();
  }

  function customizeHeaderButtons() {
    const wrappers = document.querySelectorAll('.search-shop-con');
    wrappers.forEach(wrapper => {
      wrapper.style.gap = '10px';
      wrapper.style.alignItems = 'center';
      
      const isTablet = wrapper.classList.contains('tablet-button-wrapper');
      // Hide original button text block
      const interestedText = wrapper.querySelector('.text-block-2');
      if (interestedText) interestedText.style.display = 'none';
      
      // Clear current anchor or reuse it
      wrapper.innerHTML = `
        <a href="https://wa.me/905323595349" target="_blank" class="primary-button w-inline-block" style="background-color:#25D366; border-color:#25D366; color:white; padding: 10px 15px; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.36 5.36 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <div style="font-size: 14px; font-weight: 600;">Bize Yazın</div>
        </a>
        <a href="tel:+905323595349" class="primary-button w-inline-block" style="padding: 10px 15px; display:flex; align-items:center; gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <div style="font-size: 14px; font-weight: 600;">Arayın</div>
        </a>
      `;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
