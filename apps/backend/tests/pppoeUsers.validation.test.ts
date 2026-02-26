import test from 'node:test';
import assert from 'node:assert/strict';
import { pppoeUserCreateSchema, pppoeUserPatchSchema } from '../src/validators/pppoeUsers.schema';

test('pppoeUserCreateSchema accepts valid rate-limit override', () => {
  const result = pppoeUserCreateSchema.safeParse({
    username: 'user-1',
    password: 'password123',
    rateLimit: '50M/10M'
  });
  assert.equal(result.success, true);
});

test('pppoeUserPatchSchema accepts empty rate-limit for reset', () => {
  const result = pppoeUserPatchSchema.safeParse({
    rateLimit: ''
  });
  assert.equal(result.success, true);
});

test('pppoeUserPatchSchema rejects invalid rate-limit', () => {
  const result = pppoeUserPatchSchema.safeParse({
    rateLimit: '10/10'
  });
  assert.equal(result.success, false);
});

test('pppoeUserPatchSchema requires at least one field', () => {
  const result = pppoeUserPatchSchema.safeParse({});
  assert.equal(result.success, false);
});
