import { mkdir, writeFile } from 'node:fs/promises';
import { getAuthTables } from 'better-auth/db';
import { authOptions } from '../src/modules/auth/options.ts';

const tables = getAuthTables(authOptions);
const lines = [
  '// 由 db:schema 根据当前 Better Auth 配置生成，请勿手工修改。',
  "import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';",
  '',
];

for (const [model, table] of Object.entries(tables)) {
  const columns = ["  id: text('id').primaryKey(),"];
  const indexes = [];
  for (const [name, field] of Object.entries(table.fields)) {
    const column = JSON.stringify(field.fieldName || name);
    let definition;
    if (field.type === 'string') definition = `text(${column})`;
    else if (field.type === 'date')
      definition = `integer(${column}, { mode: 'timestamp_ms' })`;
    else if (field.type === 'boolean')
      definition = `integer(${column}, { mode: 'boolean' })`;
    else if (field.type === 'number') definition = `integer(${column})`;
    else
      throw new Error(`暂不支持自动生成 ${model}.${name} 的类型 ${field.type}`);
    if (field.required) definition += '.notNull()';
    if (field.unique) definition += '.unique()';
    if (typeof field.defaultValue === 'boolean')
      definition += `.default(${field.defaultValue})`;
    if (field.references) {
      const reference = field.references;
      definition += `.references(() => ${reference.model}.${reference.field}, { onDelete: '${reference.onDelete || 'cascade'}' })`;
    }
    columns.push(`  ${JSON.stringify(name)}: ${definition},`);
    if (field.index)
      indexes.push(`  index('${model}_${name}_idx').on(table.${name}),`);
  }
  lines.push(
    `export const ${model} = sqliteTable('${table.modelName}', {`,
    ...columns,
  );
  if (indexes.length) lines.push('}, (table) => [', ...indexes, ']);', '');
  else lines.push('});', '');
}

const output = new URL('../src/db/schema/auth.ts', import.meta.url);
await mkdir(new URL('../src/db/schema/', import.meta.url), { recursive: true });
await writeFile(output, lines.join('\r\n'));
console.log('已根据 Better Auth 认证配置生成四张认证表。');
