import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin, createUser } from './setup';
import type supertest from 'supertest';

let agent: supertest.Agent;

beforeEach(() => {
  ({ agent } = createTestApp());
});

describe('Data export/import', () => {
  it('export does not contain password hashes', async () => {
    const { token: adminToken } = await createAdmin(agent);
    await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
    });

    const res = await agent
      .get('/api/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const exported = JSON.stringify(res.body);
    expect(exported).not.toContain('passwordHash');
  });

  it('import restores data', async () => {
    const { token: adminToken } = await createAdmin(agent);

    // Create a room
    const roomRes = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Import Test Room', roomType: 'other' });
    const roomId = roomRes.body.id;

    // Export
    const exportRes = await agent
      .get('/api/export')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(exportRes.status).toBe(200);
    const backup = exportRes.body;

    // Delete the room
    await agent
      .delete(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Verify room is gone
    const roomsAfterDelete = await agent
      .get('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`);
    const found = roomsAfterDelete.body.find((r: any) => r.id === roomId);
    expect(found).toBeUndefined();

    // Import the backup
    const importRes = await agent
      .post('/api/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(backup);
    expect(importRes.status).toBe(200);

    // Verify room is restored
    const roomsAfterImport = await agent
      .get('/api/rooms')
      .set('Authorization', `Bearer ${adminToken}`);
    const restored = roomsAfterImport.body.find((r: any) => r.id === roomId);
    expect(restored).toBeDefined();
    expect(restored.name).toBe('Import Test Room');
  });

  it('export — member gets 403', async () => {
    const { token: adminToken } = await createAdmin(agent);
    const { token: memberToken } = await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
      role: 'member',
    });

    const res = await agent
      .get('/api/export')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});
