import { Wallet, UserRejectsError } from '@tonconnect/sdk';
import { useEffect, useState, useCallback } from 'react';

import { connector } from 'soapbox/actions/ton-connect';

export const useTonWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(connector.wallet);

  useEffect(() => connector.onStatusChange(setWallet, console.error), []);

  return wallet;
};

export const useTonWalletConnectionError = (callback: () => void) => {
  const errorsHandler = useCallback(
    (error: unknown) => {
      if (typeof error === 'object' && error instanceof UserRejectsError) {
        callback();
      }
    },
    [callback],
  );

  const emptyCallback = useCallback(() => {}, []);

  useEffect(() => connector.onStatusChange(emptyCallback, errorsHandler), [emptyCallback, errorsHandler]);
};
