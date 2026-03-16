import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin, createUser } from './setup';
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

/** Helper: create a task in a room with given effort and options, returns task id */
async function createTask(
  token: string,
  roomId: number,
  effort: number,
  opts: Record<string, unknown> = {}
) {
  const res = await agent
    .post(`/api/rooms/${roomId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Task effort ${effort}`, effort, ...opts });
  return res.body.id as number;
}

/** Helper: make a task completable by backdating lastCompletedAt */
function makeTaskDue(taskId: number) {
  db.prepare('UPDATE tasks SET lastCompletedAt = ? WHERE id = ?')
    .run(new Date(Date.now() - 30 * 86400000).toISOString(), taskId);
}

/** Helper: get user coins from /api/auth/me */
async function getCoins(token: string): Promise<number> {
  const res = await agent
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  return res.body.coins;
}

describe('Coins system', () => {
  it('awards default coins by effort: 1→5, 3→15, 5→25', async () => {
    const { token } = await createAdmin(agent);
    const roomId = await createRoom(token);

    const taskE1 = await createTask(token, roomId, 1);
    const taskE3 = await createTask(token, roomId, 3);
    const taskE5 = await createTask(token, roomId, 5);

    makeTaskDue(taskE1);
    makeTaskDue(taskE3);
    makeTaskDue(taskE5);

    const r1 = await agent
      .post(`/api/tasks/${taskE1}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(r1.body.coinsEarned).toBe(5);

    const r3 = await agent
      .post(`/api/tasks/${taskE3}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(r3.body.coinsEarned).toBe(15);

    const r5 = await agent
      .post(`/api/tasks/${taskE5}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(r5.body.coinsEarned).toBe(25);

    const coins = await getCoins(token);
    expect(coins).toBe(5 + 15 + 25);
  });

  it('applies custom coins config', async () => {
    const { token } = await createAdmin(agent);

    // Set custom config
    await agent
      .put('/api/users/coins-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ coinsByEffort: { '1': 100, '2': 200, '3': 300, '4': 400, '5': 500 } });

    const roomId = await createRoom(token);
    const taskId = await createTask(token, roomId, 1);
    makeTaskDue(taskId);

    const res = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.coinsEarned).toBe(100);

    // Restore default config
    await agent
      .put('/api/users/coins-config')
      .set('Authorization', `Bearer ${token}`)
      .send({ useDefault: true });
  });

  it('streak increments after completion', async () => {
    const { token } = await createAdmin(agent);

    const meBefore = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meBefore.body.currentStreak).toBe(0);

    const roomId = await createRoom(token);
    const taskId = await createTask(token, roomId, 1);
    makeTaskDue(taskId);

    await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const meAfter = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meAfter.body.currentStreak).toBeGreaterThanOrEqual(1);
  });

  it('shared mode splits coins equally', async () => {
    const { user: admin, token: adminToken } = await createAdmin(agent);
    const { user: member, token: memberToken } = await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
      role: 'member',
    });

    const roomId = await createRoom(adminToken);
    const taskId = await createTask(adminToken, roomId, 2, {
      assignmentMode: 'shared',
      assignedUserIds: [admin.id, member.id],
    });
    makeTaskDue(taskId);

    // Expected: effort 2 = 10 coins total, split between 2 = 5 each
    const r1 = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r1.body.coinsEarned).toBe(Math.floor(10 / 2));

    const r2 = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(r2.body.coinsEarned).toBe(Math.floor(10 / 2));
  });

  it('custom percentages distribute coins correctly', async () => {
    const { user: admin, token: adminToken } = await createAdmin(agent);
    const { user: member, token: memberToken } = await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
      role: 'member',
    });

    const roomId = await createRoom(adminToken);
    const assignedUserPercentages: Record<number, number> = {};
    assignedUserPercentages[admin.id] = 70;
    assignedUserPercentages[member.id] = 30;

    const taskId = await createTask(adminToken, roomId, 2, {
      assignmentMode: 'custom',
      assignedUserIds: [admin.id, member.id],
      assignedUserPercentages,
    });
    makeTaskDue(taskId);

    // effort 2 = 10 coins total
    const r1 = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r1.body.coinsEarned).toBe(Math.floor(10 * 70 / 100));

    const r2 = await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(r2.body.coinsEarned).toBe(Math.floor(10 * 30 / 100));
  });

  it('undo completion refunds coins', async () => {
    const { token } = await createAdmin(agent);
    const roomId = await createRoom(token);
    const taskId = await createTask(token, roomId, 3);
    makeTaskDue(taskId);

    await agent
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const coinsAfterComplete = await getCoins(token);
    expect(coinsAfterComplete).toBe(15);

    // Find the completion id
    const completion = db.prepare(
      'SELECT id FROM task_completions WHERE taskId = ? ORDER BY id DESC LIMIT 1'
    ).get(taskId) as { id: number };

    const undoRes = await agent
      .delete(`/api/completions/${completion.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(undoRes.status).toBe(200);

    const coinsAfterUndo = await getCoins(token);
    expect(coinsAfterUndo).toBe(0);
  });
});
