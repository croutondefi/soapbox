import { TonConnect } from '@tonconnect/sdk';

import { openModal } from './modals';

import type { AppDispatch } from 'soapbox/store';

export const connector = new TonConnect({ manifestUrl: `${window.location}tonconnect-manifest.json` });

export function addReturnStrategy(url: string, returnStrategy: 'back' | 'none'): string {
  const link = new URL(url);
  link.searchParams.append('ret', returnStrategy);
  return link.toString();
}

const TON_CONNECTS_INIT_MODAL = 'TON_CONNECTS_INIT_MODAL';

const initTonConnectModal = () =>
  (dispatch: AppDispatch) => {
    dispatch({
      type: TON_CONNECTS_INIT_MODAL,
    });

    dispatch(openModal('TON_CONNECT'));
  };

export {
  TON_CONNECTS_INIT_MODAL,
  initTonConnectModal,
};
