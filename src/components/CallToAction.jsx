import React from 'react';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const CallToAction = () => {
  const { t } = useTranslation('callToAction');
  return (
    <m.h1
      className='text-xl font-normal text-foreground leading-8 w-full'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      {t('headline')}
    </m.h1>
  );
};

export default CallToAction;