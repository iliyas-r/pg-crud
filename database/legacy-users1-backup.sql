-- Дамп таблицы users1 до объединения с users (сгенерировано автоматически)
-- Восстановление: psql -U postgres -d postgres -f database/legacy-users1-backup.sql

CREATE TABLE IF NOT EXISTS users1 (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255)
);

INSERT INTO users1 (id, first_name, last_name, email) VALUES (1, 'Ilyask', 'Niyazov', 'stryiker1994@gmail.ru');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (3, 'Анатолий', 'Шуров ', 'cattsil@mail.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (4, 'Anna', 'Smirnova', 'anna@test.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (5, 'MARINA', 'USOVA', 'USACHKA@test.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (7, 'Petr', 'Sidorov', 'petr@test.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (8, 'алекс', 'нимбрент', 'sfg@.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (9, 'Есаул ', ' Иларионов', ' ');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (10, 'Владислав ', 'Питухов', 'neef007@yndex.ru');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (11, 'сергей ', 'медведев', 'shluha@yandex.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (12, 'Юрик', 'Некрасов', 'nikrofil.@yndex.com');
INSERT INTO users1 (id, first_name, last_name, email) VALUES (13, 'Александр', 'Пушкин', 'Bubs@yandex.ru');
