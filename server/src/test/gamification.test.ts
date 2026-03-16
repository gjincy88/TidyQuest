import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin } from './setup';
import type supertest from 'supertest';
import type Database from 'better-sqlite3';

let agent: supertest.Agent;
let db: InstanceType<typeof Database>;

beforeEach(() => {
  ({ agent, db } = createTestApp());
});

/** Helper: create a room and return its id */
async function createRoom(token: string) {
  const res = await agent
    .post('/api/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Room', roomType: 'other' });
  return res.body.id as number;
}

/** Helper: create a task and make it due, returns task id */
async function createDueTask(token: string, roomId: number) {
  const res = await agent
    .post(`/api/rooms/${roomId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Gamification Task', effort: 2 });
  const taskId = res.body.id as number;
  db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?')
    .run(new Date(Date.now() - 30 * 86400000).toISOString(), taskId);
  return taskId;
}

describe('Gamification', () => {
  it('leaderboard returns data by period', async () => {
    const { token } = await createAdmin(agent);
    const roomId = await createRoom(token);
    const taskId = await createDueTask(token, roomId);

    await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const res = await agent
      .get('/api/leaderboard?period=week')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].points).toBeGreaterThan(0);
  });

  it('achievements endpoint works', async () => {
    const { token } = await createAdmin(agent);

    const res = await agent
      .get('/api/achievements')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('me');
    expect(res.body.me).toHaveProperty('achievements');
    expect(Array.isArray(res.body.me.achievements)).toBe(true);
  });

  it('gamification OFF → coins not awarded', async () => {
    const { token } = await createAdmin(agent);

    // Disable gamification
    await agent
      .put('/api/users/gamification-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ gamificationEnabled: false });

    const roomId = await createRoom(token);
    const taskId = await createDueTask(token, roomId);

    const res = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.coinsEarned).toBe(0);

    // Re-enable gamification
    await agent
      .put('/api/users/gamification-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ gamificationEnabled: true });
  });

  it('gamification ON → coins awarded', async () => {
    const { token } = await createAdmin(agent);

    // Ensure gamification is on (default)
    const configRes = await agent
      .get('/api/users/gamification-config')
      .set('Authorization', `Bearer ${token}`);
    expect(configRes.body.gamificationEnabled).toBe(true);

    const roomId = await createRoom(token);
    const taskId = await createDueTask(token, roomId);

    const res = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.coinsEarned).toBeGreaterThan(0);
  });
});
