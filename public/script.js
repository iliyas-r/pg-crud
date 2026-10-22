if (!localStorage.getItem('token')) {
  window.location.href = '/login.html';
}

let searchTimeout = null;
let editingId = null;

// Единая точка выхода в API: подставляет токен и разлогинивает при 401
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
    throw new Error('Требуется авторизация');
  }

  return response;
}

async function loadUsers(search = '') {
  let url = '/users';
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  const response = await apiFetch(url);

  if (!response.ok) {
    showToast('Не удалось загрузить список', 'error');
    return;
  }

  const users = await response.json();

  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '';

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.id = `row-${user.id}`;
    renderRow(tr, user);
    tbody.appendChild(tr);
  });
}

function renderRow(tr, user) {
  tr.innerHTML = `
    <td>${user.id}</td>
    <td>${user.first_name}</td>
    <td>${user.last_name}</td>
    <td>${user.email}</td>
    <td>
      <button class="btn-edit" onclick="startEdit(${user.id})">Редактировать</button>
      <button class="btn-delete" onclick="deleteUser(${user.id})">Удалить</button>
    </td>
  `;
}

function renderEditRow(tr, user) {
  tr.innerHTML = `
    <td>${user.id}</td>
    <td><input id="edit-first_name-${user.id}" value="${user.first_name}"></td>
    <td><input id="edit-last_name-${user.id}" value="${user.last_name}"></td>
    <td><input id="edit-email-${user.id}" value="${user.email}"></td>
    <td>
      <button class="btn-save" onclick="saveEdit(${user.id})">Сохранить</button>
      <button class="btn-cancel" onclick="cancelEdit(${user.id})">Отмена</button>
    </td>
  `;
}

async function startEdit(id) {
  if (editingId !== null) {
    await cancelEdit(editingId);
  }

  editingId = id;

  const response = await apiFetch(`/users/${id}`);
  const user = await response.json();

  const tr = document.querySelector(`#row-${id}`);
  renderEditRow(tr, user);
}

async function saveEdit(id) {
  const first_name = document.querySelector(`#edit-first_name-${id}`).value;
  const last_name = document.querySelector(`#edit-last_name-${id}`).value;
  const email = document.querySelector(`#edit-email-${id}`).value;

  if (!first_name || !last_name || !email) {
    showToast('Заполни все поля', 'error');
    return;
  }

  const response = await apiFetch(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ first_name, last_name, email })
  });

  if (!response.ok) {
    const error = await response.json();
    showToast(error.error || 'Не удалось сохранить', 'error');
    return;
  }

  editingId = null;
  loadUsers(document.querySelector('#search-input').value);
}

async function cancelEdit(id) {
  editingId = null;

  const response = await apiFetch(`/users/${id}`);
  const user = await response.json();

  const tr = document.querySelector(`#row-${id}`);
  renderRow(tr, user);
}

async function deleteUser(id) {
  if (!confirm('Удалить пользователя?')) return;

  const response = await apiFetch(`/users/${id}`, { method: 'DELETE' });

  if (!response.ok) {
    showToast('Не удалось удалить', 'error');
    return;
  }

  loadUsers(document.querySelector('#search-input').value);
}

async function addUser() {
  const first_name = document.querySelector('#first_name').value;
  const last_name = document.querySelector('#last_name').value;
  const email = document.querySelector('#email').value;

  if (!first_name || !last_name || !email) {
    showToast('Заполни все поля', 'error');
    return;
  }

  const response = await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify({ first_name, last_name, email })
  });

  if (!response.ok) {
    const error = await response.json();
    showToast(error.error || 'Не удалось добавить', 'error');
    return;
  }

  document.querySelector('#first_name').value = '';
  document.querySelector('#last_name').value = '';
  document.querySelector('#email').value = '';

  loadUsers(document.querySelector('#search-input').value);
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
}

document.querySelector('#add-btn').addEventListener('click', addUser);
document.querySelector('#logout-btn').addEventListener('click', logout);

document.querySelector('#search-input').addEventListener('input', (event) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadUsers(event.target.value);
  }, 300);
});

loadUsers();
