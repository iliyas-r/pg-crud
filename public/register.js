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
    alert('Регистрация успешна!');
    window.location.href = '/';
  } else {
    const error = await response.json();
    alert('Ошибка: ' + error.error);
  }
});