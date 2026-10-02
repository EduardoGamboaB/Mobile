/**
 * Las acciones de la bitácora que Admin sabe pintar deben ser exactamente
 * las del backend (backend/contracts/src/dtos/security.ts · AUDIT_ACTIONS).
 */
import * as fs from 'fs';
import * as path from 'path';
import { AUDIT_ACTION_LABEL } from '../../lib/api/security';

test('Admin conoce todas las acciones de auditoría del backend', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../../backend/contracts/src/dtos/security.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const AUDIT_ACTIONS'));
  const backend = [...block.slice(0, block.indexOf('];')).matchAll(/'([a-z_.]+)'/g)].map((m) => m[1]).sort();
  expect(backend.length).toBeGreaterThan(10);
  expect(Object.keys(AUDIT_ACTION_LABEL).sort()).toEqual(backend);
});
