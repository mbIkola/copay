import { EnvironmentSchema } from './schema';

/**
 * Environment: prod
 */
const env: EnvironmentSchema = {
  name: 'production',
  enableAnimations: true,
  ratesAPI: {
    swx: 'https://api.swissx.com/api/rates',
    bch: 'https://bitpay.com/api/rates/bch'
  },
  activateScanner: true
};

export default env;
