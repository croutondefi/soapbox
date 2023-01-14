// import { WalletInfo, WalletInfoRemote } from '@tonconnect/sdk';
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';
import React, { useCallback, useState, useEffect } from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Link, Redirect } from 'react-router-dom';

import { openModal } from 'soapbox/actions/modals';
import { connector } from 'soapbox/actions/ton-connect';
import SiteLogo from 'soapbox/components/site-logo';
import { Button, HStack, IconButton } from 'soapbox/components/ui';
import { useAppSelector, useFeatures, useSoapboxConfig, useOwnAccount, useInstance, useTonWalletConnectionError, useAppDispatch } from 'soapbox/hooks';

import Sonar from './sonar';

// import type { AxiosError } from 'axios';

const messages = defineMessages({
  menu: { id: 'header.menu.title', defaultMessage: 'Open menu' },
  home: { id: 'header.home.label', defaultMessage: 'Home' },
  login: { id: 'header.login.label', defaultMessage: 'Log in' },
  connectTon: { id: 'header.connect_ton.label', defaultMessage: 'Connect TON Wallet' },
  register: { id: 'header.register.label', defaultMessage: 'Register' },
  username: { id: 'header.login.username.placeholder', defaultMessage: 'Email or username' },
  password: { id: 'header.login.password.label', defaultMessage: 'Password' },
  forgotPassword: { id: 'header.login.forgot_password', defaultMessage: 'Forgot password?' },
});

const Header = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const account = useOwnAccount();
  const soapboxConfig = useSoapboxConfig();
  const pepeEnabled = soapboxConfig.getIn(['extensions', 'pepe', 'enabled']) === true;
  const { links } = soapboxConfig;

  const features = useFeatures();
  const instance = useInstance();
  const isOpen = features.accountCreation && instance.registrations;
  const pepeOpen = useAppSelector(state => state.verification.instance.get('registrations') === true);
  const wallet = useTonWallet();

  // const [isLoading, setLoading] = React.useState(false);
  const [shouldRedirect, setShouldRedirect] = React.useState(false);
  // const [mfaToken, setMfaToken] = React.useState(false);

  const open = () => dispatch(openModal('LANDING_PAGE'));

  // const [walletsList, setWalletsList] = React.useState<WalletInfo[]>();

  // const fetchData = async () => {
  //   const walletsList = await connector.getWallets();

  //   setWalletsList(walletsList);
  // };

  // useEffect(() => {
  //   fetchData();
  // }, []);

  // const [modalUniversalLink, setModalUniversalLink] = useState('');

  console.log(wallet);

  const onConnectErrorCallback = useCallback(() => {
    // setModalUniversalLink('');
    // notification.error({
    //   message: 'Connection was rejected',
    //   description: 'Please approve connection to the dApp in your wallet.',
    // });
  }, []);
  useTonWalletConnectionError(onConnectErrorCallback);

  // const wallet = useTonWallet();

  // const handleConnectTon = useCallback(async () => {
  //   if (walletsList === undefined) {
  //     return;
  //   }
  //   // if (walletsList.contents.embeddedWallet) {
  //   // 	connector.connect({ jsBridgeKey: walletsList.contents.embeddedWallet.jsBridgeKey });
  //   // 	return;
  //   // }

  //   const tonkeeperConnectionSource = {
  //     universalLink: (walletsList[0] as WalletInfoRemote).universalLink,
  //     bridgeUrl: (walletsList[0] as WalletInfoRemote).bridgeUrl,
  //   };

  //   const universalLink = connector.connect(tonkeeperConnectionSource);

  //   dispatch(openModal('TON_CONNECT', { universalLink }));

  //   //show empty modal
  //   //with qr
  //   //with propper link
  // }, [walletsList]);

  if (account && shouldRedirect) return <Redirect to='/' />;
  // if (mfaToken) return <Redirect to={`/login?token=${encodeURIComponent(mfaToken)}`} />;

  return (
    <header>
      <nav className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' aria-label='Header'>
        <div className='w-full py-6 flex items-center justify-between border-b border-indigo-500 lg:border-none'>
          <div className='flex items-center sm:justify-center relative w-36'>
            <div className='hidden md:block absolute z-0 -top-24 -left-6'>
              <Sonar />
            </div>

            <IconButton
              title={intl.formatMessage(messages.menu)}
              src={require('@tabler/icons/menu-2.svg')}
              onClick={open}
              className='md:hidden mr-4 bg-transparent text-gray-700 dark:text-gray-600 hover:text-gray-600'
            />

            <Link to='/' className='z-10'>
              <SiteLogo alt='Logo' className='h-6 w-auto cursor-pointer' />
              <span className='hidden'>{intl.formatMessage(messages.home)}</span>
            </Link>

          </div>

          <HStack space={6} alignItems='center' className='ml-10 relative z-10'>
            <HStack alignItems='center'>
              <HStack space={6} alignItems='center' className='hidden md:flex md:mr-6'>
                {links.get('help') && (
                  <a
                    href={links.get('help')}
                    target='_blank'
                    className='text-sm font-medium text-gray-700 dark:text-gray-600 hover:underline'
                  >
                    <FormattedMessage id='landing_page_modal.helpCenter' defaultMessage='Help Center' />
                  </a>
                )}
              </HStack>

              <HStack space={2} className='xl:hidden shrink-0'>
                <Button to='/login' theme='tertiary'>
                  {intl.formatMessage(messages.login)}
                </Button>

                {(isOpen || pepeEnabled && pepeOpen) && (
                  <Button
                    to='/signup'
                    theme='primary'
                  >
                    {intl.formatMessage(messages.register)}
                  </Button>
                )}
              </HStack>
            </HStack>
            {/* <p>{{  }}</p> */}
            <TonConnectButton />
          </HStack>
        </div>
      </nav>
    </header>
  );
};

export default Header;
