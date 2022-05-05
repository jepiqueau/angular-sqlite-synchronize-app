import { Component, OnInit, OnDestroy } from '@angular/core';
import {ChangeDetectorRef} from '@angular/core';

import { showToast } from '../utils/toast-utils';
import { Dialog } from '@capacitor/dialog';
import { DatabaseService } from '../services/database.service';
import { delay } from '../utils/delay-utils';
import { partialImport1, partialImport2 } from '../utils/db-schemas-utils';

import config from 'capacitor.config';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  public native = false;
  public isDisplay = false;
  public logMsgs = '';
  public users: any[] = [];
  private platform: string;
  private isBiometric = false;
  private biometricListener: any;

  constructor(private databaseService: DatabaseService,
              private changeDetectorRef: ChangeDetectorRef) {
    this.platform = databaseService.getPlatform();
    console.log(`platform: ${this.platform}`);
    const mConfig = config.plugins && config.plugins.CapacitorSQLite ? config.plugins.CapacitorSQLite : null;

    if(this.platform === 'android' && mConfig != null) {
      this.isBiometric = mConfig.androidBiometric && mConfig.androidBiometric.biometricAuth
                          ? mConfig.androidBiometric.biometricAuth : false;
    }
    if(this.platform === 'ios' && mConfig != null) {
       this.isBiometric = mConfig.iosBiometric && mConfig.iosBiometric.biometricAuth
                          ? mConfig.iosBiometric.biometricAuth : false;
    }
  }

  /**************************
   * View Lifecycle methods *
   **************************/

  ngOnInit(): void {
    showToast({text: 'Welcome Home'});
  }

  async ionViewDidEnter() {
    if(this.platform === 'android' || this.platform === 'ios') {
      this.native = true;
      // code below only if you use biometrics for encrypted databases ->>
      if(this.isBiometric && !this.isDisplay) {
        this.biometricListener = this.databaseService.sqlitePlugin.addListener('sqliteBiometricEvent', (info: any) => {
          if (info.result) {
            this.isDisplay = true;
            this.changeDetectorRef.detectChanges();
          }
        });
      } else { // <<-
        this.isDisplay = true;
      }
    } else {
      this.isDisplay = true;
    }
    const showAlert = async (message: string) => {
      await Dialog.alert({
      title: 'Error Dialog',
      message,
      });
    };

    try {
      await this.testSynchronizationProcess();

    } catch (err) {
      const msg = err.message ? err.message : err;
      await showAlert(msg);
    }
  }

  ngOnDestroy() {
    if( this.native && this.isBiometric) {
      this.biometricListener.remove();
    }
  }

  /****************
   * Test Methods *
   ****************/

  async testSynchronizationProcess(): Promise<void> {
    this.logMsgs += '* Starting testSynchronizationProcess *\n\n';
    try {
      // 1. Open the connection
      const db = await this.databaseService.openConnection('db-test-json', false,
      'no-encryption', 1, false);

      // 2. Create the Synchronization Table
      await this.databaseService.createSyncTable();
      this.logMsgs += '> createSyncTable successfull\n';

      // 3. Perform a Full Export
      await delay(2,'before full export');
      let retUsers: any[] = await this.databaseService.showUsers('before export full');
      this.users = [...retUsers];
      let exportObj = await this.databaseService.exportFull();
      this.logMsgs += '> export full successfull\n';

      // 4. Get Synchronization Table Values
      let retValues = await this.databaseService.getSyncTableValues();
      console.log(`>>> retValues after export full: ${JSON.stringify(retValues)}`);

      // 5. Test Import Partial 1 With Delete
      await this.databaseService.importPartial(partialImport1, 'partialImport1');
      this.logMsgs += '> import partial 1 successfull\n';

      // delay before to do some stuff
      await delay(2, 'before capturing new data');

      // 6. Do Some Stuff
      await this.databaseService.doSomeStuff();
      this.logMsgs += '> do some stuff successfull\n';
      retUsers = await this.databaseService.showUsers('after capturing some stuff');
      this.users = [...retUsers];

      // 7. Export Partial
      exportObj = await this.databaseService.exportPartial();
      this.logMsgs += '> export partial successfull\n';

      // 8. Get Synchronization Table Values
      retValues = await this.databaseService.getSyncTableValues();
      console.log(`>>> retValues after export partial: ${JSON.stringify(retValues)}`);

      // 9. Local Synchronization
      await this.databaseService.localSynchronization();

      // 10. Test Import Partial 2 With Delete
      await this.databaseService.importPartial(partialImport2, 'partialImport2');
      this.logMsgs += '> import partial 2 successfull\n';

      // 11. Show Final Users
      retUsers = await this.databaseService.showUsers('Final');
      this.users = [...retUsers];

      // 12.Close Connection 'db-test-json'
      await this.databaseService.closeConnection('db-test-json');
      this.logMsgs += '> close connection successfull\n';
      this.logMsgs += '* Ending testSynchronizationProcess successfully*\n\n';
      return;
    } catch (err) {
      const msg = err.message ? err.message : err;
      return Promise.reject(`Error: ${msg}`);
    }


  }
}
