import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, createAdmin, createUser } from './setup';
import type supertest from 'supertest';

describe('Permission restrictions (anti-cheat)', () => {
  // ── Member restrictions ──────────────────────────────────────────────

  describe('Member restrictions', () => {
    let agent: supertest.Agent;
    let adminToken: string;
    let memberToken: string;
    let memberId: number;
    let roomId: number;
    let taskId: number;

    beforeAll(async () => {
      ({ agent } = createTestApp());
      ({ token: adminToken } = await createAdmin(agent));
      const { user: member, token } = await createUser(agent, adminToken, {
        username: 'member1',
        displayName: 'Member',
        password: 'pass123',
        role: 'member',
      });
      memberToken = token;
      memberId = member.id;

      // Admin creates room + task for use by several tests
      const roomRes = await agent
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Kitchen', roomType: 'kitchen', tasks: [] });
      roomId = roomRes.body.id;

      const taskRes = await agent
        .post(`/api/rooms/${roomId}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Wash dishes', effort: 1, frequencyDays: 1 });
      taskId = taskRes.body.id;
    });

    it('Member cannot create room → 403', async () => {
      const res = await agent
        .post('/api/rooms')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Living Room', roomType: 'living' });

      expect(res.status).toBe(403);
    });

    it('Member cannot delete room → 403', async () => {
      const res = await agent
        .delete(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('Member cannot create task → 403', async () => {
      const res = await agent
        .post(`/api/rooms/${roomId}/tasks`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Another task', effort: 2 });

      expect(res.status).toBe(403);
    });

    it('Member CAN complete task → 200', async () => {
      const res = await agent
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
    });

    it('Member cannot adjust own coins (ANTI-CHEAT) → 403', async () => {
      const res = await agent
        .post(`/api/users/${memberId}/adjust-coins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ amount: 100 });

      expect(res.status).toBe(403);
    });

    it('Member cannot change own role (ANTI-CHEAT) → 403', async () => {
      const res = await agent
        .put(`/api/users/${memberId}/role`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  // ── Child restrictions ───────────────────────────────────────────────

  describe('Child restrictions', () => {
    let agent: supertest.Agent;
    let adminToken: string;
    let childToken: string;
    let childId: number;
    let memberId: number;

    beforeAll(async () => {
      ({ agent } = createTestApp());
      ({ token: adminToken } = await createAdmin(agent));
      const { user: child, token } = await createUser(agent, adminToken, {
        username: 'child1',
        displayName: 'Child',
        password: 'pass123',
      });
      childToken = token;
      childId = child.id;

      const { user: member } = await createUser(agent, adminToken, {
        username: 'member1',
        displayName: 'Member',
        password: 'pass123',
        role: 'member',
      });
      memberId = member.id;
    });

    it('Child cannot adjust own coins (ANTI-CHEAT) → 403', async () => {
      const res = await agent
        .post(`/api/users/${childId}/adjust-coins`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ amount: 999 });

      expect(res.status).toBe(403);
    });

    it('Child cannot change own role (ANTI-CHEAT) → 403', async () => {
      const res = await agent
        .put(`/api/users/${childId}/role`)
        .set('Authorization', `Bearer ${childToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });

    it('Child cannot delete users → 403', async () => {
      const res = await agent
        .delete(`/api/users/${memberId}`)
        .set('Authorization', `Bearer ${childToken}`);

      expect(res.status).toBe(403);
    });

    it('Child cannot import data → 403', async () => {
      const res = await agent
        .post('/api/import')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ version: 6, users: [], rooms: [], tasks: [], completions: [], settings: [] });

      expect(res.status).toBe(403);
    });

    it('Child cannot toggle gamification → 403', async () => {
      const res = await agent
        .put('/api/users/gamification-config')
        .set('Authorization', `Bearer ${childToken}`)
        .send({ gamificationEnabled: false });

      expect(res.status).toBe(403);
    });
  });

  // ── Admin self-protection ────────────────────────────────────────────

  describe('Admin self-protection', () => {
    it('Admin cannot delete themselves → 400', async () => {
      const { agent } = createTestApp();
      const { user, token } = await createAdmin(agent);

      const res = await agent
        .delete(`/api/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
