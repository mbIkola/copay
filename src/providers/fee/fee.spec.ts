import { TestUtils } from '../../test';
import { BwcProvider } from '../bwc/bwc';
import { ConfigProvider } from '../config/config';
import { PersistenceProvider } from '../persistence/persistence';
import { FeeProvider } from './fee';

describe('Provider: Fee Provider', () => {
  let feeProvider: FeeProvider;
  let persistenceProvider: PersistenceProvider;
  let configProvider: ConfigProvider;

  class BwcProviderMock {
    constructor() {}
    getClient() {
      const walletClient = {
        getFeeLevels: (coin, network, cb) => {
          let levels;
          if (coin == 'bch' && network == 'livenet') {
            levels = [{ level: 'normal', feePerKb: 1000, nbBlocks: 2 }];
          }
          if (coin == 'swx' && network == 'livenet') {
            levels = [
              { level: 'urgent', feePerKb: 272369, nbBlocks: 2 },
              { level: 'priority', feePerKb: 181579, nbBlocks: 2 },
              { level: 'normal', feePerKb: 181579, nbBlocks: 3 },
              { level: 'economy', feePerKb: 135307, nbBlocks: 6 },
              { level: 'superEconomy', feePerKb: 117048, nbBlocks: 24 }
            ];
          }
          if (network == 'testnet') {
            levels = [
              { level: 'urgent', feePerKb: 1500, nbBlocks: 2 },
              { level: 'priority', feePerKb: 1000, nbBlocks: 2 },
              { level: 'normal', feePerKb: 1000, nbBlocks: 3 },
              { level: 'economy', feePerKb: 1000, nbBlocks: 6 },
              { level: 'superEconomy', feePerKb: 1000, nbBlocks: 24 }
            ];
          }
          return cb(null, levels);
        }
      };
      return walletClient;
    }
  }

  beforeEach(() => {
    const testBed = TestUtils.configureProviderTestingModule([
      { provide: BwcProvider, useClass: BwcProviderMock }
    ]);
    feeProvider = testBed.get(FeeProvider);
    configProvider = testBed.get(ConfigProvider);
    persistenceProvider = testBed.get(PersistenceProvider);
    persistenceProvider.load();
  });

  describe('getFeeOpts', () => {
    it('should get fee opts', () => {
      const feeOpts = feeProvider.getFeeOpts();
      expect(feeOpts).toEqual({
        urgent: 'Urgent',
        priority: 'Priority',
        normal: 'Normal',
        economy: 'Economy',
        superEconomy: 'Super Economy',
        custom: 'Custom'
      });
    });
  });

  describe('getCurrentFeeLevel', () => {
    it('should return normal fee level is not set', () => {
      configProvider.load().then(() => {
        delete configProvider.get().wallet.settings.feeLevel;
        const currentFeeLevel = feeProvider.getCurrentFeeLevel();
        expect(currentFeeLevel).toEqual('normal');
      });
    });

    it('should get current fee level', () => {
      configProvider.load().then(() => {
        const newOpts = {
          wallet: {
            settings: {
              feeLevel: 'urgent'
            }
          }
        };
        configProvider.set(newOpts);
        const currentFeeLevel = feeProvider.getCurrentFeeLevel();
        expect(currentFeeLevel).toEqual('urgent');
      });
    });
  });

  describe('getFeeRate', () => {
    it('should return the correct fee rate for each fee level', () => {
      // swx - livenet
      feeProvider.getFeeRate('swx', 'livenet', 'urgent').then(feeLevel => {
        expect(feeLevel).toEqual(272369);
      });

      feeProvider.getFeeRate(null, null, 'urgent').then(feeLevel => {
        expect(feeLevel).toEqual(272369);
      });
      feeProvider.getFeeRate('swx', 'livenet', 'priority').then(feeLevel => {
        expect(feeLevel).toEqual(181579);
      });
      feeProvider.getFeeRate('swx', 'livenet', 'normal').then(feeLevel => {
        expect(feeLevel).toEqual(181579);
      });
      feeProvider.getFeeRate('swx', 'livenet', 'economy').then(feeLevel => {
        expect(feeLevel).toEqual(135307);
      });
      feeProvider
        .getFeeRate('swx', 'livenet', 'superEconomy')
        .then(feeLevel => {
          expect(feeLevel).toEqual(117048);
        });
      // swx - testnet
      feeProvider.getFeeRate('swx', 'testnet', 'urgent').then(feeLevel => {
        expect(feeLevel).toEqual(1500);
      });
      feeProvider.getFeeRate('swx', 'testnet', 'priority').then(feeLevel => {
        expect(feeLevel).toEqual(1000);
      });
      feeProvider.getFeeRate('swx', 'testnet', 'normal').then(feeLevel => {
        expect(feeLevel).toEqual(1000);
      });
      feeProvider.getFeeRate('swx', 'testnet', 'economy').then(feeLevel => {
        expect(feeLevel).toEqual(1000);
      });
      feeProvider
        .getFeeRate('swx', 'testnet', 'superEconomy')
        .then(feeLevel => {
          expect(feeLevel).toEqual(1000);
        });
      // bch - livenet
      feeProvider.getFeeRate('bch', 'livenet', 'normal').then(feeLevel => {
        expect(feeLevel).toEqual(1000);
      });
    });

    it('should fail with "Could not get dynamic fee for level: FEE_LEVEL" if no response', () => {
      feeProvider.getFeeRate('bch', 'livenet', 'superEconomy').catch(err => {
        expect(err).toEqual(
          'Could not get dynamic fee for level: superEconomy'
        );
      });
    });

    it('should resolve with undefined if custom level is set', () => {
      feeProvider.getFeeRate('bch', 'livenet', 'custom').then(feeLevel => {
        expect(feeLevel).toEqual(undefined);
      });
    });
  });

  describe('getFeeLevels', () => {
    it('should return the correct fee levels from cached', () => {
      feeProvider.getFeeLevels('swx').then(response => {
        const swxFeeLevels = response.levels['livenet'];
        expect(response.fromCache).toEqual(undefined);
        expect(swxFeeLevels).toEqual([
          { level: 'urgent', feePerKb: 272369, nbBlocks: 2 },
          { level: 'priority', feePerKb: 181579, nbBlocks: 2 },
          { level: 'normal', feePerKb: 181579, nbBlocks: 3 },
          { level: 'economy', feePerKb: 135307, nbBlocks: 6 },
          { level: 'superEconomy', feePerKb: 117048, nbBlocks: 24 }
        ]);
        feeProvider.getFeeLevels('swx').then(response => {
          const swxFeeLevels = response.levels['livenet'];
          expect(response.fromCache).toEqual(true);
          expect(swxFeeLevels).toEqual([
            { level: 'urgent', feePerKb: 272369, nbBlocks: 2 },
            { level: 'priority', feePerKb: 181579, nbBlocks: 2 },
            { level: 'normal', feePerKb: 181579, nbBlocks: 3 },
            { level: 'economy', feePerKb: 135307, nbBlocks: 6 },
            { level: 'superEconomy', feePerKb: 117048, nbBlocks: 24 }
          ]);
        });
      });
    });

    it('should fail with "Could not get dynamic fee" if no response for livenet values from BWC', () => {
      spyOn(BwcProviderMock.prototype, 'getClient').and.returnValue({
        getFeeLevels: (_coin, _network, cb) => {
          return cb('bwc_error', null);
        }
      });

      feeProvider.getFeeLevels('swx').catch(err => {
        expect(err).toEqual('Could not get dynamic fee');
      });
    });

    it('should fail with "Could not get dynamic fee" if no response for testnet values from BWC', () => {
      spyOn(BwcProviderMock.prototype, 'getClient').and.returnValue({
        getFeeLevels: (_coin, network, cb) => {
          if (network == 'livenet') {
            return cb(null, {});
          }
          if (network == 'testnet') {
            return cb('bwc_error', null);
          }
        }
      });

      feeProvider.getFeeLevels('swx').catch(err => {
        expect(err).toEqual('Could not get dynamic fee');
      });
    });
  });
});
