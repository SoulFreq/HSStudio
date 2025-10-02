(() => {
  const SESSION_KEY = 'hss-session-token';
  const AUTH_EVENT = 'auth:updated';

  const selectors = {
    loginForm: document.querySelector('[data-auth-form="login"]'),
    registerForm: document.querySelector('[data-auth-form="register"]'),
    feedbackNodes: document.querySelectorAll('[data-auth-feedback]'),
    accountName: document.querySelector('[data-account-name]'),
    accountFullName: document.querySelector('[data-account-fullname]'),
    accountEmail: document.querySelector('[data-account-email]'),
    accountCreated: document.querySelector('[data-account-created]'),
    accountLastLogin: document.querySelector('[data-account-last-login]'),
    accountPurchases: document.querySelector('[data-account-purchases]'),
  };

  const setToken = (token) => {
    if (!token) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (error) {
        console.warn('Unable to clear session token', error);
      }
      document.dispatchEvent(new CustomEvent(AUTH_EVENT));
      return;
    }

    try {
      localStorage.setItem(SESSION_KEY, token);
    } catch (error) {
      console.warn('Unable to persist session token', error);
    }
    document.dispatchEvent(new CustomEvent(AUTH_EVENT));
  };

  const getToken = () => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch (error) {
      return null;
    }
  };

  const formatCurrency = (value) => {
    if (!Number.isFinite(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const setFeedback = (form, message, status = 'info') => {
    if (!form) return;
    const node = form.querySelector('[data-auth-feedback]');
    if (!node) return;
    node.textContent = message;
    node.dataset.status = status;
    node.hidden = !message;
  };

  const apiRequest = async (endpoint, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    let payload = null;
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }
    }

    if (!response.ok) {
      const error = new Error(payload?.message || 'Request failed');
      error.status = response.status;
      throw error;
    }

    return payload;
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFeedback(form, 'Signing you in...', 'info');
    const formData = new FormData(form);

    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    })
      .then(({ token }) => {
        setToken(token);
        form.reset();
        setFeedback(form, 'Success! Redirecting to your account...', 'success');
        setTimeout(() => {
          window.location.href = 'account.html';
        }, 600);
      })
      .catch((error) => {
        const message = error.status === 401 ? 'Invalid email or password.' : error.message;
        setFeedback(form, message, 'error');
      });
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setFeedback(form, 'Creating your account...', 'info');
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then(({ token }) => {
        setToken(token);
        form.reset();
        setFeedback(form, 'Account created! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'account.html';
        }, 600);
      })
      .catch((error) => {
        setFeedback(form, error.message, 'error');
      });
  };

  const renderPurchases = (container, purchases = []) => {
    if (!container) return;
    if (!purchases.length) {
      container.innerHTML = "<p class=\"muted\">No purchases yet. Explore the <a href=\"programs.html\">programs &amp; offers</a> when you're ready.</p>";
      return;
    }

    const markup = `
      <ul class="account-purchase-list">
        ${purchases
          .map(
            (purchase) => `
              <li>
                <div class="purchase-head">
                  <strong>${purchase.product_name || 'Studio Offering'}</strong>
                  <span>${formatCurrency(Number(purchase.amount || 0))}</span>
                </div>
                <p class="muted">
                  ${purchase.quantity || 1} × purchased on ${formatDate(purchase.created_at)}
                </p>
              </li>
            `
          )
          .join('')}
      </ul>
    `;

    container.innerHTML = markup;
  };

  const populateAccount = (data) => {
    const { user, purchases = [] } = data || {};
    if (selectors.accountName) {
      selectors.accountName.textContent = user?.full_name ? user.full_name.split(' ')[0] : 'visionary';
    }
    if (selectors.accountFullName) {
      selectors.accountFullName.textContent = user?.full_name || '—';
    }
    if (selectors.accountEmail) {
      selectors.accountEmail.textContent = user?.email || '—';
      selectors.accountEmail.href = user?.email ? `mailto:${user.email}` : '#';
    }
    if (selectors.accountCreated) {
      selectors.accountCreated.textContent = formatDate(user?.created_at);
    }
    if (selectors.accountLastLogin) {
      selectors.accountLastLogin.textContent = formatDate(user?.last_login_at);
    }
    renderPurchases(selectors.accountPurchases, purchases);
  };

  const initAccount = () => {
    if (!selectors.accountPurchases) return;
    const token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    apiRequest('/api/auth/profile')
      .then(populateAccount)
      .catch((error) => {
        if (error.status === 401) {
          setToken(null);
          window.location.href = 'login.html';
        } else {
          console.error('Unable to load profile', error);
          if (selectors.accountPurchases) {
            selectors.accountPurchases.innerHTML = '<p class="muted">Unable to load purchases right now. Please refresh shortly.</p>';
          }
        }
      });
  };

  const init = () => {
    if (selectors.loginForm) {
      selectors.loginForm.addEventListener('submit', handleLogin);
    }
    if (selectors.registerForm) {
      selectors.registerForm.addEventListener('submit', handleRegister);
    }
    initAccount();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
