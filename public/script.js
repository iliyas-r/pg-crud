async function loadUsers(search = '') {
  let url = '/users';
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  const response = await fetch(url);
  const users = await response.json();

  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = '';

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.first_name}</td>
      <td>${user.last_name}</td>
      <td>${user.email}</td>
      <td>
        <button onclick="editUser(${user.id})">Редактировать</button>
        <button onclick="deleteUser(${user.id})">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

loadUsers();

async function deleteUser(id) {
  if (!confirm("Удалить пользователя?")) return;

  await fetch(`/users/${id}`, { method: "DELETE" });

  loadUsers();
}

async function addUser() {
  const first_name = document.querySelector("#first_name").value;
  const last_name = document.querySelector("#last_name").value;
  const email = document.querySelector("#email").value;

  if (!first_name || !last_name || !email) {
    alert("Заполни все поля");
    return;
  }

  await fetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name, last_name, email }),
  });

  document.querySelector("#first_name").value = "";
  document.querySelector("#last_name").value = "";
  document.querySelector("#email").value = "";

  loadUsers();
}

document.querySelector("#add-btn").addEventListener("click", addUser);

async function editUser(id) {
  const response = await fetch(`/users/${id}`);
  const user = await response.json();

  const first_name = prompt('Имя:', user.first_name);
  const last_name = prompt('Фамилия:', user.last_name);
  const email = prompt('Email:', user.email);

  if (!first_name || !last_name || !email) return;

  await fetch(`/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name, last_name, email })
  });

  loadUsers();
}

document.querySelector('#search-btn').addEventListener('click', () => {
  const search = document.querySelector('#search-input').value;
  loadUsers(search);
});

document.querySelector('#reset-btn').addEventListener('click', () => {
  document.querySelector('#search-input').value = '';
  loadUsers();
});