-- Схема БД проекта PG-CRUD
-- Запуск: psql -U postgres -d postgres -f database/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Email уникален: на этом ограничении построена проверка «email уже занят» (409)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (email);

-- password_hash допускает NULL: пользователи, созданные через админский CRUD,
-- не имеют пароля и не могут войти через /login (получат 401)
