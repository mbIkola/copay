import { Component, NgZone } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavParams } from 'ionic-angular';
// import { NavController } from 'ionic-angular';
import * as _ from 'lodash';
import {
  AppProvider,
  ExternalLinkProvider,
  Logger,
  PersistenceProvider,
  ProfileProvider,
  WalletProvider
} from '../../providers';


@Component({
  selector: 'select-wallet',
  templateUrl: 'select-wallet.html'
})
export class SelectWalletPage {
  constructor(
              private logger: Logger,
              private profileProvider: ProfileProvider,
              private appProvider: AppProvider,
              private walletProvider: WalletProvider,
              private translate: TranslateService,
              private externalLinkProvider: ExternalLinkProvider,
              private persistenceProvider: PersistenceProvider,
              private navParam: NavParams
  ) {
    this.zone = new NgZone({ enableLongStackTrace: false });
  }

  public wallets;
  private zone: NgZone;
  public txpsN: number;

  ionViewWillEnter() {
    // Update list of wallets, status and TXPs
    this.setWallets(false);
  }

  public onWalletAction(wallet, action, slidingItem) {
    // const tabMap = {
    //   receive: 0,
    //   view: 1,
    //   send: 2
    // };
    // const selectedTabIndex = tabMap[action];
    // this.goToWalletDetails(wallet, { selectedTabIndex });

    // this.logger.debug("Wallet selected: ", wallet, action, this.navCtrl);

    this.logger.debug(
      `Redirecting to order page: action=${action}
       copayerId=${wallet.copayerId}&wallet=${wallet.credentials.walletId}&walletName=${wallet.credentials.walletName}
      
       navParams: ${JSON.stringify(this.navParam.data)}
       `);
    // this.navCtrl.push(HomePage);
    const targetAction = this.navParam.data.action === 'sell' ?  'sell' : '';
    const product = this.navParam.data.coin.unitCode;
    const currency = this.navParam.data.coin.isoCode;
    const currentPrice = this.navParam.data.coin.currentPrice;
    this.openExternalLink(
      `https://exchange.swissx.com/${targetAction}`+
      `?copayerId=${wallet.copayerId}&wallet=${wallet.credentials.walletId}&walletName=${wallet.credentials.walletName}`+
      `&product=${product}&currency=${currency}&rate=${currentPrice}`
    );
    slidingItem.close();
  }


  public openExternalLink(url: string): void {
    const optIn = true;
    const title = null;
    const message = this.translate.instant(
      'You will be redirected to Swissx exchange website.'
    );
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }


  private setWallets = (shouldUpdate: boolean = false) => {
    // TEST
    /*
    setTimeout(() => {
      this.logger.info('##### Load BITCOIN URI TEST');
      this.incomingDataProvider.redir('bitcoin:3KeJU7VxSKC451pPNSWjF6zK3gm2x7re7q?amount=0.0001');
    },100);
    */

    this.profileProvider.setLastKnownBalance();
    this.wallets = this.profileProvider.getWallets();

    // Avoid heavy tasks that can slow down the unlocking experience
    if (!this.appProvider.isLockModalOpen && shouldUpdate) {
      this.fetchAllWalletsStatus();
    }
  };


  private fetchAllWalletsStatus(): void {
    if (_.isEmpty(this.wallets)) return;

    this.logger.debug('fetchAllWalletsStatus');
    const pr = wallet => {
      return this.walletProvider
        .fetchStatus(wallet, {})
        .then(async status => {
          wallet.cachedStatus = status;
          wallet.error = wallet.errorObj = null;


          return this.persistenceProvider.setLastKnownBalance(
            wallet.id,
            wallet.cachedStatus.availableBalanceStr
          );
        });
    };

    const promises = [];

    _.each(this.wallets, wallet => {
      promises.push(pr(wallet));
    });

    Promise.all(promises).then(() => {
      this.updateTxps();
    });

  }
  private updateTxps() {
    this.profileProvider
      .getTxps({ limit: 3 })
      .then(data => {
        this.zone.run(() => {
          this.txpsN = data.n;
        });
      })
      .catch(err => {
        this.logger.error(err);
      });
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: SelectWallet');
  }
  //
  // public goToSelectCurrencyPage(isShared: boolean, nextPage: string): void {
  //   this.navCtrl.push(SelectCurrencyPage, { isShared, nextPage });
  // }
  //
  // public goToJoinWallet(): void {
  //   this.navCtrl.push(JoinWalletPage);
  // }
}
