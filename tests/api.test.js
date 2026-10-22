// Сквозной тест API. Требует запущенного сервера и создаёт/удаляет собственных пользователей.
//
// Запуск:
//   node index.js          # в одном терминале
//   npm test               # в другом
//
// Другой адрес сервера: BASE_URL=http://localhost:4000 npm test

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = 'smoke.test@example.com';
const PASS = 'secret1234';

const results = [];

async function call(method, path, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

function check(label, actual, expected, extra = '') {
  const ok = actual === expected;
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${label}: ${actual} (ожидается ${expected}) ${extra}`);
  return ok;
}

(async () => {
  // Убираем остатки прошлых прогонов, чтобы тест был повторяемым
  const probe = await call('POST', '/login', { body: { email: EMAIL, password: PASS } });
  if (probe.status === 200) {
    const token = probe.json.token;
    const list = await call('GET', '/users?search=smoke.test', { token });
    for (const user of list.json || []) {
      await call('DELETE', `/users/${user.id}`, { token });
    }
    console.log('— убраны остатки прошлых прогонов');
  }

  // Регистрация
  const reg = await call('POST', '/register', {
    body: { first_name: 'Тест', last_name: 'Тестов', email: EMAIL, password: PASS },
  });
  check('регистрация', reg.status, 201);
  const newId = reg.json?.id;
  check('password_hash не в ответе регистрации', reg.text.includes('password_hash') ? 'есть' : 'нет', 'нет');

  // Защита от дублей
  const dupe = await call('POST', '/register', {
    body: { first_name: 'Тест', last_name: 'Тестов', email: EMAIL, password: PASS },
  });
  check('повторная регистрация того же email', dupe.status, 409);

  // Вход
  const badLogin = await call('POST', '/login', { body: { email: EMAIL, password: 'wrongpass' } });
  check('вход с неверным паролем', badLogin.status, 401);

  const goodLogin = await call('POST', '/login', { body: { email: EMAIL, password: PASS } });
  check('вход с верным паролем', goodLogin.status, 200);
  const token = goodLogin.json?.token;

  // Защита CRUD
  check('CRUD без токена', (await call('GET', '/users')).status, 401);
  check('CRUD с битым токеном', (await call('GET', '/users', { token: 'garbage' })).status, 401);

  const list = await call('GET', '/users', { token });
  check('CRUD с токеном', list.status, 200, `записей: ${Array.isArray(list.json) ? list.json.length : '?'}`);
  check('password_hash в списке', list.text.includes('password_hash') ? 'есть' : 'нет', 'нет');
  check('created_at в списке', list.text.includes('created_at') ? 'есть' : 'нет', 'есть');

  const search = await call('GET', '/users?search=ильяс', { token });
  check('поиск ILIKE по кириллице', search.status, 200, `найдено: ${Array.isArray(search.json) ? search.json.length : '?'}`);

  // Валидация
  const invalid = await call('POST', '/users', { token, body: { first_name: '' } });
  check('POST /users без обязательных полей', invalid.status, 400);

  // CRUD
  const create = await call('POST', '/users', {
    token,
    body: { first_name: 'Пётр', last_name: 'Петров', email: 'petr.smoke@example.com' },
  });
  check('POST /users без пароля (админский CRUD)', create.status, 201);
  const petrId = create.json?.id;

  const patch = await call('PATCH', `/users/${petrId}`, { token, body: { first_name: 'Пётр II' } });
  check('PATCH частичное обновление', patch.status, 200, patch.json?.first_name || '');

  const patchBad = await call('PATCH', `/users/${petrId}`, { token, body: { password_hash: 'hack' } });
  check('PATCH запрещённого поля', patchBad.status, 400);

  const put = await call('PUT', `/users/${petrId}`, {
    token,
    body: { first_name: 'Пётр', last_name: 'Петров', email: 'petr.smoke@example.com' },
  });
  check('PUT полное обновление', put.status, 200);

  check('несуществующий id', (await call('GET', '/users/999999', { token })).status, 404);

  // Уборка
  await call('DELETE', `/users/${petrId}`, { token });
  check('удаление тестового пользователя', (await call('DELETE', `/users/${newId}`, { token })).status, 200);
  check('удалённый пользователь', (await call('GET', `/users/${newId}`, { token })).status, 404);

  const failed = results.filter((r) => !r).length;
  console.log(`\nИтого: ${results.length - failed} из ${results.length} прошли`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(2);
});
