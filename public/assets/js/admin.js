(() => {
  const STORAGE_KEY = 'hss-admin-token';
  const AUTH_HEADER = 'Authorization';

  const state = {
    token: null,
    users: [],
    products: [],
    stats: null,
    editingUserId: null,
    editingProductId: null,
    addingUser: false,
    addingProduct: false,
  };

  const selectors = {
    pageShell: document.querySelector('[data-admin-content]'),
    logout: document.querySelector('[data-admin-logout]'),
    tabs: document.querySelectorAll('.admin-tab'),
    panels: document.querySelectorAll('.admin-panel'),
    usersBody: document.querySelector('[data-users-body]'),
    productsBody: document.querySelector('[data-products-body]'),
    statsProductsBody: document.querySelector('[data-stats-products]'),
    statsUsers: document.querySelector('[data-stat-users]'),
    statsPurchases: document.querySelector('[data-stat-purchases]'),
    statsRevenue: document.querySelector('[data-stat-revenue]'),
    statsGrid: document.querySelector('[data-stats-grid]'),
    toast: document.querySelector('[data-admin-toast]'),
    gate: document.querySelector('[data-admin-gate]'),
    gateForm: document.querySelector('[data-admin-gate-form]'),
    gateCancel: document.querySelector('[data-admin-gate-cancel]'),
    addUserButton: document.querySelector('[data-action="start-add-user"]'),
    addProductButton: document.querySelector('[data-action="start-add-product"]'),
  };

  const formatCurrency = (value) => {
    const number = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(number)) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
  };

  const escapeHtml = (value = '') =>
    value
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatDate = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return '';
    }
  };

  const formatStatusLabel = (value) => {
    if (!value) return 'Draft';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const renderStatusChip = (status = 'draft') => {
    const allowed = new Set(['draft', 'published', 'archived']);
    const safeStatus = allowed.has(status) ? status : 'draft';
    return `<span class="status-chip status-${safeStatus}">${formatStatusLabel(safeStatus)}</span>`;
  };

  const setYear = () => {
    const yearNode = document.querySelector('[data-year]');
    if (yearNode) {
      yearNode.textContent = new Date().getFullYear();
    }
  };

  const showToast = (message, status = 'info', duration = 2600) => {
    const { toast } = selectors;
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.status = status;
    toast.hidden = false;

    if (toast.timeoutId) {
      window.clearTimeout(toast.timeoutId);
    }

    toast.timeoutId = window.setTimeout(() => {
      toast.hidden = true;
    }, duration);
  };

  const showGate = (message) => {
    const { gate, pageShell, gateForm } = selectors;
    if (gate) {
      gate.hidden = false;
      gate.classList.remove('is-hidden');
      if (message) {
        showToast(message, 'error', 4000);
      }
    }
    if (pageShell) {
      pageShell.inert = true;
      pageShell.setAttribute('aria-hidden', 'true');
    }
    if (gateForm) {
      gateForm.reset();
      const input = gateForm.querySelector('input[name="token"]');
      if (input) {
        window.requestAnimationFrame(() => input.focus());
      }
    }
  };

  const hideGate = () => {
    const { gate, pageShell } = selectors;
    if (gate) {
      gate.hidden = true;
      gate.classList.add('is-hidden');
    }
    if (pageShell) {
      pageShell.inert = false;
      pageShell.removeAttribute('aria-hidden');
    }
  };

  const setToken = (token) => {
    state.token = token;
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const getToken = () => state.token;

  const renderPlaceholder = (body, columns, message) => {
    if (!body) return;
    body.innerHTML = `<tr class="is-empty"><td colspan="${columns}">${escapeHtml(message)}</td></tr>`;
  };

  const unauthorized = () => {
    setToken(null);
    showGate('Session expired. Please unlock again.');
  };

  const fetchJSON = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) {
      headers.set(AUTH_HEADER, `Bearer ${token}`);
    }
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      unauthorized();
      throw new Error('Unauthorized');
    }

    let payload = null;
    if (response.status !== 204) {
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }
    }

    if (!response.ok) {
      const message = payload?.message || 'Request failed';
      throw new Error(message);
    }

    return payload;
  };

  const normaliseUser = (user) => ({
    id: user.id,
    fullName: user.full_name || '',
    email: user.email || '',
    isAdmin: Boolean(user.is_admin),
    createdAt: user.created_at,
    totalSpent: Number(user.total_spent || 0),
    purchases: Array.isArray(user.purchases)
      ? user.purchases.map((purchase) => ({
          orderId: purchase.orderId || purchase.order_id,
          productId: purchase.productId || purchase.product_id,
          productName: purchase.productName || purchase.product_name,
          quantity: Number(purchase.quantity || 0),
          amount: Number(purchase.amount || 0),
          purchasedAt: purchase.purchasedAt || purchase.purchased_at,
        }))
      : [],
  });

  const normaliseProduct = (product) => ({
    id: product.id,
    name: product.name || '',
    heroCopy: product.hero_copy || '',
    price: product.price != null ? Number(product.price) : null,
    status: product.status || 'draft',
    timesPurchased: Number(product.times_purchased || 0),
    revenue: Number(product.revenue || 0),
    createdAt: product.created_at,
  });

  const normaliseStats = (stats) => ({
    totalUsers: Number(stats.total_users || 0),
    totalPurchases: Number(stats.total_purchases || 0),
    totalRevenue: Number(stats.total_revenue || 0),
    productBreakdown: Array.isArray(stats.product_breakdown)
      ? stats.product_breakdown.map((item) => ({
          id: item.id,
          name: item.name,
          status: item.status,
          purchaseCount: Number(item.purchase_count || 0),
          revenue: Number(item.revenue || 0),
        }))
      : [],
  });

