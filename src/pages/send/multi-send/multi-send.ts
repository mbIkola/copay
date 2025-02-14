import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Events,
  ModalController,
  NavController,
  NavParams
} from 'ionic-angular';
import * as _ from 'lodash';

// Providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { AddressProvider } from '../../../providers/address/address';
import { AppProvider } from '../../../providers/app/app';
import { BwcProvider } from '../../../providers/bwc/bwc';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { IncomingDataProvider } from '../../../providers/incoming-data/incoming-data';
import { Logger } from '../../../providers/logger/logger';
import { ProfileProvider } from '../../../providers/profile/profile';
import { TxFormatProvider } from '../../../providers/tx-format/tx-format';
import { WalletTabsProvider } from '../../wallet-tabs/wallet-tabs.provider';

// Pages
import { WalletTabsChild } from '../../wallet-tabs/wallet-tabs-child';
import { AmountPage } from '../amount/amount';
import { ConfirmPage } from '../confirm/confirm';
import { TransferToModalPage } from '../transfer-to-modal/transfer-to-modal';

@Component({
  selector: 'page-multi-send',
  templateUrl: 'multi-send.html'
})
export class MultiSendPage extends WalletTabsChild {
  public parsedData: any;
  public search: string = '';
  public multiRecipients: any = [];
  public contactsList = [];
  public filteredContactsList = [];
  public filteredWallets = [];
  public hasContacts: boolean;
  public contactsShowMore: boolean;
  public amount: string;
  public fiatAmount: number;
  public fiatCode: string;
  public invalidAddress: boolean;
  public isDisabledContinue: boolean;

  private scannerOpened: boolean;
  private validDataTypeMap: string[] = [
    'BitcoinAddress',
    'BitcoinCashAddress',
    'BitcoinUri',
    'BitcoinCashUri'
  ];

  constructor(
    navCtrl: NavController,
    private navParams: NavParams,
    profileProvider: ProfileProvider,
    private logger: Logger,
    private incomingDataProvider: IncomingDataProvider,
    private addressProvider: AddressProvider,
    private events: Events,
    walletTabsProvider: WalletTabsProvider,
    private actionSheetProvider: ActionSheetProvider,
    private externalLinkProvider: ExternalLinkProvider,
    private appProvider: AppProvider,
    private translate: TranslateService,
    private modalCtrl: ModalController,
    private decimalPipe: DecimalPipe,
    private txFormatProvider: TxFormatProvider,
    private bwcProvider: BwcProvider
  ) {
    super(navCtrl, profileProvider, walletTabsProvider);
    this.isDisabledContinue = true;
  }

  ionViewDidLoad() {
    this.logger.info('Loaded: MultiSendPage');
  }

  ionViewWillEnter() {
    this.events.subscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.subscribe('addRecipient', newRecipient => {
      this.addRecipient(newRecipient);
      this.checkGoToConfirmButton();
    });
  }

  ionViewWillLeave() {
    this.events.unsubscribe('Local/AddressScan', this.updateAddressHandler);
    this.events.unsubscribe('addRecipient');
  }

  private updateAddressHandler: any = data => {
    this.search = data.value;
    this.processInput();
  };

  public openTransferToModal(): void {
    let modal = this.modalCtrl.create(
      TransferToModalPage,
      {
        wallet: this.wallet
      },
      {
        showBackdrop: false,
        enableBackdropDismiss: true,
        cssClass: 'wallet-details-modal'
      }
    );
    modal.present();
  }

  public openAmountModal(item, index): void {
    let modal = this.modalCtrl.create(
      AmountPage,
      {
        wallet: this.wallet,
        useAsModal: true
      },
      {
        showBackdrop: false,
        enableBackdropDismiss: true,
        cssClass: 'wallet-details-modal'
      }
    );
    modal.present();
    modal.onDidDismiss(data => {
      this.cleanSearch();
      if (!data) return;

      let altAmountStr = this.txFormatProvider.formatAlternativeStr(
        this.wallet.coin,
        +data.amount
      );

      item.amount = +data.amount;
      item.altAmountStr = altAmountStr;
      item.fiatAmount = data.fiatAmount;
      item.fiatCode = data.fiatCode;
      item.amountToShow = this.decimalPipe.transform(
        data.amount / 1e8,
        '1.2-6'
      );
      this.multiRecipients[index] = item;
      this.checkGoToConfirmButton();
    });
  }

  public addRecipient(recipient): void {
    let amountToShow = +recipient.amount
      ? this.decimalPipe.transform(+recipient.amount / 1e8, '1.2-6')
      : null;

    let altAmountStr = this.txFormatProvider.formatAlternativeStr(
      this.wallet.coin,
      ++recipient.amount
    );

    this.multiRecipients.push({
      amount: +recipient.amount ? +recipient.amount : null,
      amountToShow,
      altAmountStr: altAmountStr ? altAmountStr : null,
      toAddress: recipient.toAddress,
      recipientType: recipient.recipientType,
      recipient
    });

    this.checkGoToConfirmButton();
    this.cleanSearch();
  }

