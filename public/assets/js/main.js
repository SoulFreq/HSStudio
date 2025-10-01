const initAnimations = () => {
  const animated = document.querySelectorAll('[data-animate]');
  if (!animated.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  animated.forEach((element) => observer.observe(element));
};

const initNavToggle = () => {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-links');
  if (!toggle || !menu) return;

  const setState = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    menu.dataset.open = expanded ? 'true' : 'false';
  };

  toggle.addEventListener('click', () => {
    const nextState = toggle.getAttribute('aria-expanded') !== 'true';
    setState(nextState);
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setState(false));
  });

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && event.target !== toggle) {
      setState(false);
    }
  });
};

const initFooterYear = () => {
  const yearNode = document.querySelector('[data-year]');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }
};

const initNewsletterForm = () => {
  const form = document.querySelector('.cta-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    // TODO: Connect to Neon DB-backed API endpoint.
    console.log('Captured email for waitlist:', email);
    form.reset();
    form.insertAdjacentHTML(
      'beforeend',
      '<span class="form-feedback">We\'ll be in touch with a curated drop soon.</span>'
    );
    setTimeout(() => {
      const feedback = form.querySelector('.form-feedback');
      if (feedback) feedback.remove();
    }, 3500);
  });
};

window.addEventListener('DOMContentLoaded', () => {
  initAnimations();
  initNavToggle();
  initFooterYear();
  initNewsletterForm();
});
