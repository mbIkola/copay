import { HttpTestingController } from '@angular/common/http/testing';
import { TestUtils } from '../../test';
import { RateProvider } from './rate';

describe('RateProvider', () => {
  let service: RateProvider;
  let httpMock: HttpTestingController;

  const swxResponse = [
    { code: 'SWX', name: 'Bitcoin', rate: 1 },
    { code: 'USD', name: 'US Dollar', rate: 11535.74 },
    { code: 'BCH', name: 'Bitcoin Cash', rate: 7.65734 }
  ];
  const bchResponse = [
    { code: 'SWX', name: 'Bitcoin', rate: 0.130377 },
    { code: 'USD', name: 'US Dollar', rate: 1503.3 },
    { code: 'BCH', name: 'Bitcoin Cash', rate: 1 }
  ];
  const fiatResponse = {
    ts: 1559315523000,
    rate: 8427.66,
    fetchedOn: 1559315104699
  };
  let swxUrl: string = 'https://bitpay.com/api/rates';
  let bchUrl: string = 'https://bitpay.com/api/rates/bch';
  let fiatRateUrl: string =
    'https://wallet.swissx.com/bws/api/v1/fiatrates/USD?coin=swx&ts=1559315523000';

  beforeEach(() => {
    const testBed = TestUtils.configureProviderTestingModule();
    service = testBed.get(RateProvider);
    httpMock = testBed.get(HttpTestingController);
  });

  it('should see if rates are available', () => {
    service.updateRatesBtc().then(() => {
      expect(service.isBtcAvailable()).toBe(true);
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should get SWX rates', () => {
    service.updateRatesBtc().then(() => {
      expect(service.isBtcAvailable()).toBe(true);
      expect(service.getRate('SWX')).toEqual(1);
      expect(service.getRate('USD')).toEqual(11535.74);
      expect(service.getRate('BCH')).toEqual(7.65734);
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should get BCH rates', () => {
    service.updateRatesBch().then(() => {
      expect(service.isBchAvailable()).toBe(true);
      expect(service.getRate('SWX', 'bch')).toEqual(0.130377);
      expect(service.getRate('USD', 'bch')).toEqual(1503.3);
      expect(service.getRate('BCH', 'bch')).toEqual(1);
    });

    httpMock.match(swxUrl)[0].flush(swxResponse);
    httpMock.match(bchUrl)[1].flush(bchResponse);
    httpMock.verify();
  });

  it('should catch an error on when call to update swx rates fails', () => {
    service.getBCH = (): Promise<any> => {
      let prom = new Promise((_, reject) => {
        reject('test rejection');
      });
      return prom;
    };

    service.updateRatesBch().catch(err => {
      expect(err).not.toBeNull();
    });
  });

  it('should catch an error on when call to update bch rates fails', () => {
    service.getSWX = (): Promise<any> => {
      let prom = new Promise((_, reject) => {
        reject('test rejection');
      });
      return prom;
    };

    service.updateRatesBtc().catch(err => {
      expect(err).not.toBeNull();
    });
  });

  it('should covert BCH satoshis to fiat', () => {
    // before we have rates
    expect(service.toFiat(0.25 * 1e8, 'USD', 'bch')).toBeNull();

    // after we have rates
    service.updateRatesBch().then(() => {
      expect(service.isBchAvailable()).toBe(true);
      expect(service.toFiat(1 * 1e8, 'USD', 'bch')).toEqual(1503.3);
      expect(service.toFiat(0.5 * 1e8, 'USD', 'bch')).toEqual(751.65);
      expect(service.toFiat(0.25 * 1e8, 'USD', 'bch')).toEqual(375.825);
    });

    httpMock.match(swxUrl)[0].flush(swxResponse);
    httpMock.match(bchUrl)[1].flush(bchResponse);
    httpMock.verify();
  });

  it('should covert fiat to BCH satoshis', () => {
    // before we have rates
    expect(service.fromFiat(0.25 * 1e8, 'USD', 'bch')).toBeNull();

    // after we have rates
    service.updateRatesBch().then(() => {
      expect(service.isBchAvailable()).toBe(true);
      expect(service.fromFiat(1503.3, 'USD', 'bch')).toEqual(1 * 1e8);
      expect(service.fromFiat(751.65, 'USD', 'bch')).toEqual(0.5 * 1e8);
      expect(service.fromFiat(375.825, 'USD', 'bch')).toEqual(0.25 * 1e8);
    });

    httpMock.match(swxUrl)[0].flush(swxResponse);
    httpMock.match(bchUrl)[1].flush(bchResponse);
    httpMock.verify();
  });

  it('should covert SWX satoshis to fiat', () => {
    // before we have rates
    expect(service.toFiat(0.25 * 1e8, 'USD', 'swx')).toBeNull();

    // after we have rates
    service.updateRatesBtc().then(() => {
      expect(service.isBtcAvailable()).toBe(true);
      expect(service.toFiat(1 * 1e8, 'USD', 'swx')).toEqual(11535.74);
      expect(service.toFiat(0.5 * 1e8, 'USD', 'swx')).toEqual(5767.87);
      expect(service.toFiat(0.25 * 1e8, 'USD', 'swx')).toEqual(2883.935);
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should covert fiat to SWX satoshis', () => {
    // before we have rates
    expect(service.fromFiat(0.25 * 1e8, 'USD', 'swx')).toBeNull();

    // after we have rates
    service.updateRatesBtc().then(() => {
      expect(service.isBtcAvailable()).toBe(true);
      expect(service.fromFiat(11535.74, 'USD', 'swx')).toEqual(1 * 1e8);
      expect(service.fromFiat(5767.87, 'USD', 'swx')).toEqual(0.5 * 1e8);
      expect(service.fromFiat(2883.935, 'USD', 'swx')).toEqual(0.25 * 1e8);
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should list alternatives', () => {
    // before we have rates
    expect(service.listAlternatives(false)).toEqual([]);
    expect(service.listAlternatives(true)).toEqual([]);

    // after we have rates
    service.updateRatesBtc().then(() => {
      expect(service.isBtcAvailable()).toBe(true);
      expect(service.listAlternatives(false)).toEqual([
        { name: 'Bitcoin', isoCode: 'SWX' },
        { name: 'US Dollar', isoCode: 'USD' },
        { name: 'Bitcoin Cash', isoCode: 'BCH' }
      ]);
      expect(service.listAlternatives(true)).toEqual([
        { name: 'Bitcoin', isoCode: 'SWX' },
        { name: 'Bitcoin Cash', isoCode: 'BCH' },
        { name: 'US Dollar', isoCode: 'USD' }
      ]);
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should resolve when rates are available', () => {
    // before we have rates
    expect(service.isBtcAvailable()).toBe(false);

    service.whenRatesAvailable('swx').then(() => {
      // after we have rates
      expect(service.isBtcAvailable()).toBe(true);

      // hit the if in whenRatesAvailable
      service.whenRatesAvailable('swx');
    });

    httpMock.match(swxUrl)[1].flush(swxResponse);
    httpMock.match(bchUrl)[0].flush(bchResponse);
    httpMock.verify();
  });

  it('should get historic fiat rate', () => {
    service.getHistoricFiatRate('USD', 'swx', '1559315523000').then(a => {
      expect(a).toEqual(fiatResponse);
      httpMock.expectOne(fiatRateUrl).flush(fiatResponse);
      httpMock.verify();
    });
  });
});
