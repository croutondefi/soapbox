import { AxiosError } from 'axios';
import React from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import snackbar from 'soapbox/actions/snackbar';
import { checkEmailVerification, postEmailVerification, requestEmailVerification } from 'soapbox/actions/verification';
import Icon from 'soapbox/components/icon';
import { Button, Form, FormGroup, Input, Text } from 'soapbox/components/ui';
import { useAppDispatch, useAppSelector } from 'soapbox/hooks';

const messages = defineMessages({
  verificationSuccess: { id: 'email_verification.success', defaultMessage: 'Verification email sent successfully.' },
  verificationFail: { id: 'email_verification.fail', defaultMessage: 'Failed to request email verification.' },
  verificationFailTakenAlert: { id: 'email_verifilcation.exists', defaultMessage: 'This email has already been taken.' },
  verificationFailTaken: { id: 'email_verification.taken', defaultMessage: 'is taken' },
  emailLabel: { id: 'email_verification.email.label', defaultMessage: 'E-mail address' },
});

const Statuses = {
  IDLE: 'IDLE',
  REQUESTED: 'REQUESTED',
  FAIL: 'FAIL',
};

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+$/;

interface IEmailSent {
  handleSubmit: React.FormEventHandler,
}

const EmailSent: React.FC<IEmailSent> = ({ handleSubmit }) => {
  const dispatch = useAppDispatch();

  const checkEmailConfirmation = () => {
    dispatch(checkEmailVerification())
      .then(() => dispatch(postEmailVerification()))
      .catch(() => null);
  };

  React.useEffect(() => {
    const intervalId = setInterval(() => checkEmailConfirmation(), 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className='sm:pt-10 mx-auto flex flex-col items-center justify-center'>
      <Icon src={require('@tabler/icons/send.svg')} className='text-primary-600 dark:text-primary-400 h-12 w-12 mb-5' />

      <div className='space-y-2 text-center mb-4'>
        <Text weight='bold' size='3xl'>We sent you an email</Text>
        <Text theme='muted'>Click on the link in the email to validate your email.</Text>
      </div>

      <Button theme='tertiary' onClick={handleSubmit}>Resend verification email</Button>
    </div>
  );
};

const EmailVerification = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const isLoading = useAppSelector((state) => state.verification.isLoading) as boolean;

  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState(Statuses.IDLE);
  const [errors, setErrors] = React.useState<Array<string>>([]);

  const isValid = email.length > 0 && EMAIL_REGEX.test(email);

  const onChange = React.useCallback((event) => setEmail(event.target.value), []);

  const handleSubmit: React.FormEventHandler = React.useCallback((event) => {
    event.preventDefault();
    setErrors([]);

    submitEmailForVerification();
  }, [email]);

  const submitEmailForVerification = () => {
    return dispatch(requestEmailVerification((email)))
      .then(() => {
        setStatus(Statuses.REQUESTED);

        dispatch(
          snackbar.success(
            intl.formatMessage(messages.verificationSuccess),
          ),
        );
      })
      .catch((error: AxiosError) => {
        const errorMessage = (error.response?.data as any)?.error;
        const isEmailTaken = errorMessage === 'email_taken';
        let message = intl.formatMessage(messages.verificationFail);

        if (isEmailTaken) {
          message = intl.formatMessage(messages.verificationFailTakenAlert);
        } else if (errorMessage) {
          message = errorMessage;
        }

        if (isEmailTaken) {
          setErrors([intl.formatMessage(messages.verificationFailTaken)]);
        }

        dispatch(snackbar.error(message));
        setStatus(Statuses.FAIL);
      });
  };

  if (status === Statuses.REQUESTED) {
    return <EmailSent handleSubmit={handleSubmit} />;
  }

  return (
    <div>
      <div className='pb-4 sm:pb-10 mb-4 border-b border-gray-200 dark:border-gray-800 border-solid -mx-4 sm:-mx-10'>
        <h1 className='text-center font-bold text-2xl'>
          <FormattedMessage id='email_verification.header' defaultMessage='Enter your email address' />
        </h1>
      </div>

      <div className='sm:pt-10 sm:w-2/3 md:w-1/2 mx-auto'>
        <Form onSubmit={handleSubmit}>
          <FormGroup labelText={intl.formatMessage(messages.emailLabel)} errors={errors}>
            <Input
              type='email'
              value={email}
              name='email'
              onChange={onChange}
              placeholder='you@email.com'
              required
            />
          </FormGroup>

          <div className='text-center'>
            <Button block theme='primary' type='submit' disabled={isLoading || !isValid}>
              <FormattedMessage id='onboarding.next' defaultMessage='Next' />
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default EmailVerification;
