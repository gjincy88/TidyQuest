import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin, createUser } from './setup';
import type supertest from 'supertest';

let agent: supertest.Agent;

beforeEach(() => {
  ({ agent } = createTestApp());
});

describe('Rooms routes', () => {
  it('Admin can create room → 201', async () => {
    const { token } = await createAdmin(agent);

    const res = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kitchen', roomType: 'other' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Kitchen');
    expect(res.body).toHaveProperty('roomType', 'other');
    expect(res.body).toHaveProperty('tasks');
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('Member cannot create room → 403', async () => {
    const { token: adminToken } = await createAdmin(agent);
    const { token: memberToken } = await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
      role: 'member',
    });

    const res = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Living Room', roomType: 'other' });

    expect(res.status).toBe(403);
  });

  it('GET /api/rooms — lists rooms with health', async () => {
    const { token } = await createAdmin(agent);

    // Create a room first
    await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bathroom', roomType: 'other' });

    const res = await agent
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('health');
  });

  it('Admin can update room → 200', async () => {
    const { token } = await createAdmin(agent);

    const createRes = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kitchen', roomType: 'other' });

    const roomId = createRes.body.id;

    const res = await agent
      .put(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Kitchen' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated Kitchen');
  });

  it('DELETE room cascades to tasks', async () => {
    const { token } = await createAdmin(agent);

    // Create room with default tasks (kitchen type has many defaults)
    const createRes = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kitchen', roomType: 'kitchen' });

    const roomId = createRes.body.id;

    // Verify tasks exist
    const tasksRes = await agent
      .get(`/api/rooms/${roomId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    expect(tasksRes.body.length).toBeGreaterThan(0);

    // Delete the room
    const deleteRes = await agent
      .delete(`/api/rooms/${roomId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    // Verify room is gone
    const listRes = await agent
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token}`);
    const found = listRes.body.find((r: any) => r.id === roomId);
    expect(found).toBeUndefined();

    // Verify tasks are gone (fetching tasks for deleted room returns empty)
    const tasksAfter = await agent
      .get(`/api/rooms/${roomId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    expect(tasksAfter.body).toHaveLength(0);
  });
});
