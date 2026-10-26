const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config');
const { splitSqlStatements } = require('../src/db/sqlScript');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function migrate() {
  const { database, ...connectionOptions } = config.db;
  const connection = await mysql.createConnection(connectionOptions);
  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.changeUser({ database });

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const statements = splitSqlStatements(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log(`applied ${file} (${statements.length} statements)`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
