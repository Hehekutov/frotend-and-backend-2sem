const { Pool } = require('pg');

// Подключение к базе PostgreSQL.
// База данных и таблица users уже созданы в DBeaver.
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'prac19',
  user: 'postgres',
  password: 'REKTFEk228'
});

module.exports = pool;