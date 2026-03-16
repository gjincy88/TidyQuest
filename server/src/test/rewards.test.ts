import { describe, it, expect, beforeEach } from 'vitest';
import { createTestApp, createAdmin, createUser } from './setup';
import type supertest from 'supertest';

let agent: supertest.Agent;

beforeEach(() => {
  ({ agent } = createTestApp());
});

/** Helper: get user coins from /api/auth/me */
async function getCoins(token: string): Promise<number> {
  const res = await agent
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);
  return res.body.coins;
}

describe('Rewards', () => {
  it('redeem with insufficient coins → 400', async () => {
    const { token } = await createAdmin(agent);

    // Create a reward costing 100 coins
    const rewardRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Expensive Reward', costCoins: 100 });
    const rewardId = rewardRes.body.id;

    // Admin has 0 coins, try to redeem
    const res = await agent
      .post(`/api/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Not enough coins/i);
  });

  it('redeem with enough coins → 200, coins deducted', async () => {
    const { user, token } = await createAdmin(agent);

    // Give admin 100 coins
    await agent
      .post(`/api/users/${user.id}/adjust-coins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });

    // Create reward costing 50
    const rewardRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nice Reward', costCoins: 50 });
    const rewardId = rewardRes.body.id;

    const res = await agent
      .post(`/api/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const coins = await getCoins(token);
    expect(coins).toBe(50);
  });

  it('cancel redemption → coins refunded', async () => {
    const { user, token } = await createAdmin(agent);

    // Give coins and create reward
    await agent
      .post(`/api/users/${user.id}/adjust-coins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 });

    const rewardRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cancel Test', costCoins: 40 });
    const rewardId = rewardRes.body.id;

    // Redeem
    const redeemRes = await agent
      .post(`/api/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${token}`);
    const redemptionId = redeemRes.body.redemption.id;

    expect(await getCoins(token)).toBe(60);

    // Cancel
    const cancelRes = await agent
      .post(`/api/rewards/redemptions/${redemptionId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);

    expect(await getCoins(token)).toBe(100);
  });

  it('admin reject redemption → coins refunded', async () => {
    const { user, token } = await createAdmin(agent);

    // Give coins
    await agent
      .post(`/api/users/${user.id}/adjust-coins`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 80 });

    const rewardRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Reject Test', costCoins: 30 });
    const rewardId = rewardRes.body.id;

    const redeemRes = await agent
      .post(`/api/rewards/${rewardId}/redeem`)
      .set('Authorization', `Bearer ${token}`);
    const redemptionId = redeemRes.body.redemption.id;

    expect(await getCoins(token)).toBe(50);

    // Admin rejects
    const rejectRes = await agent
      .put(`/api/rewards/redemptions/${redemptionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });
    expect(rejectRes.status).toBe(200);

    expect(await getCoins(token)).toBe(80);
  });

  it('CRUD rewards — admin only', async () => {
    const { token: adminToken } = await createAdmin(agent);
    const { token: memberToken } = await createUser(agent, adminToken, {
      username: 'member1',
      displayName: 'Member One',
      password: 'pass123',
      role: 'member',
    });

    // Create (admin)
    const createRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'CRUD Reward', costCoins: 10 });
    expect(createRes.status).toBe(201);
    const rewardId = createRes.body.id;

    // Update (admin)
    const updateRes = await agent
      .put(`/api/rewards/${rewardId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Updated Reward', costCoins: 20 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated Reward');

    // Delete (admin)
    const deleteRes = await agent
      .delete(`/api/rewards/${rewardId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    // Create with member token → 403
    const memberRes = await agent
      .post('/api/rewards')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Not Allowed', costCoins: 5 });
    expect(memberRes.status).toBe(403);
  });
});