const renderUsers = () => {
  const { usersBody } = selectors;
  if (!usersBody) return;

    if (!state.users.length && !state.addingUser) {
      renderPlaceholder(usersBody, 5, 'No users yet. Call in your first member.');
      return;
    }

    const rows = state.users
      .map((user) => {
        const isEditing = state.editingUserId === user.id;
        if (isEditing) {
          return `
            <tr data-id="${user.id}" class="is-editing">
              <td>
                <input type="text" name="full_name" value="${escapeHtml(user.fullName)}" placeholder="Full name" />
                <p class="muted">Created ${formatDate(user.createdAt) || '—'}</p>
              </td>
              <td>
                <input type="email" name="email" value="${escapeHtml(user.email)}" placeholder="Email" />
                <label class="muted" style="display:block;margin-top:0.7rem;">Reset password</label>
                <input type="password" name="password" placeholder="New password" minlength="8" />
              </td>
              <td>
                ${renderPurchases(user.purchases)}
              </td>
              <td>${formatCurrency(user.totalSpent)}</td>
              <td class="admin-table-actions">
                <div class="inline-actions">
                  <button class="btn primary" type="button" data-action="save-user">Save</button>
                  <button class="btn ghost" type="button" data-action="cancel-user">Cancel</button>
                </div>
              </td>
            </tr>
          `;
        }

        return `
          <tr data-id="${user.id}">
            <td>
              <strong>${escapeHtml(user.fullName) || '—'}</strong>
              <p class="muted">Joined ${formatDate(user.createdAt) || '—'}</p>
            </td>
            <td>
              <a href="mailto:${encodeURIComponent(user.email)}">${escapeHtml(user.email)}</a>
            </td>
            <td>
              ${renderPurchases(user.purchases)}
            </td>
            <td>${formatCurrency(user.totalSpent)}</td>
            <td class="admin-table-actions">
              <div class="inline-actions">
                <button class="btn secondary" type="button" data-action="edit-user">Edit</button>
                <button class="btn ghost" type="button" data-action="delete-user">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    const addRow = state.addingUser
      ? `
        <tr data-id="new-user" class="is-editing">
          <td>
            <input type="text" name="full_name" placeholder="Full name" />
          </td>
          <td>
            <input type="email" name="email" placeholder="Email" />
            <label class="muted" style="display:block;margin-top:0.7rem;">Temporary password</label>
            <input type="password" name="password" placeholder="Minimum 8 characters" minlength="8" required />
          </td>
          <td>
            <label class="muted" style="display:block; margin-bottom:0.4rem;">Admin</label>
            <select name="is_admin">
              <option value="false" selected>No</option>
              <option value="true">Yes</option>
            </select>
          </td>
          <td>—</td>
          <td class="admin-table-actions">
            <div class="inline-actions">
              <button class="btn primary" type="button" data-action="create-user">Save</button>
              <button class="btn ghost" type="button" data-action="cancel-create-user">Cancel</button>
            </div>
          </td>
        </tr>
      `
      : '';

    usersBody.innerHTML = rows + addRow;
  };

  const renderPurchases = (purchases = []) => {
    if (!purchases.length) {
      return '<p class="muted">No products purchased yet.</p>';
    }

    return `
      <ul class="meta-list">
        ${purchases
          .map(
            (purchase) => `
              <li>
                <strong>${escapeHtml(purchase.productName || 'Product')}</strong>
                <br />${purchase.quantity || 1} × ${formatCurrency(purchase.amount)}
              </li>
            `
          )
          .join('')}
      </ul>
    `;
  };

  const renderProducts = () => {
    const { productsBody } = selectors;
    if (!productsBody) return;

    if (!state.products.length && !state.addingProduct) {
      renderPlaceholder(productsBody, 5, 'No products configured yet. Add your first offer.');
      return;
    }

    const rows = state.products
      .map((product) => {
        const isEditing = state.editingProductId === product.id;
        if (isEditing) {
          return `
            <tr data-id="${product.id}" class="is-editing">
          <td>
            <input type="text" name="name" value="${escapeHtml(product.name)}" placeholder="Product name" />
          </td>
          <td>
            <input type="number" name="price" min="0" step="0.01" value="${product.price ?? ''}" placeholder="0.00" />
              </td>
              <td>
                <select name="status">
                  ${renderStatusOption('draft', product.status)}
                  ${renderStatusOption('published', product.status)}
                  ${renderStatusOption('archived', product.status)}
                </select>
              </td>
              <td>${product.timesPurchased}</td>
              <td class="admin-table-actions">
                <div class="inline-actions">
                  <button class="btn primary" type="button" data-action="save-product">Save</button>
                  <button class="btn ghost" type="button" data-action="cancel-product">Cancel</button>
                </div>
              </td>
            </tr>
          `;
        }

        return `
          <tr data-id="${product.id}">
            <td>
              <strong>${escapeHtml(product.name)}</strong>
              <p class="muted">${formatDate(product.createdAt) || ''}</p>
            </td>
            <td>${product.price != null ? formatCurrency(product.price) : '—'}</td>
            <td>${renderStatusChip(product.status)}</td>
            <td>${product.timesPurchased}</td>
            <td class="admin-table-actions">
              <div class="inline-actions">
                <button class="btn secondary" type="button" data-action="edit-product">Edit</button>
                <button class="btn ghost" type="button" data-action="delete-product">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    const addRow = state.addingProduct
      ? `
        <tr data-id="new-product" class="is-editing">
          <td><input type="text" name="name" placeholder="Product name" /></td>
          <td><input type="number" name="price" min="0" step="0.01" placeholder="0.00" /></td>
          <td>
            <select name="status">
              <option value="draft" selected>Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </td>
          <td>0</td>
          <td class="admin-table-actions">
            <div class="inline-actions">
              <button class="btn primary" type="button" data-action="create-product">Save</button>
              <button class="btn ghost" type="button" data-action="cancel-create-product">Cancel</button>
            </div>
          </td>
        </tr>
      `
      : '';

    productsBody.innerHTML = rows + addRow;
  };

  const renderStats = () => {
    const { statsUsers, statsPurchases, statsRevenue, statsProductsBody } = selectors;
    if (!state.stats) {
      if (statsUsers) statsUsers.textContent = '—';
      if (statsPurchases) statsPurchases.textContent = '—';
      if (statsRevenue) statsRevenue.textContent = '—';
      if (statsProductsBody) {
        renderPlaceholder(statsProductsBody, 4, 'No purchase data yet.');
      }
      return;
    }

    if (statsUsers) statsUsers.textContent = state.stats.totalUsers;
    if (statsPurchases) statsPurchases.textContent = state.stats.totalPurchases;
    if (statsRevenue) statsRevenue.textContent = formatCurrency(state.stats.totalRevenue);

    if (!statsProductsBody) return;

    if (!state.stats.productBreakdown.length) {
      renderPlaceholder(statsProductsBody, 4, 'No purchase data yet.');
      return;
    }

    statsProductsBody.innerHTML = state.stats.productBreakdown
      .map(
        (product) => `
          <tr>
            <td>${escapeHtml(product.name || '—')}</td>
            <td>${renderStatusChip(product.status)}</td>
            <td>${product.purchaseCount}</td>
            <td>${formatCurrency(product.revenue)}</td>
          </tr>
        `
      )
      .join('');
  };

  const renderStatusOption = (value, current) => {
    const isSelected = value === current ? 'selected' : '';
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    return `<option value="${value}" ${isSelected}>${label}</option>`;
  };

  const loadUsers = async () => {
    if (!selectors.usersBody) return;
    renderPlaceholder(selectors.usersBody, 5, 'Loading members...');
    try {
      const data = await fetchJSON('/api/admin/users');
      state.users = Array.isArray(data?.users) ? data.users.map(normaliseUser) : [];
      renderUsers();
    } catch (error) {
      renderPlaceholder(selectors.usersBody, 5, error.message || 'Unable to load users.');
      showToast(error.message || 'Unable to load users.', 'error');
    }
  };

  const loadProducts = async () => {
    if (!selectors.productsBody) return;
    renderPlaceholder(selectors.productsBody, 5, 'Loading products...');
    try {
      const data = await fetchJSON('/api/admin/products');
      state.products = Array.isArray(data?.products) ? data.products.map(normaliseProduct) : [];
      renderProducts();
    } catch (error) {
      renderPlaceholder(selectors.productsBody, 5, error.message || 'Unable to load products.');
      showToast(error.message || 'Unable to load products.', 'error');
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchJSON('/api/admin/stats');
      state.stats = data ? normaliseStats(data) : null;
      renderStats();
    } catch (error) {
      state.stats = null;
      renderStats();
      showToast(error.message || 'Unable to load stats.', 'error');
    }
  };

  const handleTabClick = (event) => {
    const button = event.target.closest('.admin-tab');
    if (!button) return;
    const target = button.dataset.tab;
    if (!target) return;

    selectors.tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === target;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    selectors.panels.forEach((panel) => {
      const match = panel.dataset.panel === target;
      panel.classList.toggle('is-hidden', !match);
      panel.hidden = !match;
    });

    if (target === 'users') loadUsers();
    if (target === 'products') loadProducts();
    if (target === 'stats') loadStats();
  };

const getRowInputs = (row) => {
  if (!row) return {};
  const inputs = row.querySelectorAll('input, select, textarea');
  const payload = {};
  inputs.forEach((input) => {
    const name = input.name;
    if (!name) return;
    if (input.type === 'checkbox') {
      payload[name] = input.checked;
    } else if (input.type === 'number') {
      payload[name] = input.value === '' ? null : Number(input.value);
    } else {
      const value = typeof input.value === 'string' ? input.value.trim() : input.value;
      payload[name] = value;
    }
  });
  return payload;
};

  const resetUserEditing = () => {
    state.editingUserId = null;
    state.addingUser = false;
  };

  const resetProductEditing = () => {
    state.editingProductId = null;
    state.addingProduct = false;
  };

  const handleUsersClick = async (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const row = actionButton.closest('tr');
    const id = row?.dataset.id;

    if (action === 'edit-user') {
      state.editingUserId = id;
      renderUsers();
      return;
    }

    if (action === 'cancel-user') {
      resetUserEditing();
      renderUsers();
      return;
    }

    if (action === 'save-user') {
      const payload = getRowInputs(row);
      if (!payload.full_name || !payload.email) {
        showToast('Name and email are required.', 'error');
        return;
      }
      if (payload.password && payload.password.length < 8) {
        showToast('New passwords must be at least 8 characters.', 'error');
        return;
      }
      try {
        await fetchJSON('/api/admin/users', {
          method: 'PATCH',
          body: JSON.stringify({
            id,
            full_name: payload.full_name,
            email: payload.email,
            password: payload.password || undefined,
          }),
        });
        showToast('User updated.', 'success');
        resetUserEditing();
        await loadUsers();
      } catch (error) {
        showToast(error.message || 'Unable to update user.', 'error');
      }
      return;
    }

    if (action === 'delete-user') {
      if (!id) return;
      const confirmed = window.confirm('Delete this user and their purchase history?');
      if (!confirmed) return;
      try {
        await fetchJSON('/api/admin/users', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        showToast('User removed.', 'success');
        await loadUsers();
      } catch (error) {
        showToast(error.message || 'Unable to delete user.', 'error');
      }
      return;
    }

    if (action === 'create-user') {
      const payload = getRowInputs(row);
      if (!payload.full_name || !payload.email) {
        showToast('Name and email are required.', 'error');
        return;
      }
      if (!payload.password || payload.password.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
      }
      try {
        await fetchJSON('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            full_name: payload.full_name,
            email: payload.email,
            is_admin: payload.is_admin === 'true',
            password: payload.password,
          }),
        });
        showToast('User created.', 'success');
        resetUserEditing();
        await loadUsers();
      } catch (error) {
        showToast(error.message || 'Unable to create user.', 'error');
      }
      return;
    }

    if (action === 'cancel-create-user') {
      resetUserEditing();
      renderUsers();
    }
  };

  const handleProductsClick = async (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    const row = actionButton.closest('tr');
    const id = row?.dataset.id;

    if (action === 'edit-product') {
      state.editingProductId = id;
      renderProducts();
      return;
    }

    if (action === 'cancel-product') {
      resetProductEditing();
      renderProducts();
      return;
    }

    if (action === 'save-product') {
      const payload = getRowInputs(row);
      if (!payload.name) {
        showToast('Name is required.', 'error');
        return;
      }
      try {
        await fetchJSON('/api/admin/products', {
          method: 'PATCH',
          body: JSON.stringify({
            id,
            name: payload.name,
            price: payload.price,
            status: payload.status,
          }),
        });
        showToast('Product updated.', 'success');
        resetProductEditing();
        await loadProducts();
        await loadStats();
      } catch (error) {
        showToast(error.message || 'Unable to update product.', 'error');
      }
      return;
    }

    if (action === 'delete-product') {
      if (!id) return;
      const confirmed = window.confirm('Delete this product? Existing orders will be removed.');
      if (!confirmed) return;
      try {
        await fetchJSON('/api/admin/products', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        showToast('Product deleted.', 'success');
        await loadProducts();
        await loadStats();
      } catch (error) {
        showToast(error.message || 'Unable to delete product.', 'error');
      }
      return;
    }

    if (action === 'create-product') {
      const payload = getRowInputs(row);
      if (!payload.name) {
        showToast('Name is required.', 'error');
        return;
      }
      try {
        await fetchJSON('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name,
            price: payload.price,
            status: payload.status,
          }),
        });
        showToast('Product created.', 'success');
        resetProductEditing();
        await loadProducts();
        await loadStats();
      } catch (error) {
        showToast(error.message || 'Unable to create product.', 'error');
      }
      return;
    }

    if (action === 'cancel-create-product') {
      resetProductEditing();
      renderProducts();
    }
  };

  const handleAddUser = () => {
    resetUserEditing();
    state.addingUser = true;
    renderUsers();
  };

  const handleAddProduct = () => {
    resetProductEditing();
    state.addingProduct = true;
    renderProducts();
  };

  const handleGateSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const token = formData.get('token');
    if (!token) {
      showToast('Token is required.', 'error');
      return;
    }
    setToken(token);
    hideGate();
    initialiseData();
  };

  const handleLogout = () => {
    setToken(null);
    showGate();
  };

  const initialiseData = () => {
    loadUsers();
    loadProducts();
    loadStats();
  };

  const init = () => {
    setYear();

    selectors.tabs.forEach((tab) => tab.addEventListener('click', handleTabClick));

    if (selectors.usersBody) {
      selectors.usersBody.addEventListener('click', handleUsersClick);
    }

    if (selectors.productsBody) {
      selectors.productsBody.addEventListener('click', handleProductsClick);
    }

    if (selectors.addUserButton) {
      selectors.addUserButton.addEventListener('click', handleAddUser);
    }

    if (selectors.addProductButton) {
      selectors.addProductButton.addEventListener('click', handleAddProduct);
    }

    if (selectors.logout) {
      selectors.logout.addEventListener('click', handleLogout);
    }

    if (selectors.gateForm) {
      selectors.gateForm.addEventListener('submit', handleGateSubmit);
    }

    if (selectors.gateCancel) {
      selectors.gateCancel.addEventListener('click', handleLogout);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !selectors.gate?.hidden) {
        handleLogout();
      }
    });

    const existingToken = localStorage.getItem(STORAGE_KEY);
    if (existingToken) {
      setToken(existingToken);
      hideGate();
      initialiseData();
    } else {
      showGate();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
