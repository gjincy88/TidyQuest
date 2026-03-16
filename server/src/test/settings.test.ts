import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin } from './setup';
import type supertest from 'supertest';

let agent: supertest.Agent;

beforeEach(() => {
  ({ agent } = createTestApp());
});

describe('Settings', () => {
  it('coins config persists', async () => {
    const { token } = await createAdmin(agent);

    const custom = { '1': 11, '2': 22, '3': 33, '4': 44, '5': 55 };

    await agent
      .put('/api/users/coins-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ coinsByEffort: custom });

    const res = await agent
      .get('/api/users/coins-config')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.coinsByEffort).toMatchObject({
      1: 11, 2: 22, 3: 33, 4: 44, 5: 55,
    });

    // Restore default
    await agent
      .put('/api/users/coins-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ useDefault: true });
  });

  it('vacation toggle', async () => {
    const { token } = await createAdmin(agent);

    // Enable vacation
    await agent
      .put('/api/users/vacation-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ vacationMode: true });

    const onRes = await agent
      .get('/api/users/vacation-config')
      .set('Authorization', `Bearer ${token}`);
    expect(onRes.status).toBe(200);
    expect(onRes.body.vacationMode).toBe(true);

    // Disable vacation
    await agent
      .put('/api/users/vacation-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ vacationMode: false });

    const offRes = await agent
      .get('/api/users/vacation-config')
      .set('Authorization', `Bearer ${token}`);
    expect(offRes.body.vacationMode).toBe(false);
  });

  it('registration toggle', async () => {
    const { token } = await createAdmin(agent);

    // Disable registration
    await agent
      .put('/api/users/registration-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ registrationEnabled: false });

    const offRes = await agent
      .get('/api/users/registration-config')
      .set('Authorization', `Bearer ${token}`);
    expect(offRes.status).toBe(200);
    expect(offRes.body.registrationEnabled).toBe(false);

    // Re-enable
    await agent
      .put('/api/users/registration-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ registrationEnabled: true });

    const onRes = await agent
      .get('/api/users/registration-config')
      .set('Authorization', `Bearer ${token}`);
    expect(onRes.body.registrationEnabled).toBe(true);
  });

  it('strict mode toggle', async () => {
    const { token } = await createAdmin(agent);

    // Enable strict mode
    await agent
      .put('/api/users/strict-mode-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ strictMode: true });

    const onRes = await agent
      .get('/api/users/strict-mode-config')
      .set('Authorization', `Bearer ${token}`);
    expect(onRes.status).toBe(200);
    expect(onRes.body.strictMode).toBe(true);

    // Disable strict mode
    await agent
      .put('/api/users/strict-mode-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ strictMode: false });

    const offRes = await agent
      .get('/api/users/strict-mode-config')
      .set('Authorization', `Bearer ${token}`);
    expect(offRes.body.strictMode).toBe(false);
  });
});
