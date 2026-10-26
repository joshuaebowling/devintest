const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { splitSqlStatements } = require('../src/db/sqlScript');

test('splits procedure migration on DELIMITER blocks', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '002_vendor_link_procedures.sql'), 'utf8');
  const statements = splitSqlStatements(sql);
  assert.equal(statements.length, 10);
  assert.ok(statements.slice(5).every((s) => s.startsWith('CREATE PROCEDURE') || s.startsWith('-- ')));
  assert.ok(statements.every((s) => !s.includes('DELIMITER') && !s.endsWith('$$')));
});
