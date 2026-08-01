const rewardsService = require('../services/rewardsService');

describe('rewardsService contract', () => {
  test('exports Monero rewards API functions', () => {
    expect(typeof rewardsService.getRewards).toBe('function');
    expect(typeof rewardsService.getRewardHistory).toBe('function');
    expect(typeof rewardsService.claimReward).toBe('function');
    expect(typeof rewardsService.getRewardStats).toBe('function');
    expect(typeof rewardsService.isRewardsEndpointError).toBe('function');
  });
});
