// Splits a .sql file into individual statements, honoring mysql-client style
// `DELIMITER` directives so stored procedure bodies stay intact.
function splitSqlStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const line of sql.split(/\r?\n/)) {
    const directive = line.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (directive) {
      delimiter = directive[1];
      continue;
    }
    buffer += `${line}\n`;
    const trimmed = buffer.trimEnd();
    if (trimmed.endsWith(delimiter)) {
      const statement = trimmed.slice(0, -delimiter.length).trim();
      if (stripComments(statement)) statements.push(statement);
      buffer = '';
    }
  }

  const rest = buffer.trim();
  if (stripComments(rest)) statements.push(rest);
  return statements;
}

function stripComments(sql) {
  return sql.replace(/^\s*--.*$/gm, '').trim();
}

module.exports = { splitSqlStatements };
