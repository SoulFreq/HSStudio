const SESSION_KEY = 'hss-session-token';

const initAnimations = () => {
  const animated = document.querySelectorAll('[data-animate]');
  if (!animated.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animated.forEach((element) => element.classList.add('is-visible'));
    return;
  }

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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setState(false);
    }
  });
};

const getSessionToken = () => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch (error) {
    return null;
  }
};

const syncAuthNav = () => {
  const authed = Boolean(getSessionToken());
  document.querySelectorAll('[data-auth]').forEach((element) => {
    const state = element.dataset.auth;
    const show = (state === 'auth' && authed) || (state === 'guest' && !authed);
    element.hidden = !show;
    element.setAttribute('aria-hidden', String(!show));
  });
};

const handleLogout = (event) => {
  event.preventDefault();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear session token', error);
  }
  document.dispatchEvent(new CustomEvent('auth:updated'));
  window.location.href = 'index.html';
};

const initAuthNav = () => {
  syncAuthNav();

  document.querySelectorAll('[data-action="logout"]').forEach((node) => {
    node.addEventListener('click', handleLogout);
  });

  document.addEventListener('auth:updated', syncAuthNav);
  window.addEventListener('storage', (event) => {
    if (event.key === SESSION_KEY) {
      syncAuthNav();
    }
  });
};

const initFooterYear = () => {
  const yearNode = document.querySelector('[data-year]');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }
};

const insertFeedback = (form, message) => {
  const existing = form.querySelector('.form-feedback');
  if (existing) existing.remove();

  form.insertAdjacentHTML('beforeend', `<span class="form-feedback">${message}</span>`);

  setTimeout(() => {
    const feedback = form.querySelector('.form-feedback');
    if (feedback) feedback.remove();
  }, 4000);
};

const initForms = () => {
  const forms = document.querySelectorAll('.cta-form');
  if (forms.length) {
    forms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        // TODO: Connect to Neon DB-backed API endpoint or email service.
        console.log('Captured opt-in submission:', payload);
        form.reset();
        insertFeedback(form, 'We\'ll be in touch with a curated drop soon.');
      });
    });
  }

  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const payload = Object.fromEntries(formData.entries());
      // TODO: Replace with API call that stores inquiries in Neon DB.
      console.log('Captured contact inquiry:', payload);
      contactForm.reset();
      insertFeedback(contactForm, 'Application received. The studio will reply within 72 hours.');
    });
  }
};

window.addEventListener('DOMContentLoaded', () => {
  initAnimations();
  initNavToggle();
  initAuthNav();
  initFooterYear();
  initForms();
});
