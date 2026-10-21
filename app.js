// Add production destinations here when the application and company pages are ready.
// Empty URLs keep the landing page's section navigation and unavailable-link states.
const destinations = {
  signup: '',
  plans: { starter: '', professional: '', agency: '' },
  changelog: '', terms: '', privacy: '', twitter: '', instagram: '',
};

document.querySelectorAll('[data-signup]').forEach((link) => {
  const destination = destinations.plans[link.dataset.plan] || destinations.signup;
  if (destination) link.href = destination;
});

document.querySelectorAll('[data-site-link]').forEach((placeholder) => {
  const destination = destinations[placeholder.dataset.siteLink];
  if (!destination) return;
  const link = document.createElement('a');
  link.href = destination;
  link.append(...placeholder.childNodes);
  placeholder.replaceWith(link);
});

const dashboard = document.querySelector('.dashboard');
dashboard.addEventListener('click', () => {
  dashboard.setAttribute('aria-pressed', String(dashboard.getAttribute('aria-pressed') !== 'true'));
});
dashboard.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    dashboard.setAttribute('aria-pressed', 'false');
    dashboard.blur();
  }
});

// The component uses ON_HOVER → CHANGE_TO, Gentle, 1.0220937728881836 s.
// Only the rear planes translate; the front dashboard and its affine transform stay fixed.
// CSS linear() samples approximate the gentle spring instead of using a generic ease-out.
if (CSS.supports('transition-timing-function', 'linear(0, 1)')) {
  const duration = 1.0220937728881836;
  const samples = Array.from({ length: 61 }, (_, index) => {
    const t = duration * index / 60;
    const value = 1 - Math.exp(-7.5 * t) * (Math.cos(Math.sqrt(43.75) * t) + 7.5 / Math.sqrt(43.75) * Math.sin(Math.sqrt(43.75) * t));
    return index === 60 ? '1' : value.toFixed(5);
  });
  dashboard.style.setProperty('--spring', `linear(${samples.join(',')})`);
}

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');
const closeMenu = () => {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('is-open');
};
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) closeMenu();
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.navigation')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuToggle.focus();
  }
});

const faq = document.querySelector('.faq-dialog');
document.querySelectorAll('[data-open-faq]').forEach((button) => button.addEventListener('click', () => faq.showModal()));
faq.querySelector('.dialog-close').addEventListener('click', () => faq.close());
faq.querySelector('[data-close-faq]').addEventListener('click', () => faq.close());
faq.addEventListener('click', (event) => {
  const bounds = faq.getBoundingClientRect();
  if (event.target === faq && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) faq.close();
});
