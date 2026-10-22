if (localStorage.getItem('token')) {
  window.location.href = '/';
}

const form = document.querySelector('#register-form');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const body = Object.fromEntries(data);

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (response.ok) {
    showToast('Регистрация успешна!', 'success');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
  } else {
    const error = await response.json();
    showToast(error.error, 'error');
  }
});