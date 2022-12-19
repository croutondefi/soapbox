import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import TelegramLoginButton from 'react-telegram-login';
import { isMobile } from 'soapbox/is-mobile';

import { prepareRequest } from 'soapbox/actions/consumer-auth';
import Markup from 'soapbox/components/markup';
import { Button, Card, CardBody, Stack, Text } from 'soapbox/components/ui';
import VerificationBadge from 'soapbox/components/verification-badge';
import RegistrationForm from 'soapbox/features/auth-login/components/registration-form';
import { useAppDispatch, useAppSelector, useFeatures, useInstance, useSoapboxConfig } from 'soapbox/hooks';
import { capitalize } from 'soapbox/utils/strings';

const LandingPage = () => {
  const dispatch = useAppDispatch();
  const features = useFeatures();
  const soapboxConfig = useSoapboxConfig();
  const pepeEnabled = soapboxConfig.getIn(['extensions', 'pepe', 'enabled']) === true;

  const instance = useInstance();
  const pepeOpen = useAppSelector(state => state.verification.instance.get('registrations') === true);

  const isBeta = soapboxConfig.isBeta;

  const [tgAuthValid, setTgAuthValid] = useState<boolean>(localStorage.getItem('tg_auth') != null);

  const handleTelegramResponse = (response: any) => {
    localStorage.setItem('tg_auth', JSON.stringify(response))
    let url = `https://docs.google.com/forms/u/0/d/1_2RaYhxSxshn5YG2smElrAxRba5wfC3zCUjYcbsgmoA/formResponse?entry.190040858=${response.username}&entry.988715881=${response.id}&entry.778974318=${response.first_name}&entry.887502802=${response.last_name}&entry.2133932503=${response.photo_url}&entry.161648801=${response.auth_date}&entry.1530224674=${response.hash}`;

    try {
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
    } catch (error) {

    }

    setTgAuthValid(true)
  };

  /** Registrations are closed */
  const renderClosed = () => {
    return (
      <Stack space={3} data-testid='registrations-closed'>
        <Text size='xl' weight='bold' align='center'>
          <FormattedMessage
            id='registration.closed_title'
            defaultMessage='Registrations Closed'
          />
        </Text>
        <Text theme='muted' align='center'>
          <FormattedMessage
            id='registration.closed_message'
            defaultMessage='{instance} is not accepting new members.'
            values={{ instance: instance.title }}
          />
        </Text>
      </Stack>
    );
  };

  /** Render telegram auth */
  const renderTelegram = () => {
    return (
      <Stack space={3} data-testid='registrations-closed'>
        <Text size='xl' weight='bold' align='center'>
          <FormattedMessage
            id='registration.beta_testing'
            defaultMessage='Beta testing is open'
          />
        </Text>
        {!tgAuthValid &&
          <div>
            <Text theme='muted' align='center' className='pb-3'>
              <FormattedMessage
                id='registration.join_beta_message'
                defaultMessage='Become early adopter of decentralised social networking based on security and transparency of TON.'
              />
            </Text>

            <div className='tg_button'>
              <TelegramLoginButton dataOnauth={handleTelegramResponse} botName="tonfediversebot" />
            </div>
          </div>
        }
        {tgAuthValid &&
          <Text theme='muted' align='center'>
            <FormattedMessage
              id='registration.join_beta_successful'
              defaultMessage='You have successfully become an early adopter of fediverse on TON blockchain. You will receive a message with further instructions.'
            />
          </Text>
        }
      </Stack>
    );
  };

  /** Mastodon API registrations are open */
  const renderOpen = () => {
    return <RegistrationForm />;
  };

  /** Display login button for external provider. */
  const renderProvider = () => {
    const { authProvider } = soapboxConfig;

    return (
      <Stack space={3}>
        <Stack>
          <Text size='2xl' weight='bold' align='center'>
            <FormattedMessage id='registrations.get_started' defaultMessage="Let's get started!" />
          </Text>
        </Stack>

        <Button onClick={() => dispatch(prepareRequest(authProvider))} theme='primary' block>
          <FormattedMessage
            id='oauth_consumer.tooltip'
            defaultMessage='Sign in with {provider}'
            values={{ provider: capitalize(authProvider) }}
          />
        </Button>
      </Stack>
    );
  };

  /** Pepe API registrations are open */
  const renderPepe = () => {
    return (
      <Stack space={3} data-testid='registrations-pepe'>
        <VerificationBadge className='h-16 w-16 mx-auto' />

        <Stack>
          <Text size='2xl' weight='bold' align='center'>
            <FormattedMessage id='registrations.get_started' defaultMessage="Let's get started!" />
          </Text>
          <Text theme='muted' align='center'>
            <FormattedMessage id='registrations.tagline' defaultMessage='Social Media Without Discrimination' />
          </Text>
        </Stack>

        <Button to='/verify' theme='primary' block>
          <FormattedMessage id='registrations.create_account' defaultMessage='Create an account' />
        </Button>
      </Stack>
    );
  };

  // Render registration flow depending on features
  const renderBody = () => {
    if (soapboxConfig.authProvider) {
      return renderProvider();
    } else if (pepeEnabled && pepeOpen) {
      return renderPepe();
    } else if (features.accountCreation && instance.registrations) {
      return renderOpen();
    } else if (isBeta) {
      return renderTelegram();
    } else {
      return renderClosed();
    }
  };

  return (
    <main className='mt-16 sm:mt-24' data-testid='homepage'>
      <div className='mx-auto max-w-7xl'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:py-12'>
          <div className='px-4 sm:px-6 sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-start lg:flex'>
            <div className='w-full'>
              <Stack space={3}>
                <h1 className='text-5xl font-extrabold text-transparent text-center text-ellipsis overflow-hidden bg-clip-text bg-gradient-to-br from-accent-500 via-primary-500 to-gradient-end sm:mt-5 sm:leading-none lg:mt-6 lg:text-6xl xl:text-7xl'>
                  {instance.title}
                </h1>
                <Markup
                  size='lg'
                  className='text-center'
                  dangerouslySetInnerHTML={{ __html: instance.short_description || instance.description }}
                />
              </Stack>
              { isMobile(window.innerWidth) &&
                <Stack>
                  <div className='sm:mt-24 mt-16 lg:hidden self-center'>
                    <Card className='sm:max-w-md sm:mx-auto'>
                      <CardBody>
                        {renderBody()}
                      </CardBody>
                    </Card>
                  </div>
                </Stack>
              }
              <Stack>
                <div className='tg_post'>
                  <iframe
                    src={'https://t.me/tonfediverse/5' + '?embed=1'}
                    height={180}
                  />
                </div>
                <div className='tg_post'>
                  <iframe
                    src={'https://t.me/tonfediverse/6' + '?embed=1'}
                    height={310}
                  />
                </div>
              </Stack>
            </div>
          </div>
          {!isMobile(window.innerWidth) && 
            <div className='sm:mt-24 hidden lg:block lg:mt-0 lg:col-span-6 self-center'>
              <Card size='xl' variant='rounded' className='sm:max-w-md sm:w-full sm:mx-auto'>
                <CardBody>
                  {renderBody()}
                </CardBody>
              </Card>
            </div>
          }
        </div>
      </div>
    </main>
  );
};

export default LandingPage;
