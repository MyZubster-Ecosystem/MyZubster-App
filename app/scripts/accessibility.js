// Accessibility Enhancements
(function() {
  'use strict';
  
  // Inject skip link
  function injectSkipLink() {
    const link = document.createElement('a');
    link.href = '#main-content';
    link.className = 'skip-link';
    link.textContent = 'Skip to main content';
    document.body.insertBefore(link, document.body.firstChild);
  }
  
  // Add ARIA attributes
  function enhanceARIA() {
    // Add role to main content area
    const main = document.querySelector('main') || document.querySelector('.main-content');
    if (main && !main.hasAttribute('role')) {
      main.setAttribute('role', 'main');
      main.setAttribute('id', 'main-content');
      main.setAttribute('tabindex', '-1');
    }
    
    // Enhance navigation
    document.querySelectorAll('nav').forEach(function(nav) {
      if (!nav.hasAttribute('aria-label')) {
        nav.setAttribute('aria-label', 'Main navigation');
      }
    });
    
    // Add aria-labels to buttons without text
    document.querySelectorAll('button:not([aria-label])').forEach(function(btn) {
      if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
        var icon = btn.querySelector('[class*="icon"]');
        if (icon) {
          btn.setAttribute('aria-label', icon.className.replace(/icon-?/, '').replace(/-/g, ' '));
        }
      }
    });
  }
  
  // Keyboard navigation enhancement
  function enhanceKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Escape closes modals
      if (e.key === 'Escape') {
        var modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
        if (modal) {
          var closeBtn = modal.querySelector('[aria-label="Close"], .close-btn');
          if (closeBtn) closeBtn.click();
        }
      }
    });
  }
  
  // Add live region for dynamic updates
  function injectLiveRegion() {
    var region = document.createElement('div');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.id = 'a11y-announcements';
    document.body.appendChild(region);
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    injectSkipLink();
    enhanceARIA();
    enhanceKeyboard();
    injectLiveRegion();
  });
})();
