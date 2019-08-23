import { Component, QueryList, ViewChildren } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as _ from 'lodash';
import { SelectWalletPage } from '../../pages/select-wallet/select-wallet';
import { ConfigProvider, Logger, PriceProvider } from '../../providers';
import { PriceChart } from './price-chart/price-chart';

@Component({
  selector: 'price-card',
  templateUrl: 'price-card.html'
})
export class PriceCard {
  @ViewChildren('canvas') canvases: QueryList<PriceChart>;

  public lineChart: any;
  public isoCode: string;
  public lastDates = 6;
  public coins = [
            {
                unitCode: 'PREMIUM',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(247,146,26,1)',
                gradientBackgroundColor: 'rgba(247,146,26, 0.2)',
                name: 'Premium Hemp'
            },
            {
                unitCode: 'BIOMASS',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(47,207,110,1)',
                gradientBackgroundColor: 'rgba(47,207,110, 0.2)',
                name: 'Biomass Hemp'
            },
            {
                unitCode: 'ISO999',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(47,207,110,1)',
                gradientBackgroundColor: 'rgba(47,207,110, 0.2)',
                name: 'ISO999'
            },
            {
                unitCode: 'H20-SOL',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(47,207,110,1)',
                gradientBackgroundColor: 'rgba(47,207,110, 0.2)',
                name: 'H20-SOL'
            },
            {
                unitCode: 'DISTIL',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(47,207,110,1)',
                gradientBackgroundColor: 'rgba(47,207,110, 0.2)',
                name: 'DISTIL'
            },
            {
                unitCode: 'CRUDe',
                historicalRates: [],
                currentPrice: 0,
                averagePrice: 0,
                backgroundColor: 'rgba(47,207,110,1)',
                gradientBackgroundColor: 'rgba(47,207,110, 0.2)',
                name: 'CRUDe'
            }
        ];
        public fiatCodes = [
            'CHF'
        ];

  constructor(
    private navCtrl: NavController,
    private priceProvider: PriceProvider,
    private configProvider: ConfigProvider,
    private logger: Logger
  ) {
    this.getPrices();
  }

  public getPrices() {
    this.setIsoCode();
    _.forEach(this.coins, (coin, index) => {
	console.log("Coin", coin, "Index", index);
      this.priceProvider
        .getHistoricalBitcoinPrice(this.isoCode, coin.unitCode)
        .subscribe(
          response => {
            const resFiltered = _.filter(response, 'rate');
            this.coins[index].historicalRates = resFiltered
              .map(res => res.rate)
              .reverse();
            this.updateValues(index);
          },
          err => {
            this.logger.error('Error getting rates:', err);
          }
        );
    });
  }

  public updateCurrentPrice() {
    _.forEach(this.coins, (coin, i) => {
      this.priceProvider
        .getCurrentBitcoinPrice(this.isoCode, coin.unitCode)
        .subscribe(
          response => {
            this.coins[i].historicalRates[
              this.coins[i].historicalRates.length - 1
            ] = response.rate;
            this.updateValues(i);
          },
          err => {
            this.logger.error('Error getting current rate:', err);
          }
        );
    });
  }

  private updateValues(i: number) {
    this.coins[i].currentPrice = this.coins[i].historicalRates[
      this.coins[i].historicalRates.length - 1
    ];
    this.coins[i].averagePrice =
      ((this.coins[i].currentPrice - this.coins[i].historicalRates[0]) * 100) /
      this.coins[i].historicalRates[0];
    this.drawCanvas(i);
  }

  private drawCanvas(index) {
    this.canvases.toArray().forEach((canvas, i) => {
      if (index == i) canvas.drawCanvas(this.coins[i]);
    });
  }

  public updateCharts() {
    this.isoCode ===
    this.configProvider.get().wallet.settings.alternativeIsoCode
      ? this.updateCurrentPrice()
      : this.getPrices();
  }

  public onBuyButton(coin, isoCode) {
    this.navCtrl.push(SelectWalletPage, {coin, isoCode});
  }
  private setIsoCode() {
    const alternativeIsoCode = this.configProvider.get().wallet.settings
      .alternativeIsoCode;
    this.isoCode = _.includes(this.fiatCodes, alternativeIsoCode)
      ? alternativeIsoCode
      : 'USD';
  }
}
