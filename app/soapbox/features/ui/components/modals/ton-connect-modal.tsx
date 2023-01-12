import React, { useCallback, useState } from 'react';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { FormattedMessage } from 'react-intl';

import { closeModal } from 'soapbox/actions/modals';
import { Modal, Stack, Text } from 'soapbox/components/ui';
import { useAppDispatch } from 'soapbox/hooks';

interface ITonConnectModal {
  universalLink: string
}

const TonConnectModal: React.FC<ITonConnectModal> = ({universalLink }) => {
  const dispatch = useAppDispatch();

  const handleCancel = () => {
    dispatch(closeModal());
  };

  return (
    <Modal
      title={
        <FormattedMessage
          id='confirmations.ton_connect.heading'
          defaultMessage='Connect TON Wallet'
        />
      }
      onClose={handleCancel}
    >
      <Stack space={4}>
        <Text>
          <FormattedMessage
            id='confirmations.ton_connect.message'
            defaultMessage='Scan the QR code with your phone`s camera or Tonkeeper.'
          />
        </Text>

        <div className='ton-connect__qrcode'>
          <QRCode size={256} value={universalLink} />
        </div>
      </Stack>
    </Modal>
  );
};

export default TonConnectModal;
