if (localStorage.getItem('token')) {
  window.location.href = '/';
}

const form = document.querySelector('#login-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const body = Object.fromEntries(data);

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (response.ok) {
    const result = await response.json();
    localStorage.setItem('token', result.token);
    window.location.href = '/';
  } else {
    const error = await response.json();
    showToast(error.error, 'error');
  }
});