  public newRecipient(): void {
    if (
      this.parsedData &&
      (this.parsedData.type === 'BitcoinUri' ||
        this.parsedData.type === 'BitcoinCashUri')
    ) {
      let parsed;
      let toAddress;
      let amount;
      let recipient;
      let recipientType;
      try {
        parsed =
          this.wallet.coin == 'swx'
            ? this.bwcProvider.getBitcore().URI(this.search)
            : this.bwcProvider.getBitcoreCash().URI(this.search);
        toAddress = parsed.address
          ? parsed.address.toString()
          : _.clone(this.search);

        // keep address in original format
        if (
          parsed.address &&
          this.search.indexOf(toAddress) < 0 &&
          this.wallet.coin == 'bch'
        ) {
          toAddress = parsed.address.toCashAddress();
        }

        amount = parsed.amount ? parsed.amount : null;
        recipientType = 'address';
        recipient = null;
      } catch (_err) {
        // If pasted address isn't a valid uri
        toAddress = _.clone(this.search);
        recipientType = 'address';
      }

      this.addRecipient({
        amount,
        toAddress,
        recipientType,
        recipient
      });
    } else {
      const newRecipient = {
        toAddress: _.clone(this.search),
        recipientType: 'address'
      };
      const index = this.multiRecipients.length;
      this.openAmountModal(newRecipient, index);
    }
  }

  private checkGoToConfirmButton(): void {
    let b = false;
    this.multiRecipients.forEach(recipient => {
      if (!recipient.amountToShow) {
        b = true;
      }
    });
    this.isDisabledContinue = b;
  }

  public cleanSearch(): void {
    this.search = '';
    this.parsedData = {};
  }

  public removeRecipient(index): void {
    this.multiRecipients.splice(index, 1);
    this.checkGoToConfirmButton();
  }

  public openScanner(): void {
    this.scannerOpened = true;
    this.walletTabsProvider.setSendParams({
      amount: this.navParams.get('amount'),
      coin: this.navParams.get('coin')
    });
    this.walletTabsProvider.setFromPage({ fromSend: true });
    this.events.publish('ScanFromWallet');
  }

  private checkCoinAndNetwork(data): boolean {
    let isValid;

    isValid = this.addressProvider.checkCoinAndNetworkFromAddr(
      this.wallet.coin,
      this.wallet.network,
      data
    );

    if (isValid) {
      this.invalidAddress = false;
      return true;
    } else {
      this.invalidAddress = true;
      const network = this.addressProvider.getNetwork(data);

      if (this.wallet.coin === 'bch' && this.wallet.network === network) {
        const isLegacy = this.checkIfLegacy();
        isLegacy ? this.showLegacyAddrMessage() : this.showErrorMessage();
      } else {
        this.showErrorMessage();
      }
    }

    return false;
  }

  private showErrorMessage() {
    const msg = this.translate.instant(
      'The wallet you are using does not match the network and/or the currency of the address provided'
    );
    const title = this.translate.instant('Error');
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'default-error',
      { msg, title }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(() => {
      this.search = '';
    });
  }

  private showLegacyAddrMessage() {
    const appName = this.appProvider.info.nameCase;
    const infoSheet = this.actionSheetProvider.createInfoSheet(
      'legacy-address-info',
      { appName }
    );
    infoSheet.present();
    infoSheet.onDidDismiss(option => {
      if (option) {
        let url =
          'https://bitpay.github.io/address-translator?addr=' + this.search;
        this.externalLinkProvider.open(url);
      }
      this.search = '';
    });
  }

  public processInput(): void {
    if (this.search && this.search.trim() != '') {
      this.parsedData = this.incomingDataProvider.parseData(this.search);
      if (this.parsedData && this.parsedData.type == 'PayPro') {
        this.invalidAddress = true;
      } else if (
        this.parsedData &&
        _.indexOf(this.validDataTypeMap, this.parsedData.type) != -1
      ) {
        const isValid = this.checkCoinAndNetwork(this.search);
        if (isValid) this.invalidAddress = false;
      } else {
        this.invalidAddress = true;
      }
    }
  }

  private checkIfLegacy(): boolean {
    return (
      this.incomingDataProvider.isValidBitcoinCashLegacyAddress(this.search) ||
      this.incomingDataProvider.isValidBitcoinCashUriWithLegacyAddress(
        this.search
      )
    );
  }

  public goToConfirm(): void {
    let totalAmount = 0;
    this.multiRecipients.forEach(recipient => {
      totalAmount += recipient.amount;
    });
    this.navCtrl.push(ConfirmPage, {
      fromMultiSend: true,
      totalAmount,
      recipientType: 'multi',
      color: this.wallet.color,
      coin: this.wallet.coin,
      network: this.wallet.network,
      useSendMax: false,
      recipients: this.multiRecipients
    });
  }

  public closeCam(): void {
    if (this.scannerOpened) this.events.publish('ExitScan');
    else this.getParentTabs().dismiss();
    this.scannerOpened = false;
  }
}
