import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { dataToImport } from './app/utils/db-schemas-utils';
import { DatabaseService } from './app/services/database.service';

import { defineCustomElements as pwaElements} from '@ionic/pwa-elements/loader';
import { defineCustomElements as jeepSqlite} from 'jeep-sqlite/loader';

if (environment.production) {
  enableProdMode();
}
// required for toast component in Browser
pwaElements(window);

// required only if you want to use the jeep-sqlite Stencil component
// to use a SQLite database in Browser
jeepSqlite(window);


window.addEventListener('DOMContentLoaded', async () => {

  // initialize a database
  const initializeApp = async () => {
    const databaseService = new DatabaseService();

    const platform = databaseService.getPlatform();
    const sqliteConnection = databaseService.getSqliteConnection();
    try {
      if (platform === `web`) {
        // required only if you want to use the jeep-sqlite Stencil component
        const jeepSqliteEl = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepSqliteEl);
        await customElements.whenDefined('jeep-sqlite');
        // Initialize the Web store
        await sqliteConnection.initWebStore();
      }
      // here you can initialize some database's schemas and data
      // by importing a JSON Object if required

      // ->> for development and multiple successive tests
      // check if database "db-test-json" exists
      const res = (await sqliteConnection.isDatabase('db-test-json')).result;
      if(res) {
          // delete the database
          const db = await databaseService.openConnection('db-test-json', false,
                                          'no-encryption', 1, true);
          // Close Connection db-test-json
          await sqliteConnection.closeConnection('db-test-json');
      }
      // end of for development <<-

      const result = await sqliteConnection.isJsonValid(JSON.stringify(dataToImport));
      if(!result.result) {
        throw new Error(`isJsonValid: "dataToImport" is not valid`);
      }
      // full import
      const resJson = await sqliteConnection.importFromJson(JSON.stringify(dataToImport));
      if(resJson.changes && resJson.changes.changes && resJson.changes.changes < 0) {
        throw new Error(`importFromJson: "full" failed`);
      }

    }  catch (err) {
      console.log(`Error: ${err}`);
      throw new Error(`Error: ${err}`);
    }
  };
  initializeApp().then(() => {
    platformBrowserDynamic().bootstrapModule(AppModule)
    .catch(err => console.log(err));
  });
});
