import test from 'node:test';
import assert from 'node:assert/strict';
import { subjects } from '../src/data/catalog.ts';
import { AVAILABLE_SUBJECT_IDS } from '../src/lib/content.ts';

test('all catalog subjects are available in the app', () => {
  const expected = new Set(subjects.map((s) => s.id));
  for (const id of expected) {
    assert.ok(AVAILABLE_SUBJECT_IDS.has(id), `expected ${id} to be available`);
  }
  assert.ok(AVAILABLE_SUBJECT_IDS.has('physics'));
});
