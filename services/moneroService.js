const axios = require('axios');
const MONERO_RPC = process.env.MONERO_WALLET_RPC || 'http://localhost:18082/json_rpc';

const rpcCall = async (method, params = {}) => {
  const { data } = await axios.post(MONERO_RPC, { jsonrpc: '2.0', id: '0', method, params }, { timeout: 30000 });
  if (data.error) throw new Error(data.error.message);
  return data.result;
};

const createWallet = async (label) => {
  return await rpcCall('create_wallet', { filename: label, language: 'English' });
};

const getAddress = async (accountIndex = 0) => {
  const result = await rpcCall('get_address', { account_index: accountIndex });
  return { address: result.address, subaddressIndex: 0 };
};

const createSubaddress = async (label, accountIndex = 0) => {
  const result = await rpcCall('create_address', { account_index: accountIndex, label });
  return { address: result.address, addressIndex: result.address_index };
};

const getBalance = async (accountIndex = 0) => {
  const result = await rpcCall('get_balance', { account_index: accountIndex });
  return { balance: result.balance, unlockedBalance: result.unlocked_balance };
};

const getTransfers = async (accountIndex = 0, incoming = true) => {
  const method = incoming ? 'incoming_transfers' : 'outgoing_transfers';
  const result = await rpcCall('get_transfers', { [method]: true, account_index: accountIndex });
  return result.transfers || [];
};

const verifyPayment = async (address, expectedAmount, accountIndex = 0) => {
  const transfers = await getTransfers(accountIndex, true);
  const received = transfers.filter(t => t.address === address).reduce((sum, t) => sum + t.amount, 0);
  return { received, expected: expectedAmount, confirmed: received >= expectedAmount };
};

const createPaymentAddress = async (orderId) => {
  const label = 'order-' + orderId;
  const { address, addressIndex } = await createSubaddress(label);
  await rpcCall('label_address', { index: { major: 0, minor: addressIndex }, label });
  return { address, addressIndex, orderId };
};

module.exports = { createWallet, getAddress, createSubaddress, getBalance, getTransfers, verifyPayment, createPaymentAddress };
