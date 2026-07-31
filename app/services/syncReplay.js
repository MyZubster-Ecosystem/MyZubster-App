import { createOrder } from './orderService';
import { sendPayment } from './walletService';

export async function replayOrderCreation(item) {
  if (item.action !== 'createOrder') {
    return { conflict: false };
  }
  const result = await createOrder(item.payload);
  return { conflict: false, result };
}

export async function replayPaymentSend(item) {
  if (item.action !== 'sendPayment') {
    return { conflict: false };
  }
  const result = await sendPayment(item.payload);
  return { conflict: false, result };
}

export async function replayItem(item) {
  switch (item.action) {
    case 'createOrder':
      return replayOrderCreation(item);
    case 'sendPayment':
      return replayPaymentSend(item);
    default:
      return { conflict: false };
  }
}
