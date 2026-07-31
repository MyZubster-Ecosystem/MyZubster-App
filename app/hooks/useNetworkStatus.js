import { useState, useEffect } from 'react';
import { getNetworkStatus, addNetworkStatusListener } from '../services/networkStatusService';

export default function useNetworkStatus() {
  const [status, setStatus] = useState(() => getNetworkStatus());

  useEffect(() => {
    const unsubscribe = addNetworkStatusListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
}
