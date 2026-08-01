import { claimReward, getRewardHistory, getRewardStats, getRewards, isRewardsEndpointError } from '../services/rewardsService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('rewardsService contract', () => {
  test('exports Monero rewards API functions', () => {
    expect(typeof getRewards).toBe('function');
    expect(typeof getRewardHistory).toBe('function');
    expect(typeof claimReward).toBe('function');
    expect(typeof getRewardStats).toBe('function');
    expect(typeof isRewardsEndpointError).toBe('function');
  });
});
