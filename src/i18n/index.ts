import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import enOrders from './locales/en/orders.json';
import enAdmin from './locales/en/admin.json';
import enCrm from './locales/en/crm.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';

i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        common: enCommon,
        orders: enOrders,
        admin: enAdmin,
        crm: enCrm,
        auth: enAuth,
        errors: enErrors,
      },
    },
    defaultNS: 'common',
  });

export default i18n;
