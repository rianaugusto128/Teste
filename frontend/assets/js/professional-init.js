(function () {
  function enhanceCards() {
    document.querySelectorAll('.product-card, .category-card, .pet-card, section.bg-white, div.bg-white').forEach(el => {
      if (!el.classList.contains('pz-hover-lift') && !el.closest('#petzillaSupportWidget')) {
        el.classList.add('pz-hover-lift');
      }
    });
  }

  function enhanceNav() {
    document.querySelectorAll('header a, header button').forEach(el => {
      el.classList.add('focus-visible:ring-4', 'focus-visible:ring-teal-100');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceCards();
    enhanceNav();
  });
})();
