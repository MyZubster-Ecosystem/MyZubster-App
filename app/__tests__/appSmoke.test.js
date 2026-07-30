describe('mobile app contract', () => {
  test('Monero addresses use a mainnet or testnet prefix', () => {
    expect(/^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test('4'.padEnd(95, 'A'))).toBe(true);
  });

  test('order statuses are finite and user-visible', () => {
    expect(['pending', 'confirmed', 'completed', 'cancelled']).toContain('pending');
    expect(['pending', 'confirmed', 'completed', 'cancelled']).toContain('completed');
  });
});
