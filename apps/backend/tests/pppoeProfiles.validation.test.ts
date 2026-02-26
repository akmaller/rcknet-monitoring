import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pppoeProfileCreateSchema,
  pppoeProfilePatchSchema,
  pppoeProfileQuerySchema
} from '../src/validators/pppoeProfiles.schema';

test('pppoeProfileCreateSchema accepts valid rate-limit', () => {
  const result = pppoeProfileCreateSchema.safeParse({
    name: 'paket-10m',
    rateLimit: '10M/10M'
  });
  assert.equal(result.success, true);
});

test('pppoeProfileCreateSchema rejects invalid rate-limit', () => {
  const result = pppoeProfileCreateSchema.safeParse({
    name: 'paket-10m',
    rateLimit: '10M/10M;rm -rf /'
  });
  assert.equal(result.success, false);
});

test('pppoeProfileCreateSchema rejects rate-limit without unit', () => {
  const result = pppoeProfileCreateSchema.safeParse({
    name: 'paket-10m',
    rateLimit: '10/10'
  });
  assert.equal(result.success, false);
});

test('pppoeProfilePatchSchema requires at least one field', () => {
  const result = pppoeProfilePatchSchema.safeParse({});
  assert.equal(result.success, false);
});

test('pppoeProfileQuerySchema accepts dryRun true/false', () => {
  assert.equal(pppoeProfileQuerySchema.safeParse({ dryRun: 'true' }).success, true);
  assert.equal(pppoeProfileQuerySchema.safeParse({ dryRun: 'false' }).success, true);
  assert.equal(pppoeProfileQuerySchema.safeParse({ dryRun: 'yes' }).success, false);
});
