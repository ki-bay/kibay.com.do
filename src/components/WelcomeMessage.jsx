import React from 'react';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const WelcomeMessage = () => {
  const { t } = useTranslation('welcomeMessage');
  return (
    <m.p
      className='text-sm text-foreground leading-5 w-full font-light'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      {t('prompt')}
    </m.p>
  );
};

export default WelcomeMessage;