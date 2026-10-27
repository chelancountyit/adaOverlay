/**
 * ADAOverlay - Standalone Reusable Web Accessibility Overlay Widget for CMSAdmin 2.0
 *
 * Zero-dependency Custom Element (<ada-overlay>) with Shadow DOM encapsulation
 * and global JavaScript API (window.ADAOverlay).
 *
 * Usage:
 *   1. Drop-in Script:
 *      <script src="ada-overlay.js" defer></script>
 *   2. Programmatic JS API:
 *      ADAOverlay.init({ position: 'bottom-right', brandName: 'CMSAdmin 2.0' });
 *      ADAOverlay.open();
 *      ADAOverlay.close();
 *      ADAOverlay.toggle();
 *      ADAOverlay.setProfile('seizure', true);
 *      ADAOverlay.reset();
 */
(function (window, document) {
  'use strict';

  const STORAGE_KEY_DEFAULT = 'cmsadmin2_ada_overlay_state_v1';
  const HOST_STYLE_ID = 'ada-overlay-host-adjustments';

  // Supported UI translations
  const I18N = {
    en: {
      langLabel: 'ENGLISH (US)',
      flag: '🇺🇸',
      title: 'Accessibility Adjustments',
      resetSettings: 'Reset Settings',
      statement: 'Statement',
      hideInterface: 'Hide Interface',
      customizeHeading: 'Customize your browsing experience',
      contentHeading: 'Content Adjustments',
      colorHeading: 'Color Adjustments',
      orientationHeading: 'Orientation Adjustments',
      off: 'OFF',
      on: 'ON',
      defaultLabel: 'Default',
      cancel: 'Cancel',
      footerBy: 'Web Accessibility By',
      learnMore: 'Learn More',
      profiles: {
        seizure: {
          title: 'Seizure Safety',
          desc: 'Reduce motion and visual triggers'
        },
        lowVision: {
          title: 'Low Vision Support',
          desc: 'Improve clarity and contrast'
        },
        adhd: {
          title: 'ADHD Friendly',
          desc: 'Support focus and reduce distractions'
        },
        cognitive: {
          title: 'Reading & Cognitive Support',
          desc: 'Simplify reading and navigation'
        },
        keyboard: {
          title: 'Keyboard Navigation',
          desc: 'Use website with the keyboard'
        },
        screenReader: {
          title: 'Screen Reader Compatibility',
          desc: 'Optimize for screen-readers'
        },
        olderAdults: {
          title: 'Older Adults',
          desc: 'Enhance visibility and reading comfort'
        }
      }
    },
    es: {
      langLabel: 'ESPAÑOL',
      flag: '🇪🇸',
      title: 'Ajustes de Accesibilidad',
      resetSettings: 'Restablecer',
      statement: 'Declaración',
      hideInterface: 'Ocultar Interfaz',
      customizeHeading: 'Personaliza tu experiencia de navegación',
      contentHeading: 'Ajustes de Contenido',
      colorHeading: 'Ajustes de Color',
      orientationHeading: 'Ajustes de Orientación',
      off: 'NO',
      on: 'SÍ',
      defaultLabel: 'Normal',
      cancel: 'Cancelar',
      footerBy: 'Accesibilidad Web Por',
      learnMore: 'Saber Más',
      profiles: {
        seizure: {
          title: 'Perfil Seguro para Epilepsia',
          desc: 'Reduce el movimiento y los destellos visuales'
        },
        lowVision: {
          title: 'Soporte para Baja Visión',
          desc: 'Mejora la claridad y el contraste'
        },
        adhd: {
          title: 'Perfil Amigable para TDAH',
          desc: 'Apoya la concentración y reduce distracciones'
        },
        cognitive: {
          title: 'Soporte Cognitivo y de Lectura',
          desc: 'Simplifica la lectura y la navegación'
        },
        keyboard: {
          title: 'Navegación por Teclado',
          desc: 'Usa el sitio web con el teclado'
        },
        screenReader: {
          title: 'Compatibilidad con Lectores de Pantalla',
          desc: 'Optimiza para lectores de pantalla'
        },
        olderAdults: {
          title: 'Adultos Mayores',
          desc: 'Mejora la visibilidad y comodidad de lectura'
        }
      }
    }
  };

  const COLOR_SWATCHES = [
    { id: '#0056b3', name: 'Blue' },
    { id: '#6f42c1', name: 'Purple' },
    { id: '#d63384', name: 'Magenta' },
    { id: '#dc3545', name: 'Red' },
    { id: '#fd7e14', name: 'Orange' },
    { id: '#198754', name: 'Green' },
    { id: '#0dcaf0', name: 'Cyan' },
    { id: '#111827', name: 'Black' },
    { id: '#ffffff', name: 'White' }
  ];

  function createDefaultState() {
    return {
      lang: 'en',
      profiles: {
        seizure: false,
        lowVision: false,
        adhd: false,
        cognitive: false,
        keyboard: false,
        screenReader: false,
        olderAdults: false
      },
      adjustments: {
        contentScale: 0,       // -20 to +50 (step 10)
        fontSize: 0,           // -20 to +50 (step 10)
        lineHeight: 0,         // 0, 1, 2, 3
        letterSpacing: 0,      // 0, 1, 2, 3
        readableFont: false,
        dyslexiaFont: false,
        highlightTitles: false,
        highlightLinks: false,
        textMagnifier: false,
        textAlign: '',         // '', 'left', 'center', 'right'
        contrastMode: '',      // '', 'dark', 'light', 'high', 'monochrome', 'high-sat', 'low-sat'
        textColor: '',
        titleColor: '',
        bgColor: '',
        muteSounds: false,
        hideImages: false,
        stopAnimations: false,
        readingGuide: false,
        readingMask: false,
        cursorMode: '',        // '', 'white', 'black'
        highlightHover: false,
        highlightFocus: false
      }
    };
  }

  // Feature-detect discrete display transitions (Firefox bug 1882408 safe check)
  let supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
      return false;
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    window.getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = window.getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
  }

  async function closeTopLayer(dialogEl) {
    if (!dialogEl || !dialogEl.open) return;
    if (!supportsTopLayerExit()) {
      dialogEl.setAttribute('data-closing', '');
      const animations = dialogEl.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 350))
        ]);
      }
      if (!dialogEl.hasAttribute('data-closing')) return;
      dialogEl.removeAttribute('data-closing');
    }
    dialogEl.close();
  }

  // Shared Shadow DOM CSSStyleSheet
  const componentSheet = typeof CSSStyleSheet !== 'undefined' ? new CSSStyleSheet() : null;
  const COMPONENT_CSS = `
    :host {
      --ada-navy: #4b6584;
      --ada-navy-dark: #3b526b;
      --ada-navy-light: #5f7d9c;
      --ada-header-bg: #e8eef5;
      --ada-header-text: #2c3e50;
      --ada-header-border: #d5dfec;
      --ada-bg: #f5f7fa;
      --ada-card: #ffffff;
      --ada-text: #2c3e50;
      --ada-muted: #64748b;
      --ada-border: #e2e8f0;
      --ada-accent: #4b6584;
      --ada-focus: #d97706;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.45;
      color: var(--ada-text);
      box-sizing: border-box;
      z-index: 2147483640;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Visually hidden utility for screen readers */
    .visually-hidden:where(:not(:focus-within, :active)) {
      position: absolute !important;
      clip-path: inset(50%) !important;
      overflow: hidden !important;
      width: 1px !important;
      height: 1px !important;
      margin: -1px !important;
      padding: 0 !important;
      border: 0 !important;
      white-space: nowrap !important;
    }

    /* Focus indicator */
    :where(button, select, input, a, [tabindex]):focus-visible {
      outline: 3px solid var(--ada-focus);
      outline-offset: 2px;
    }

    /* Floating Trigger Button (Subtle Slate-Blue) */
    .ada-trigger {
      position: fixed;
      inset-block-end: 22px;
      inset-inline-end: 22px;
      inline-size: 56px;
      block-size: 56px;
      min-inline-size: 48px;
      min-block-size: 48px;
      border-radius: 50%;
      background: var(--ada-navy);
      color: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.92);
      box-shadow: 0 6px 20px rgba(51, 65, 85, 0.25), 0 2px 6px rgba(51, 65, 85, 0.14);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 2147483640;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease;
    }

    :host([data-position="bottom-left"]) .ada-trigger {
      inset-inline-end: auto;
      inset-inline-start: 22px;
    }

    :host([data-position="top-right"]) .ada-trigger {
      inset-block-end: auto;
      inset-block-start: 22px;
    }

    :host([data-position="top-left"]) .ada-trigger {
      inset-block-end: auto;
      inset-block-start: 22px;
      inset-inline-end: auto;
      inset-inline-start: 22px;
    }

    .ada-trigger[hidden] {
      display: none !important;
    }

    .ada-trigger:hover {
      transform: scale(1.06);
      background: var(--ada-navy-light);
      box-shadow: 0 8px 24px rgba(51, 65, 85, 0.32);
    }

    .ada-trigger:active {
      transform: scale(0.97);
    }

    .ada-trigger svg {
      inline-size: 32px;
      block-size: 32px;
    }

    .ada-trigger-badge {
      position: absolute;
      inset-block-start: -2px;
      inset-inline-end: -2px;
      inline-size: 18px;
      block-size: 18px;
      border-radius: 50%;
      background: #10b981;
      color: #ffffff;
      border: 2px solid #ffffff;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
    }

    .ada-trigger[data-has-active="true"] .ada-trigger-badge {
      display: inline-flex;
    }

    /* Native Modal Dialog */
    dialog.ada-dialog {
      position: fixed;
      inset-block-start: 12px;
      inset-block-end: 12px;
      inset-inline-end: 14px;
      inset-inline-start: auto;
      margin: 0;
      padding: 0;
      border: 1px solid var(--ada-header-border);
      border-radius: 18px;
      inline-size: min(445px, calc(100vw - 24px));
      block-size: calc(100dvh - 24px);
      max-block-size: calc(100dvh - 24px);
      background: var(--ada-bg);
      color: var(--ada-text);
      box-shadow: 0 20px 50px rgba(51, 65, 85, 0.22), 0 0 0 1px rgba(148, 163, 184, 0.18);
      overflow: hidden;

      /* Base (closed) state for top-layer transition */
      opacity: 0;
      transform: translateX(24px) scale(0.98);
      transition-property: opacity, transform, display, overlay;
      transition-duration: 0.26s;
      transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      transition-behavior: allow-discrete;
    }

    :host([data-position="bottom-left"]) dialog.ada-dialog,
    :host([data-position="top-left"]) dialog.ada-dialog {
      inset-inline-end: auto;
      inset-inline-start: 14px;
      transform: translateX(-24px) scale(0.98);
    }

    dialog.ada-dialog[open] {
      display: flex;
      flex-direction: column;
    }

    :is(dialog.ada-dialog[open]):where(:not([data-closing])) {
      opacity: 1;
      transform: translateX(0) scale(1);

      @starting-style {
        opacity: 0;
        transform: translateX(24px) scale(0.98);
      }

      &::backdrop {
        background-color: rgba(51, 65, 85, 0.18);

        @starting-style {
          background-color: rgba(51, 65, 85, 0);
        }
      }
    }

    dialog.ada-dialog:modal {
      overscroll-behavior: contain;
    }

    dialog.ada-dialog::backdrop {
      background-color: rgba(51, 65, 85, 0);
      overflow: hidden;
      overscroll-behavior: contain;
      transition-property: background-color, display, overlay;
      transition-duration: 0.26s;
      transition-timing-function: ease-out;
      transition-behavior: allow-discrete;
    }

    @media (prefers-reduced-motion: reduce) {
      dialog.ada-dialog,
      .ada-trigger {
        transform: none !important;
        transition-duration: 0.08s !important;
      }
      @starting-style {
        dialog.ada-dialog[open] {
          transform: none;
        }
      }
    }

    /* Scrollable Panel Container */
    .ada-scroll-area {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
      padding-block-end: 20px;
    }

    /* Subtle Soft Header Section */
    .ada-header {
      background: var(--ada-header-bg);
      color: var(--ada-header-text);
      padding: 14px 18px 20px;
      border-block-end: 1px solid var(--ada-header-border);
      margin-block-end: 14px;
      position: relative;
    }

    .ada-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-block-end: 6px;
    }

    .ada-close-btn {
      background: transparent;
      border: none;
      color: var(--ada-header-text);
      min-inline-size: 32px;
      min-block-size: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 4px;
      opacity: 0.85;
      transition: opacity 0.15s, background-color 0.15s;
    }

    .ada-close-btn:hover {
      opacity: 1;
      background: rgba(75, 101, 132, 0.12);
    }

    .ada-lang-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .ada-lang-btn {
      background: #ffffff;
      border: 1px solid var(--ada-header-border);
      color: var(--ada-header-text);
      border-radius: 999px;
      padding: 4px 11px;
      min-block-size: 28px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .ada-lang-btn:hover {
      background: #f8fafc;
      border-color: #b8c7da;
    }

    .ada-title {
      margin: 4px 0 14px;
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--ada-header-text);
    }

    .ada-pill-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ada-action-pill {
      background: #ffffff;
      color: var(--ada-header-text);
      border: 1px solid var(--ada-header-border);
      border-radius: 999px;
      padding: 7px 14px;
      min-block-size: 34px;
      font-size: 13px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      transition: transform 0.12s ease, background-color 0.15s ease, border-color 0.15s ease;
    }

    .ada-action-pill:hover {
      background: #f8fafc;
      border-color: #b8c7da;
      transform: translateY(-1px);
    }

    .ada-action-pill svg {
      inline-size: 15px;
      block-size: 15px;
      flex-shrink: 0;
      color: var(--ada-navy);
    }

    .ada-chip {
      background: #f1f5f9;
      color: var(--ada-navy);
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 5px 11px;
      min-block-size: 28px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s, color 0.15s;
    }

    .ada-chip:hover {
      background: var(--ada-navy);
      color: #ffffff;
      border-color: var(--ada-navy);
    }

    /* Section White Cards */
    .ada-card {
      margin: 0 14px 14px;
      background: var(--ada-card);
      border: 1px solid #e6ecf5;
      border-radius: 16px;
      padding: 18px 18px 10px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .ada-card-heading {
      margin: 0 0 12px;
      font-size: 16px;
      font-weight: 500;
      color: var(--ada-text);
    }

    /* Profile List Rows (Matches Screenshot 1 layout with subtle tones) */
    .ada-profile-list {
      display: flex;
      flex-direction: column;
    }

    .ada-profile-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 13px 0;
      border-block-end: 1px solid #eef2f6;
      position: relative;
    }

    .ada-profile-row:last-child {
      border-block-end: none;
    }

    /* Chain link icon between Keyboard Navigation and Screen Reader Compatibility */
    .ada-profile-row[data-profile="keyboard"]::after {
      content: "";
      position: absolute;
      inset-block-end: -11px;
      inset-inline-start: 50%;
      transform: translateX(-50%);
      inline-size: 26px;
      block-size: 20px;
      background-color: #ffffff;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234b6584' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      z-index: 1;
    }

    /* OFF / ON Dual Pill Switch */
    .ada-switch {
      position: relative;
      inline-size: 86px;
      block-size: 36px;
      min-block-size: 36px;
      border-radius: 999px;
      background: #eef2f6;
      border: 1px solid #dce4ee;
      padding: 3px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      cursor: pointer;
      flex-shrink: 0;
      user-select: none;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }

    .ada-switch[aria-checked="true"] {
      background: var(--ada-navy);
      border-color: var(--ada-navy);
    }

    .ada-switch-thumb {
      position: absolute;
      inset-block-start: 3px;
      inset-inline-start: 3px;
      inline-size: 40px;
      block-size: 28px;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.14);
      transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .ada-switch[aria-checked="true"] .ada-switch-thumb {
      transform: translateX(38px);
    }

    .ada-switch-label {
      position: relative;
      z-index: 1;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.03em;
      transition: color 0.18s ease;
    }

    .ada-switch .ada-lbl-off {
      color: var(--ada-text);
    }

    .ada-switch .ada-lbl-on {
      color: #64748b;
    }

    .ada-switch[aria-checked="true"] .ada-lbl-off {
      color: rgba(255, 255, 255, 0.82);
    }

    .ada-switch[aria-checked="true"] .ada-lbl-on {
      color: var(--ada-navy);
    }

    .ada-profile-info {
      flex: 1 1 auto;
      min-inline-size: 0;
    }

    .ada-profile-title {
      display: block;
      font-size: 14.5px;
      font-weight: 600;
      color: var(--ada-text);
      margin-block-end: 2px;
    }

    .ada-profile-desc {
      display: block;
      font-size: 12.5px;
      color: var(--ada-muted);
    }

    .ada-profile-icon {
      inline-size: 34px;
      block-size: 34px;
      border-radius: 50%;
      background: #eef2f6;
      color: var(--ada-navy);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background-color 0.2s, color 0.2s;
    }

    .ada-profile-row[data-active="true"] .ada-profile-icon {
      background: var(--ada-navy);
      color: #ffffff;
    }

    .ada-profile-icon svg {
      inline-size: 18px;
      block-size: 18px;
    }

    /* Granular Adjustment Grids & Steppers */
    .ada-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-block-end: 10px;
    }

    .ada-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-block-end: 10px;
    }

    .ada-tile {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 10px;
      min-block-size: 74px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-align: center;
      color: var(--ada-text);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ada-tile:hover {
      border-color: #b0c2d6;
      background: #f1f5f9;
    }

    .ada-tile[aria-pressed="true"] {
      background: #e3edf7;
      color: #27374d;
      border-color: var(--ada-navy);
      box-shadow: 0 2px 8px rgba(75, 101, 132, 0.15);
    }

    .ada-tile svg {
      inline-size: 22px;
      block-size: 22px;
      color: var(--ada-navy);
    }

    /* Stepper Box */
    .ada-stepper-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 12px;
      margin-block-end: 10px;
    }

    .ada-stepper-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      color: var(--ada-text);
      margin-block-end: 8px;
    }

    .ada-stepper-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      padding: 3px;
    }

    .ada-step-btn {
      inline-size: 32px;
      block-size: 32px;
      border-radius: 50%;
      border: none;
      background: var(--ada-navy);
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ada-step-btn:hover {
      background: var(--ada-navy-light);
    }

    .ada-step-val {
      font-size: 13px;
      font-weight: 600;
      color: var(--ada-navy);
    }

    /* Color Swatch Picker Box */
    .ada-color-box {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      margin-block-end: 10px;
    }

    .ada-color-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      margin-block-end: 8px;
    }

    .ada-color-reset {
      background: transparent;
      border: none;
      color: var(--ada-muted);
      font-size: 12px;
      text-decoration: underline;
      cursor: pointer;
      padding: 2px 4px;
    }

    .ada-swatches {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ada-swatch {
      inline-size: 26px;
      block-size: 26px;
      border-radius: 50%;
      border: 2px solid #cbd5e1;
      cursor: pointer;
      padding: 0;
      transition: transform 0.12s ease;
    }

    .ada-swatch:hover {
      transform: scale(1.15);
    }

    .ada-swatch[aria-pressed="true"] {
      outline: 3px solid var(--ada-navy);
      outline-offset: 2px;
      transform: scale(1.12);
    }

    /* Statement Sub-View inside Panel */
    .ada-statement-panel {
      margin: 0 14px 14px;
      background: #ffffff;
      border-radius: 16px;
      padding: 18px;
      border: 1.5px solid #cbd5e1;
      display: none;
    }

    .ada-statement-panel[data-open="true"] {
      display: block;
    }

    .ada-statement-panel h3 {
      margin: 0 0 8px;
      font-size: 16px;
      color: var(--ada-navy);
    }

    .ada-statement-panel p {
      margin: 0 0 10px;
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
    }

    /* Auxiliary Overlays in Shadow DOM (Reading Guide, Reading Mask, Text Magnifier) */
    .ada-reading-guide {
      position: fixed;
      inset-inline: 0;
      block-size: 14px;
      background: #fde047;
      border-block: 3px solid #1d2b44;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483635;
      display: none;
      transform: translateY(-50%);
    }

    .ada-reading-guide[data-active="true"] {
      display: block;
    }

    .ada-reading-mask-top,
    .ada-reading-mask-bottom {
      position: fixed;
      inset-inline: 0;
      background: rgba(15, 23, 42, 0.72);
      pointer-events: none;
      z-index: 2147483634;
      display: none;
    }

    .ada-reading-mask-top {
      inset-block-start: 0;
      border-block-end: 3px solid #38bdf8;
    }

    .ada-reading-mask-bottom {
      inset-block-end: 0;
      border-block-start: 3px solid #38bdf8;
    }

    .ada-reading-mask-top[data-active="true"],
    .ada-reading-mask-bottom[data-active="true"] {
      display: block;
    }

    .ada-magnifier-tooltip {
      position: fixed;
      max-inline-size: min(420px, 90vw);
      background: #111827;
      color: #ffffff;
      border: 2px solid #fde047;
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 24px;
      font-weight: 600;
      line-height: 1.35;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      pointer-events: none;
      z-index: 2147483638;
      display: none;
    }

    .ada-magnifier-tooltip[data-active="true"] {
      display: block;
    }
  `;

  if (componentSheet) {
    componentSheet.replaceSync(COMPONENT_CSS);
  }

  // Define template once at module scope and clone per instance (per shadow-dom guide)
  const overlayTemplate = document.createElement('template');
  overlayTemplate.innerHTML = `
    <!-- Floating Trigger Icon (Matches Screenshot 2) -->
    <button type="button" class="ada-trigger" part="trigger" aria-label="Accessibility Adjustments (Alt+1)">
      <span class="ada-trigger-badge" aria-hidden="true">✓</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="4.75" r="2.25" fill="currentColor"/>
        <path d="M5.5 8.75C8.5 9.25 15.5 9.25 18.5 8.75" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M12 9.25V14.25" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M12 14L8.75 20.25" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M12 14L15.25 20.25" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Auxiliary Viewport Tools (Reading Guide, Reading Mask, Text Magnifier) -->
    <div class="ada-reading-guide" aria-hidden="true"></div>
    <div class="ada-reading-mask-top" aria-hidden="true"></div>
    <div class="ada-reading-mask-bottom" aria-hidden="true"></div>
    <div class="ada-magnifier-tooltip" aria-hidden="true"></div>

    <!-- Native Modal Dialog (No redundant role="dialog" or aria-modal per dialog guide) -->
    <dialog class="ada-dialog" closedby="any" aria-labelledby="ada-dialog-title">
      <div class="ada-scroll-area">
        <!-- Dark Navy Header -->
        <header class="ada-header">
          <div class="ada-topbar">
            <button type="button" class="ada-close-btn" data-action="close" aria-label="Close Accessibility Adjustments" autofocus>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            <div class="ada-lang-wrap">
              <button type="button" class="ada-lang-btn" data-action="toggle-lang" aria-label="Switch interface language">
                <span data-i18n="flag" aria-hidden="true">🇺🇸</span>
                <span data-i18n="langLabel">ENGLISH (US)</span>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
          </div>

          <h1 id="ada-dialog-title" class="ada-title" data-i18n="title">Accessibility Adjustments</h1>

          <div class="ada-pill-actions">
            <button type="button" class="ada-action-pill" data-action="reset">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 2l4 4-4 4"/>
                <path d="M3 11v-1a4 4 0 0 1 4-4h14"/>
                <path d="M7 22l-4-4 4-4"/>
                <path d="M21 13v1a4 4 0 0 1-4 4H3"/>
              </svg>
              <span data-i18n="resetSettings">Reset Settings</span>
            </button>

            <button type="button" class="ada-action-pill" data-action="statement" aria-expanded="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="12" rx="2"/>
                <path d="M8 20h8M12 16v4"/>
              </svg>
              <span data-i18n="statement">Statement</span>
            </button>

            <button type="button" class="ada-action-pill" data-action="hide-interface">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <path d="M1 1l22 22"/>
              </svg>
              <span data-i18n="hideInterface">Hide Interface</span>
            </button>
          </div>
        </header>

        <!-- Accessibility Statement Collapsible Panel -->
        <section class="ada-statement-panel" aria-label="Accessibility Statement">
          <h3>Accessibility Statement</h3>
          <p>
            <strong class="ada-stmt-org">CMSAdmin 2.0</strong> is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant WCAG 2.1 / 2.2 Level AA standards.
          </p>
          <p>
            <strong>Keyboard Shortcuts:</strong> Press <kbd>Alt + 1</kbd> at any time to open or close this Accessibility Adjustments panel, or <kbd>Esc</kbd> to dismiss it.
          </p>
          <button type="button" class="ada-chip" data-action="close-statement">Close Statement</button>
        </section>

        <!-- Card 1: Customize your browsing experience (7 Profiles from Screenshot 1) -->
        <section class="ada-card" aria-labelledby="ada-profiles-heading">
          <h2 id="ada-profiles-heading" class="ada-card-heading" data-i18n="customizeHeading">Customize your browsing experience</h2>

          <div class="ada-profile-list">
            <!-- 1. Seizure Safety -->
            <div class="ada-profile-row" data-profile="seizure" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="seizure" aria-labelledby="prof-title-seizure" aria-describedby="prof-desc-seizure">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-seizure" class="ada-profile-title">Seizure Safety</span>
                <span id="prof-desc-seizure" class="ada-profile-desc">Reduce motion and visual triggers</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </span>
            </div>

            <!-- 2. Low Vision Support -->
            <div class="ada-profile-row" data-profile="lowVision" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="lowVision" aria-labelledby="prof-title-lowVision" aria-describedby="prof-desc-lowVision">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-lowVision" class="ada-profile-title">Low Vision Support</span>
                <span id="prof-desc-lowVision" class="ada-profile-desc">Improve clarity and contrast</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </span>
            </div>

            <!-- 3. ADHD Friendly -->
            <div class="ada-profile-row" data-profile="adhd" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="adhd" aria-labelledby="prof-title-adhd" aria-describedby="prof-desc-adhd">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-adhd" class="ada-profile-title">ADHD Friendly</span>
                <span id="prof-desc-adhd" class="ada-profile-desc">Support focus and reduce distractions</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="3" y1="14" x2="21" y2="14"/>
                </svg>
              </span>
            </div>

            <!-- 4. Reading & Cognitive Support -->
            <div class="ada-profile-row" data-profile="cognitive" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="cognitive" aria-labelledby="prof-title-cognitive" aria-describedby="prof-desc-cognitive">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-cognitive" class="ada-profile-title">Reading &amp; Cognitive Support</span>
                <span id="prof-desc-cognitive" class="ada-profile-desc">Simplify reading and navigation</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="7"/>
                  <circle cx="12" cy="12" r="2"/>
                  <line x1="12" y1="2" x2="12" y2="5"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="5" y2="12"/>
                  <line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
              </span>
            </div>

            <!-- 5. Keyboard Navigation -->
            <div class="ada-profile-row" data-profile="keyboard" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="keyboard" aria-labelledby="prof-title-keyboard" aria-describedby="prof-desc-keyboard">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-keyboard" class="ada-profile-title">Keyboard Navigation</span>
                <span id="prof-desc-keyboard" class="ada-profile-desc">Use website with the keyboard</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="5" y1="12" x2="16" y2="12"/>
                  <polyline points="12 8 16 12 12 16"/>
                  <line x1="19" y1="6" x2="19" y2="18"/>
                </svg>
              </span>
            </div>

            <!-- 6. Screen Reader Compatibility -->
            <div class="ada-profile-row" data-profile="screenReader" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="screenReader" aria-labelledby="prof-title-screenReader" aria-describedby="prof-desc-screenReader">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-screenReader" class="ada-profile-title">Screen Reader Compatibility</span>
                <span id="prof-desc-screenReader" class="ada-profile-desc">Optimize for screen-readers</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <line x1="4" y1="10" x2="4" y2="14"/>
                  <line x1="8" y1="7" x2="8" y2="17"/>
                  <line x1="12" y1="4" x2="12" y2="20"/>
                  <line x1="16" y1="7" x2="16" y2="17"/>
                  <line x1="20" y1="10" x2="20" y2="14"/>
                </svg>
              </span>
            </div>

            <!-- 7. Older Adults -->
            <div class="ada-profile-row" data-profile="olderAdults" data-active="false">
              <button type="button" role="switch" aria-checked="false" class="ada-switch" data-profile-toggle="olderAdults" aria-labelledby="prof-title-olderAdults" aria-describedby="prof-desc-olderAdults">
                <span class="ada-switch-thumb" aria-hidden="true"></span>
                <span class="ada-switch-label ada-lbl-off" aria-hidden="true" data-i18n="off">OFF</span>
                <span class="ada-switch-label ada-lbl-on" aria-hidden="true" data-i18n="on">ON</span>
              </button>
              <div class="ada-profile-info">
                <span id="prof-title-olderAdults" class="ada-profile-title">Older Adults</span>
                <span id="prof-desc-olderAdults" class="ada-profile-desc">Enhance visibility and reading comfort</span>
              </div>
              <span class="ada-profile-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="6.5" cy="15.5" r="3.5"/>
                  <circle cx="17.5" cy="15.5" r="3.5"/>
                  <path d="M10 15.5h4"/>
                  <path d="M3 15.5L5 7"/>
                  <path d="M21 15.5L19 7"/>
                </svg>
              </span>
            </div>
          </div>
        </section>

        <!-- Card 2: Content Adjustments -->
        <section class="ada-card" aria-labelledby="ada-content-heading">
          <h2 id="ada-content-heading" class="ada-card-heading" data-i18n="contentHeading">Content Adjustments</h2>

          <!-- Content Scaling Stepper -->
          <div class="ada-stepper-box">
            <div class="ada-stepper-header">
              <span>Content Scaling</span>
              <span data-scale-display="contentScale">Default</span>
            </div>
            <div class="ada-stepper-controls">
              <button type="button" class="ada-step-btn" data-step="contentScale" data-dir="-10" aria-label="Decrease Content Scaling">−</button>
              <span class="ada-step-val" data-scale-val="contentScale">Default</span>
              <button type="button" class="ada-step-btn" data-step="contentScale" data-dir="10" aria-label="Increase Content Scaling">+</button>
            </div>
          </div>

          <div class="ada-grid-2">
            <button type="button" class="ada-tile" data-toggle-adj="readableFont" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="4 7 4 4 20 4 20 7"/>
                <line x1="9" y1="20" x2="15" y2="20"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
              <span>Readable Font</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="dyslexiaFont" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/>
                <path d="M8 10h8M8 14h5"/>
              </svg>
              <span>Dyslexia Friendly</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="highlightTitles" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 4v16M18 4v16M6 12h12"/>
              </svg>
              <span>Highlight Titles</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="highlightLinks" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>Highlight Links</span>
            </button>
          </div>

          <div class="ada-stepper-box">
            <div class="ada-stepper-header">
              <span>Adjust Font Sizing</span>
              <span data-scale-display="fontSize">Default</span>
            </div>
            <div class="ada-stepper-controls">
              <button type="button" class="ada-step-btn" data-step="fontSize" data-dir="-10" aria-label="Decrease Font Size">−</button>
              <span class="ada-step-val" data-scale-val="fontSize">Default</span>
              <button type="button" class="ada-step-btn" data-step="fontSize" data-dir="10" aria-label="Increase Font Size">+</button>
            </div>
          </div>

          <div class="ada-grid-2">
            <div class="ada-stepper-box" style="margin-block-end:0;">
              <div class="ada-stepper-header">
                <span>Line Height</span>
              </div>
              <div class="ada-stepper-controls">
                <button type="button" class="ada-step-btn" data-step="lineHeight" data-dir="-1" aria-label="Decrease Line Height">−</button>
                <span class="ada-step-val" data-scale-val="lineHeight">Default</span>
                <button type="button" class="ada-step-btn" data-step="lineHeight" data-dir="1" aria-label="Increase Line Height">+</button>
              </div>
            </div>

            <div class="ada-stepper-box" style="margin-block-end:0;">
              <div class="ada-stepper-header">
                <span>Letter Spacing</span>
              </div>
              <div class="ada-stepper-controls">
                <button type="button" class="ada-step-btn" data-step="letterSpacing" data-dir="-1" aria-label="Decrease Letter Spacing">−</button>
                <span class="ada-step-val" data-scale-val="letterSpacing">Default</span>
                <button type="button" class="ada-step-btn" data-step="letterSpacing" data-dir="1" aria-label="Increase Letter Spacing">+</button>
              </div>
            </div>
          </div>

          <div class="ada-grid-3" style="margin-block-start: 10px;">
            <button type="button" class="ada-tile" data-align="left" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
              </svg>
              <span>Align Left</span>
            </button>
            <button type="button" class="ada-tile" data-align="center" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>
              </svg>
              <span>Align Center</span>
            </button>
            <button type="button" class="ada-tile" data-align="right" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
              </svg>
              <span>Align Right</span>
            </button>
          </div>

          <button type="button" class="ada-tile" style="inline-size: 100%; min-block-size: 56px; flex-direction: row; gap: 10px;" data-toggle-adj="textMagnifier" aria-pressed="false">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <span>Text Magnifier (Hover over text to zoom)</span>
          </button>
        </section>

        <!-- Card 3: Color Adjustments -->
        <section class="ada-card" aria-labelledby="ada-color-heading">
          <h2 id="ada-color-heading" class="ada-card-heading" data-i18n="colorHeading">Color Adjustments</h2>

          <div class="ada-grid-3">
            <button type="button" class="ada-tile" data-contrast="dark" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span>Dark Contrast</span>
            </button>

            <button type="button" class="ada-tile" data-contrast="light" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
              <span>Light Contrast</span>
            </button>

            <button type="button" class="ada-tile" data-contrast="high" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 3v18"/>
              </svg>
              <span>High Contrast</span>
            </button>

            <button type="button" class="ada-tile" data-contrast="high-sat" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
              <span>High Saturation</span>
            </button>

            <button type="button" class="ada-tile" data-contrast="low-sat" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" opacity="0.55"/>
              </svg>
              <span>Low Saturation</span>
            </button>

            <button type="button" class="ada-tile" data-contrast="monochrome" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
              </svg>
              <span>Monochrome</span>
            </button>
          </div>

          <div class="ada-color-box" data-color-group="textColor">
            <div class="ada-color-header">
              <span>Adjust Text Colors</span>
              <button type="button" class="ada-color-reset" data-color-clear="textColor" data-i18n="cancel">Cancel</button>
            </div>
            <div class="ada-swatches" data-swatch-target="textColor"></div>
          </div>

          <div class="ada-color-box" data-color-group="titleColor">
            <div class="ada-color-header">
              <span>Adjust Title Colors</span>
              <button type="button" class="ada-color-reset" data-color-clear="titleColor" data-i18n="cancel">Cancel</button>
            </div>
            <div class="ada-swatches" data-swatch-target="titleColor"></div>
          </div>

          <div class="ada-color-box" data-color-group="bgColor">
            <div class="ada-color-header">
              <span>Adjust Background Colors</span>
              <button type="button" class="ada-color-reset" data-color-clear="bgColor" data-i18n="cancel">Cancel</button>
            </div>
            <div class="ada-swatches" data-swatch-target="bgColor"></div>
          </div>
        </section>

        <!-- Card 4: Orientation Adjustments -->
        <section class="ada-card" aria-labelledby="ada-orientation-heading">
          <h2 id="ada-orientation-heading" class="ada-card-heading" data-i18n="orientationHeading">Orientation Adjustments</h2>

          <div class="ada-grid-2">
            <button type="button" class="ada-tile" data-toggle-adj="readingGuide" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="2" y1="12" x2="22" y2="12"/>
                <polyline points="9 8 12 5 15 8"/>
                <polyline points="9 16 12 19 15 16"/>
              </svg>
              <span>Reading Guide</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="readingMask" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="3" y1="14" x2="21" y2="14"/>
              </svg>
              <span>Reading Mask</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="stopAnimations" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"/>
                <rect x="9" y="9" width="2.5" height="6" fill="currentColor"/>
                <rect x="12.5" y="9" width="2.5" height="6" fill="currentColor"/>
              </svg>
              <span>Stop Animations</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="hideImages" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="3" x2="21" y2="21"/>
              </svg>
              <span>Hide Images</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="muteSounds" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
              <span>Mute Sounds</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="highlightFocus" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>Highlight Focus</span>
            </button>

            <button type="button" class="ada-tile" data-toggle-adj="highlightHover" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke-dasharray="4 2"/>
              </svg>
              <span>Highlight Hover</span>
            </button>

            <button type="button" class="ada-tile" data-cursor="white" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 3l14 9-6 1.5L10 20 5 3z"/>
              </svg>
              <span>Big White Cursor</span>
            </button>

            <button type="button" class="ada-tile" style="grid-column: span 2;" data-cursor="black" aria-pressed="false">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3l14 9-6 1.5L10 20 5 3z"/>
              </svg>
              <span>Big Black Cursor</span>
            </button>
          </div>
        </section>

        <!-- Polite Live Region for Screen Reader Announcements -->
        <div class="visually-hidden" aria-live="polite" aria-atomic="true" id="ada-live-announcer"></div>
      </div>
    </dialog>
  `;

  // Big cursor SVG data URIs
  const BIG_WHITE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M8 4L38 25L23 28L28 42L21 44L16 30L8 37Z' fill='%23ffffff' stroke='%23000000' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") 6 4, auto`;
  const BIG_BLACK_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M8 4L38 25L23 28L28 42L21 44L16 30L8 37Z' fill='%23111827' stroke='%23ffffff' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") 6 4, auto`;

  class ADAOverlayElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open', delegatesFocus: true });
      if (componentSheet && 'adoptedStyleSheets' in this.shadowRoot) {
        this.shadowRoot.adoptedStyleSheets = [componentSheet];
      } else {
        const styleEl = document.createElement('style');
        styleEl.textContent = COMPONENT_CSS;
        this.shadowRoot.appendChild(styleEl);
      }
      // Deep-clone template per shadow-dom best practices
      this.shadowRoot.append(overlayTemplate.content.cloneNode(true));

      this.config = {
        position: 'bottom-right',
        showTrigger: true,
        accentColor: '#4b6584',
        brandName: 'CMSAdmin 2.0',
        organization: 'CMSAdmin 2.0',
        storageKey: STORAGE_KEY_DEFAULT
      };

      this.state = createDefaultState();
      this.pointerY = window.innerHeight / 2;

      this._onPointerMove = this._onPointerMove.bind(this);
      this._onGlobalKeydown = this._onGlobalKeydown.bind(this);
      this._onDocumentMouseOver = this._onDocumentMouseOver.bind(this);
    }

    connectedCallback() {
      this._renderColorSwatches();
      this._loadState();
      this._bindEvents();
      this._applyConfigAttributes();
      this._syncAll();
    }

    disconnectedCallback() {
      window.removeEventListener('pointermove', this._onPointerMove);
      window.removeEventListener('keydown', this._onGlobalKeydown);
      document.removeEventListener('mouseover', this._onDocumentMouseOver);
    }

    configure(options = {}) {
      this.config = Object.assign({}, this.config, options);
      if (this.config.position) {
        this.setAttribute('data-position', this.config.position);
      }
      if (this.config.accentColor) {
        this.style.setProperty('--ada-navy', this.config.accentColor);
      }
      const triggerBtn = this.shadowRoot.querySelector('.ada-trigger');
      if (triggerBtn) {
        triggerBtn.hidden = !this.config.showTrigger;
      }
      const brandEl = this.shadowRoot.querySelector('.ada-brand-name');
      if (brandEl && this.config.brandName) {
        brandEl.textContent = `✓ ${this.config.brandName}`;
      }
      const orgEl = this.shadowRoot.querySelector('.ada-stmt-org');
      if (orgEl && (this.config.organization || this.config.brandName)) {
        orgEl.textContent = this.config.organization || this.config.brandName;
      }
    }

    _applyConfigAttributes() {
      const pos = this.getAttribute('position') || this.getAttribute('data-position');
      const brand = this.getAttribute('brand-name');
      const color = this.getAttribute('accent-color');
      const hideTrigger = this.hasAttribute('hide-trigger');
      const opts = {};
      if (pos) opts.position = pos;
      if (brand) opts.brandName = brand;
      if (color) opts.accentColor = color;
      if (hideTrigger) opts.showTrigger = false;
      this.configure(opts);
    }

    _renderColorSwatches() {
      const containers = this.shadowRoot.querySelectorAll('[data-swatch-target]');
      containers.forEach((container) => {
        const targetKey = container.getAttribute('data-swatch-target');
        container.innerHTML = '';
        COLOR_SWATCHES.forEach((swatch) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ada-swatch';
          btn.style.backgroundColor = swatch.id;
          btn.setAttribute('data-color-key', targetKey);
          btn.setAttribute('data-color-val', swatch.id);
          btn.setAttribute('aria-label', `${swatch.name} (${targetKey})`);
          btn.setAttribute('aria-pressed', 'false');
          container.appendChild(btn);
        });
      });
    }

    _bindEvents() {
      const dialog = this.shadowRoot.querySelector('dialog.ada-dialog');
      const trigger = this.shadowRoot.querySelector('.ada-trigger');

      trigger.addEventListener('click', () => this.open());

      // Intercept cancel (Esc / closedby) to animate out smoothly
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        this.close();
      });

      dialog.addEventListener('close', () => {
        dialog.returnValue = '';
      });

      // Fallback for browsers where <dialog closedby="any"> is not natively supported
      if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
        const outside = (e, dlg) => {
          const r = dlg.getBoundingClientRect();
          return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
        };
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => {
          pressedOutside = outside(e, dialog);
        });
        dialog.addEventListener('pointerup', (e) => {
          if (pressedOutside && outside(e, dialog)) {
            this.close();
          }
        });
      }

      // Delegated clicks inside Shadow Root
      this.shadowRoot.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Top actions
        const action = btn.getAttribute('data-action');
        if (action === 'close') {
          this.close();
          return;
        }
        if (action === 'reset') {
          this.reset();
          return;
        }
        if (action === 'toggle-lang') {
          this.state.lang = this.state.lang === 'en' ? 'es' : 'en';
          this._syncAll();
          this.announce(this.state.lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English');
          return;
        }
        if (action === 'statement') {
          const panel = this.shadowRoot.querySelector('.ada-statement-panel');
          const isOpen = panel.getAttribute('data-open') === 'true';
          panel.setAttribute('data-open', String(!isOpen));
          btn.setAttribute('aria-expanded', String(!isOpen));
          if (!isOpen) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }
        if (action === 'close-statement') {
          const panel = this.shadowRoot.querySelector('.ada-statement-panel');
          panel.setAttribute('data-open', 'false');
          return;
        }
        if (action === 'hide-interface') {
          this.close();
          trigger.hidden = true;
          return;
        }

        // Profile switches
        const profileKey = btn.getAttribute('data-profile-toggle');
        if (profileKey) {
          const nextVal = !this.state.profiles[profileKey];
          this.setProfile(profileKey, nextVal);
          return;
        }

        // Boolean adjustment tiles
        const adjKey = btn.getAttribute('data-toggle-adj');
        if (adjKey) {
          this.state.adjustments[adjKey] = !this.state.adjustments[adjKey];
          if (adjKey === 'readableFont' && this.state.adjustments.readableFont) {
            this.state.adjustments.dyslexiaFont = false;
          } else if (adjKey === 'dyslexiaFont' && this.state.adjustments.dyslexiaFont) {
            this.state.adjustments.readableFont = false;
          }
          this._syncAll();
          this.announce(`${adjKey} ${this.state.adjustments[adjKey] ? 'enabled' : 'disabled'}`);
          return;
        }

        // Stepper buttons
        const stepKey = btn.getAttribute('data-step');
        if (stepKey) {
          const dir = Number(btn.getAttribute('data-dir') || 0);
          if (stepKey === 'contentScale' || stepKey === 'fontSize') {
            const next = Math.max(-20, Math.min(50, this.state.adjustments[stepKey] + dir));
            this.state.adjustments[stepKey] = next;
          } else {
            const next = Math.max(0, Math.min(3, this.state.adjustments[stepKey] + dir));
            this.state.adjustments[stepKey] = next;
          }
          this._syncAll();
          return;
        }

        // Text alignment tiles
        const alignVal = btn.getAttribute('data-align');
        if (alignVal) {
          this.state.adjustments.textAlign = this.state.adjustments.textAlign === alignVal ? '' : alignVal;
          this._syncAll();
          return;
        }

        // Contrast mode tiles
        const contrastVal = btn.getAttribute('data-contrast');
        if (contrastVal) {
          this.state.adjustments.contrastMode =
            this.state.adjustments.contrastMode === contrastVal ? '' : contrastVal;
          this._syncAll();
          return;
        }

        // Color swatches
        const colorKey = btn.getAttribute('data-color-key');
        if (colorKey) {
          const colorVal = btn.getAttribute('data-color-val');
          this.state.adjustments[colorKey] =
            this.state.adjustments[colorKey] === colorVal ? '' : colorVal;
          this._syncAll();
          return;
        }

        // Clear color swatch
        const clearKey = btn.getAttribute('data-color-clear');
        if (clearKey) {
          this.state.adjustments[clearKey] = '';
          this._syncAll();
          return;
        }

        // Cursor mode tiles
        const cursorVal = btn.getAttribute('data-cursor');
        if (cursorVal) {
          this.state.adjustments.cursorMode =
            this.state.adjustments.cursorMode === cursorVal ? '' : cursorVal;
          this._syncAll();
        }
      });

      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('keydown', this._onGlobalKeydown);
      document.addEventListener('mouseover', this._onDocumentMouseOver, { passive: true });
    }

    setProfile(profileKey, enabled) {
      if (!(profileKey in this.state.profiles)) return;
      this.state.profiles[profileKey] = Boolean(enabled);

      // Keyboard Navigation and Screen Reader Compatibility are linked (as indicated by the chain icon)
      if (profileKey === 'keyboard' || profileKey === 'screenReader') {
        this.state.profiles.keyboard = Boolean(enabled);
        this.state.profiles.screenReader = Boolean(enabled);
      }

      this._recomputeProfileAdjustments(profileKey, Boolean(enabled));
      this._syncAll();

      const dict = I18N[this.state.lang] || I18N.en;
      const label = dict.profiles[profileKey]?.title || profileKey;
      this.announce(`${label} ${enabled ? 'enabled' : 'disabled'}`);
    }

    _recomputeProfileAdjustments(changedProfile, isEnabled) {
      const adj = this.state.adjustments;
      const p = this.state.profiles;

      if (changedProfile === 'seizure') {
        adj.stopAnimations = isEnabled || p.adhd;
        adj.contrastMode = isEnabled ? 'low-sat' : (adj.contrastMode === 'low-sat' ? '' : adj.contrastMode);
      } else if (changedProfile === 'lowVision') {
        adj.contentScale = isEnabled ? 20 : (p.olderAdults ? 20 : 0);
        adj.contrastMode = isEnabled ? 'high-sat' : (adj.contrastMode === 'high-sat' ? '' : adj.contrastMode);
        adj.readableFont = isEnabled || p.cognitive || p.olderAdults;
        adj.cursorMode = isEnabled ? 'white' : (p.olderAdults ? 'white' : '');
      } else if (changedProfile === 'adhd') {
        adj.readingMask = isEnabled;
        adj.stopAnimations = isEnabled || p.seizure;
      } else if (changedProfile === 'cognitive') {
        adj.highlightTitles = isEnabled;
        adj.highlightLinks = isEnabled || p.olderAdults;
        adj.readableFont = isEnabled || p.lowVision || p.olderAdults;
        adj.lineHeight = isEnabled ? 1 : 0;
      } else if (changedProfile === 'keyboard' || changedProfile === 'screenReader') {
        adj.highlightFocus = isEnabled;
        if (isEnabled) this._enhanceHostScreenReaderAttributes();
      } else if (changedProfile === 'olderAdults') {
        adj.fontSize = isEnabled ? 20 : 0;
        adj.readableFont = isEnabled || p.lowVision || p.cognitive;
        adj.highlightLinks = isEnabled || p.cognitive;
        adj.cursorMode = isEnabled ? 'white' : (p.lowVision ? 'white' : '');
      }
    }

    _enhanceHostScreenReaderAttributes() {
      // Non-destructively ensure images without alt or links without labels get helpful attributes
      document.querySelectorAll('img:not([alt])').forEach((img) => {
        img.setAttribute('alt', '');
      });
    }

    _onPointerMove(e) {
      this.pointerY = e.clientY;
      this._updateViewportGuides(e.clientY);
    }

    _updateViewportGuides(clientY) {
      const guide = this.shadowRoot.querySelector('.ada-reading-guide');
      const maskTop = this.shadowRoot.querySelector('.ada-reading-mask-top');
      const maskBottom = this.shadowRoot.querySelector('.ada-reading-mask-bottom');

      if (this.state.adjustments.readingGuide && guide) {
        guide.style.insetBlockStart = `${clientY}px`;
      }

      if (this.state.adjustments.readingMask && maskTop && maskBottom) {
        const slitHalf = 55;
        const topHeight = Math.max(0, clientY - slitHalf);
        const bottomHeight = Math.max(0, window.innerHeight - (clientY + slitHalf));
        maskTop.style.blockSize = `${topHeight}px`;
        maskBottom.style.blockSize = `${bottomHeight}px`;
      }
    }

    _onDocumentMouseOver(e) {
      const tooltip = this.shadowRoot.querySelector('.ada-magnifier-tooltip');
      if (!tooltip) return;
      if (!this.state.adjustments.textMagnifier) {
        tooltip.setAttribute('data-active', 'false');
        return;
      }
      const target = e.target;
      if (!target || target === this || this.contains(target)) {
        tooltip.setAttribute('data-active', 'false');
        return;
      }
      const text = (target.innerText || target.textContent || '').trim();
      if (text && text.length > 1 && text.length <= 260 && target.children.length <= 3) {
        tooltip.textContent = text;
        const x = Math.min(window.innerWidth - 340, Math.max(16, e.clientX + 18));
        const y = Math.min(window.innerHeight - 120, Math.max(16, e.clientY + 24));
        tooltip.style.insetInlineStart = `${x}px`;
        tooltip.style.insetBlockStart = `${y}px`;
        tooltip.setAttribute('data-active', 'true');
      } else {
        tooltip.setAttribute('data-active', 'false');
      }
    }

    _onGlobalKeydown(e) {
      // Alt + 1 or Alt + A toggles the Accessibility Overlay
      if (e.altKey && (e.key === '1' || e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        this.toggle();
      }
    }

    open() {
      const dialog = this.shadowRoot.querySelector('dialog.ada-dialog');
      const trigger = this.shadowRoot.querySelector('.ada-trigger');
      if (trigger && this.config.showTrigger) {
        trigger.hidden = false;
      }
      if (dialog && !dialog.open) {
        dialog.removeAttribute('data-closing');
        dialog.showModal();
      }
    }

    close() {
      const dialog = this.shadowRoot.querySelector('dialog.ada-dialog');
      if (dialog && dialog.open) {
        closeTopLayer(dialog);
      }
    }

    toggle() {
      const dialog = this.shadowRoot.querySelector('dialog.ada-dialog');
      if (dialog && dialog.open) {
        this.close();
      } else {
        this.open();
      }
    }

    reset() {
      const currentLang = this.state.lang;
      this.state = createDefaultState();
      this.state.lang = currentLang;
      this._syncAll();
      this.announce('All accessibility settings reset to default.');
    }

    announce(message) {
      const live = this.shadowRoot.querySelector('#ada-live-announcer');
      if (live) {
        live.textContent = '';
        setTimeout(() => {
          live.textContent = message;
        }, 40);
      }
    }

    _syncAll() {
      this._syncLanguageUI();
      this._syncControlsUI();
      this._applyHostDocumentStyles();
      this._saveState();
    }

    _syncLanguageUI() {
      const dict = I18N[this.state.lang] || I18N.en;
      this.shadowRoot.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          el.textContent = dict[key];
        }
      });

      Object.keys(dict.profiles).forEach((profKey) => {
        const titleEl = this.shadowRoot.querySelector(`#prof-title-${profKey}`);
        const descEl = this.shadowRoot.querySelector(`#prof-desc-${profKey}`);
        if (titleEl) titleEl.textContent = dict.profiles[profKey].title;
        if (descEl) descEl.textContent = dict.profiles[profKey].desc;
      });
    }

    _syncControlsUI() {
      const { profiles, adjustments } = this.state;
      const dict = I18N[this.state.lang] || I18N.en;

      // Sync Profile Switches
      Object.keys(profiles).forEach((key) => {
        const active = Boolean(profiles[key]);
        const row = this.shadowRoot.querySelector(`.ada-profile-row[data-profile="${key}"]`);
        const btn = this.shadowRoot.querySelector(`[data-profile-toggle="${key}"]`);
        if (row) row.setAttribute('data-active', String(active));
        if (btn) btn.setAttribute('aria-checked', String(active));
      });

      // Sync Boolean Tiles
      this.shadowRoot.querySelectorAll('[data-toggle-adj]').forEach((btn) => {
        const key = btn.getAttribute('data-toggle-adj');
        btn.setAttribute('aria-pressed', String(Boolean(adjustments[key])));
      });

      // Sync Steppers
      ['contentScale', 'fontSize', 'lineHeight', 'letterSpacing'].forEach((key) => {
        const val = adjustments[key];
        const label =
          val === 0
            ? dict.defaultLabel
            : key === 'contentScale' || key === 'fontSize'
            ? `${val > 0 ? '+' : ''}${val}%`
            : `Level ${val}`;
        this.shadowRoot.querySelectorAll(`[data-scale-val="${key}"], [data-scale-display="${key}"]`).forEach((el) => {
          el.textContent = label;
        });
      });

      // Sync Alignment
      this.shadowRoot.querySelectorAll('[data-align]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-align') === adjustments.textAlign));
      });

      // Sync Contrast
      this.shadowRoot.querySelectorAll('[data-contrast]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-contrast') === adjustments.contrastMode));
      });

      // Sync Color Swatches
      this.shadowRoot.querySelectorAll('[data-color-key]').forEach((btn) => {
        const key = btn.getAttribute('data-color-key');
        const val = btn.getAttribute('data-color-val');
        btn.setAttribute('aria-pressed', String(adjustments[key] === val));
      });

      // Sync Cursors
      this.shadowRoot.querySelectorAll('[data-cursor]').forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-cursor') === adjustments.cursorMode));
      });

      // Sync Viewport Reading Guide & Mask
      const guide = this.shadowRoot.querySelector('.ada-reading-guide');
      const maskTop = this.shadowRoot.querySelector('.ada-reading-mask-top');
      const maskBottom = this.shadowRoot.querySelector('.ada-reading-mask-bottom');
      if (guide) guide.setAttribute('data-active', String(Boolean(adjustments.readingGuide)));
      if (maskTop) maskTop.setAttribute('data-active', String(Boolean(adjustments.readingMask)));
      if (maskBottom) maskBottom.setAttribute('data-active', String(Boolean(adjustments.readingMask)));
      this._updateViewportGuides(this.pointerY);

      // Sync Mute Sounds on host page media
      document.querySelectorAll('audio, video').forEach((media) => {
        media.muted = Boolean(adjustments.muteSounds);
        if (adjustments.stopAnimations && !media.paused) {
          try {
            media.pause();
          } catch (_) {}
        }
      });

      // Check if any setting is active to display badge on trigger button
      const anyProfileActive = Object.values(profiles).some(Boolean);
      const anyAdjActive = Object.entries(adjustments).some(([, v]) => Boolean(v));
      const trigger = this.shadowRoot.querySelector('.ada-trigger');
      if (trigger) {
        trigger.setAttribute('data-has-active', String(anyProfileActive || anyAdjActive));
      }
    }

    _applyHostDocumentStyles() {
      const adj = this.state.adjustments;
      let styleEl = document.getElementById(HOST_STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = HOST_STYLE_ID;
        document.head.appendChild(styleEl);
      }

      const rules = [];

      // Content Scaling (zoom on body content excluding <ada-overlay>)
      if (adj.contentScale !== 0) {
        const scaleFactor = 1 + adj.contentScale / 100;
        rules.push(`
          body > :not(ada-overlay) {
            zoom: ${scaleFactor};
          }
        `);
      }

      // Font Sizing
      if (adj.fontSize !== 0) {
        const pct = 100 + adj.fontSize;
        rules.push(`
          html {
            font-size: ${pct}% !important;
          }
          body > :not(ada-overlay) :is(p, li, a, span, td, th, label, input, button, blockquote) {
            font-size: ${pct}% !important;
          }
        `);
      }

      // Line Height
      if (adj.lineHeight > 0) {
        const lh = (1.5 + adj.lineHeight * 0.35).toFixed(2);
        rules.push(`
          body > :not(ada-overlay) * {
            line-height: ${lh} !important;
          }
        `);
      }

      // Letter Spacing
      if (adj.letterSpacing > 0) {
        const ls = (adj.letterSpacing * 0.06).toFixed(2);
        rules.push(`
          body > :not(ada-overlay) * {
            letter-spacing: ${ls}em !important;
            word-spacing: ${(adj.letterSpacing * 0.12).toFixed(2)}em !important;
          }
        `);
      }

      // Readable Font
      if (adj.readableFont) {
        rules.push(`
          body > :not(ada-overlay),
          body > :not(ada-overlay) * {
            font-family: Verdana, Tahoma, "Segoe UI", Arial, sans-serif !important;
          }
        `);
      }

      // Dyslexia Friendly Font
      if (adj.dyslexiaFont) {
        rules.push(`
          body > :not(ada-overlay),
          body > :not(ada-overlay) * {
            font-family: "Comic Sans MS", "Trebuchet MS", Verdana, sans-serif !important;
            letter-spacing: 0.04em !important;
            word-spacing: 0.1em !important;
          }
        `);
      }

      // Highlight Titles
      if (adj.highlightTitles) {
        rules.push(`
          body > :not(ada-overlay) :is(h1, h2, h3, h4, h5, h6, [role="heading"]) {
            outline: 3px solid #0284c7 !important;
            outline-offset: 3px !important;
            background-color: rgba(224, 242, 254, 0.85) !important;
            color: #0f172a !important;
            border-radius: 4px !important;
          }
        `);
      }

      // Highlight Links
      if (adj.highlightLinks) {
        rules.push(`
          body > :not(ada-overlay) a[href] {
            text-decoration: underline 3px solid #d97706 !important;
            text-underline-offset: 4px !important;
            background-color: #fef3c7 !important;
            color: #111827 !important;
            font-weight: 700 !important;
            padding-inline: 3px !important;
            border-radius: 3px !important;
          }
        `);
      }

      // Text Align
      if (adj.textAlign) {
        rules.push(`
          body > :not(ada-overlay) :is(p, li, h1, h2, h3, h4, h5, h6, div, section, article, td, th) {
            text-align: ${adj.textAlign} !important;
          }
        `);
      }

      // Contrast & Saturation Modes
      if (adj.contrastMode === 'dark') {
        rules.push(`
          body,
          body > :not(ada-overlay) :is(main, section, article, header, footer, nav, aside, div) {
            background-color: #0f172a !important;
            color: #f8fafc !important;
            border-color: #334155 !important;
          }
          body > :not(ada-overlay) :is(h1, h2, h3, h4, h5, h6, p, li, span, label, td, th) {
            color: #f8fafc !important;
          }
          body > :not(ada-overlay) a[href] {
            color: #38bdf8 !important;
          }
        `);
      } else if (adj.contrastMode === 'light') {
        rules.push(`
          body,
          body > :not(ada-overlay) :is(main, section, article, header, footer, nav, aside, div) {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border-color: #94a3b8 !important;
          }
          body > :not(ada-overlay) :is(h1, h2, h3, h4, h5, h6, p, li, span, label, td, th) {
            color: #0f172a !important;
          }
          body > :not(ada-overlay) a[href] {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
        `);
      } else if (adj.contrastMode === 'high') {
        rules.push(`
          body,
          body > :not(ada-overlay) :is(main, section, article, header, footer, nav, aside, div) {
            background-color: #000000 !important;
            color: #ffff00 !important;
            border-color: #ffff00 !important;
          }
          body > :not(ada-overlay) :is(h1, h2, h3, h4, h5, h6, p, li, span, label, td, th) {
            color: #ffff00 !important;
          }
          body > :not(ada-overlay) a[href],
          body > :not(ada-overlay) button {
            color: #00ffff !important;
            text-decoration: underline !important;
          }
        `);
      } else if (adj.contrastMode === 'monochrome') {
        rules.push(`
          body > :not(ada-overlay) {
            filter: grayscale(100%) !important;
          }
        `);
      } else if (adj.contrastMode === 'high-sat') {
        rules.push(`
          body > :not(ada-overlay) {
            filter: saturate(185%) !important;
          }
        `);
      } else if (adj.contrastMode === 'low-sat') {
        rules.push(`
          body > :not(ada-overlay) {
            filter: saturate(45%) !important;
          }
        `);
      }

      // Custom Color Pickers
      if (adj.textColor) {
        rules.push(`
          body > :not(ada-overlay) :is(p, li, span, td, th, label, div) {
            color: ${adj.textColor} !important;
          }
        `);
      }
      if (adj.titleColor) {
        rules.push(`
          body > :not(ada-overlay) :is(h1, h2, h3, h4, h5, h6, [role="heading"]) {
            color: ${adj.titleColor} !important;
          }
        `);
      }
      if (adj.bgColor) {
        rules.push(`
          body,
          body > :not(ada-overlay) :is(main, section, article, div, header, footer) {
            background-color: ${adj.bgColor} !important;
          }
        `);
      }

      // Stop Animations
      if (adj.stopAnimations) {
        rules.push(`
          body > :not(ada-overlay),
          body > :not(ada-overlay) *,
          body > :not(ada-overlay) *::before,
          body > :not(ada-overlay) *::after {
            animation-play-state: paused !important;
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
            scroll-behavior: auto !important;
          }
        `);
      }

      // Hide Images
      if (adj.hideImages) {
        rules.push(`
          body > :not(ada-overlay) :is(img, picture, svg:not(.keep-visible), video, canvas) {
            opacity: 0 !important;
            visibility: hidden !important;
          }
          body > :not(ada-overlay) * {
            background-image: none !important;
          }
        `);
      }

      // Highlight Focus
      if (adj.highlightFocus) {
        rules.push(`
          body > :not(ada-overlay) *:focus,
          body > :not(ada-overlay) *:focus-visible {
            outline: 4px solid #ff6b00 !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 0 6px rgba(255, 107, 0, 0.25) !important;
          }
        `);
      }

      // Highlight Hover
      if (adj.highlightHover) {
        rules.push(`
          body > :not(ada-overlay) :is(a, button, p, h1, h2, h3, h4, li, input, select):hover {
            outline: 3px solid #2563eb !important;
            outline-offset: 2px !important;
          }
        `);
      }

      // Big White / Black Cursor
      if (adj.cursorMode === 'white') {
        rules.push(`
          html, body, body * {
            cursor: ${BIG_WHITE_CURSOR} !important;
          }
        `);
      } else if (adj.cursorMode === 'black') {
        rules.push(`
          html, body, body * {
            cursor: ${BIG_BLACK_CURSOR} !important;
          }
        `);
      }

      styleEl.textContent = rules.join('\n');
    }

    _saveState() {
      try {
        window.localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
      } catch (_) {}
    }

    _loadState() {
      try {
        const raw = window.localStorage.getItem(this.config.storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.lang) this.state.lang = parsed.lang;
          if (parsed.profiles) Object.assign(this.state.profiles, parsed.profiles);
          if (parsed.adjustments) Object.assign(this.state.adjustments, parsed.adjustments);
        }
      } catch (_) {}
    }
  }

  if (typeof customElements !== 'undefined' && !customElements.get('ada-overlay')) {
    customElements.define('ada-overlay', ADAOverlayElement);
  }

  // Singleton helper & Global JavaScript API for CMSAdmin 2.0
  function ensureInstance(options) {
    let el = document.querySelector('ada-overlay');
    if (!el) {
      el = document.createElement('ada-overlay');
      if (document.body) {
        document.body.appendChild(el);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (!document.querySelector('ada-overlay')) {
            document.body.appendChild(el);
          }
        });
      }
    }
    if (options) {
      el.configure(options);
    }
    return el;
  }

  const ADAOverlayAPI = {
    init(options = {}) {
      return ensureInstance(options);
    },
    open(options) {
      const inst = ensureInstance(options);
      inst.open();
      return inst;
    },
    close() {
      const inst = ensureInstance();
      inst.close();
      return inst;
    },
    toggle() {
      const inst = ensureInstance();
      inst.toggle();
      return inst;
    },
    setProfile(profileKey, enabled = true) {
      const inst = ensureInstance();
      inst.setProfile(profileKey, enabled);
      return inst;
    },
    reset() {
      const inst = ensureInstance();
      inst.reset();
      return inst;
    },
    getState() {
      const inst = ensureInstance();
      return JSON.parse(JSON.stringify(inst.state));
    }
  };

  window.ADAOverlay = ADAOverlayAPI;

  // Auto-mount on load unless data-manual-init is set on the script tag
  const currentScript = document.currentScript;
  const shouldAutoInit = !currentScript || !currentScript.hasAttribute('data-manual-init');
  if (shouldAutoInit) {
    const boot = () => {
      const scriptOpts = {};
      if (currentScript) {
        if (currentScript.dataset.position) scriptOpts.position = currentScript.dataset.position;
        if (currentScript.dataset.brand) scriptOpts.brandName = currentScript.dataset.brand;
        if (currentScript.dataset.color) scriptOpts.accentColor = currentScript.dataset.color;
        if (currentScript.dataset.showTrigger === 'false') scriptOpts.showTrigger = false;
      }
      ensureInstance(scriptOpts);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(window, document);

