import { Injectable } from '@angular/core';

import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteDBConnection, SQLiteConnection, capSQLiteSet,
         capSQLiteChanges, capSQLiteValues, capEchoResult, capSQLiteResult,
         capNCDatabasePathResult,capSQLiteJson,
         CapacitorSQLitePlugin,
         DBSQLiteValues} from '@capacitor-community/sqlite';

@Injectable()

export class DatabaseService {
  sqliteConnection: SQLiteConnection;
  db: SQLiteDBConnection;
  isService = false;
  platform: string;
  sqlitePlugin: any;
  native = false;

  constructor() {
    this.platform = Capacitor.getPlatform();
    if(this.platform === 'ios' || this.platform === 'android') {this.native = true;}
    this.sqlitePlugin = CapacitorSQLite;
    this.sqliteConnection = new SQLiteConnection(this.sqlitePlugin);
    this.isService = true;
  }
  getSqlitePlugin(): CapacitorSQLitePlugin {
    return this.sqlitePlugin;
  }
  getPlatform(): string {
    return this.platform;
  }
  getSqliteConnection(): SQLiteConnection {
    return this.sqliteConnection;
  }
  async openConnection(dbName: string,
    encrypted: boolean, mode: string, version: number,
    isDelete: boolean): Promise<SQLiteDBConnection> {
    try {
      const retCC = (await this.sqliteConnection.checkConnectionsConsistency()).result;
      const isConn = (await this.sqliteConnection.isConnection(dbName)).result;
      if(retCC && isConn) {
        this.db = await this.sqliteConnection.retrieveConnection(dbName);
      } else {
        this.db = await this.sqliteConnection.createConnection(dbName, encrypted, mode, version);
      }
      if (isDelete) {
        await this.deleteDatabase();
      }
      await this.db.open();
      return this.db;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  async deleteDatabase(): Promise<void> {
    try {
        const ret = (await this.db.isExists()).result;
        if(ret) {
            const dbName = this.db.getConnectionDBName();
            await this.db.delete();
            return Promise.resolve();
        } else {
            return Promise.resolve();
        }
    } catch(err) {
        return Promise.reject(err);
    }
  }
  async createSyncTable(): Promise<void> {
    try {
        // create synchronization table
        let res: any = await this.db.createSyncTable();
        if (res.changes.changes < 0) {
            const msg = `createSyncTable "db-test-json" changes < 0 `;
            return Promise.reject(msg);
        }
        // get the synchronization date
        res = await this.db.getSyncDate();
        if(res.syncDate <= 0) {
            const msg = `getSyncDate return 0 `;
            return Promise.reject(msg);
        }

        if(this.platform === 'web') {
            // save the db to store
            await this.sqliteConnection.saveToStore('db-test-json');
        }
        return;
    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
  }
  async exportFull(): Promise<capSQLiteJson> {
    try {
        // export to json full
        const jsonObj: any = await this.db.exportToJson('full');
        // test Json object validity
        const res: any = await this.sqliteConnection.isJsonValid(JSON.stringify(jsonObj.export));
        if(!res.result) {
            const msg = 'isJsonValid Full returns false';
            return Promise.reject(msg);
        }
        if (jsonObj.export.tables.length !== 3 ||
                jsonObj.export.tables[0].values.length !== 4 ||
                jsonObj.export.tables[1].values.length !== 2 ||
                jsonObj.export.tables[2].values.length !== 2) {
            const msg = 'Export Full Json not correct';
            return Promise.reject(msg);
        }
        return;
    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
}
async showUsers(title: string): Promise<any[]> {
    try {
      let users: any[] =[];
        // Query the users and associated messages
        const query = `
        SELECT users.id AS uid, users.name AS uname, messages.title AS mtitle,
        users.sql_deleted AS udeleted, users.last_modified AS ulast,
        messages.sql_deleted AS mdeleted , messages.last_modified AS mlast
        FROM users
        LEFT OUTER JOIN messages ON messages.userid = users.id
        `;

        const res: any = await this.db.query(query);
        users = [...res.values];
        console.log(`&&&&&& users ${title} &&&&&&`);
        for(const result of users) {
            console.log(`uid: ${result.uid} uname: ${result.uname} udeleted: ${result.udeleted} ulast: ${result.ulast}`);
            if(result.mtitle != null) {
                console.log(`       mtitle: ${result.mtitle} mdeleted: ${result.mdeleted} mlast: ${result.mlast}`);
            }
        }
        return users;
    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
  }
  async getSyncTableValues(): Promise<DBSQLiteValues> {
    try {
      const retQuery: DBSQLiteValues = await this.db.query('SELECT * from sync_table;', []);
      return retQuery;
    } catch (err: any) {
      const msg = err.message ? err.message : err;
      return Promise.reject(msg);
    }
  }
  async importPartial(partialImport: any, importName: string): Promise<void> {
    try {
        // Close Connection db-test-json
        await this.sqliteConnection.closeConnection('db-test-json');
        // test Json object validity
        let res: any = await this.sqliteConnection.isJsonValid(JSON.stringify(partialImport));
        if(!res.result) {
            const msg = `Json Object ${importName} not valid"\n`;
            return Promise.reject(msg);
        }
        // test import from Json Object
        res = await this.sqliteConnection.importFromJson(JSON.stringify(partialImport));
        if(res.changes.changes === -1 ) {
            const msg = `ImportFromJson ${importName} changes < 0"\n`;
            return Promise.reject(msg);
        }

        this.db = await this.openConnection('db-test-json', false,
                                  'no-encryption', 1, false);
        // Set the Synchronization Date
        const d = new Date();
        await this.db.setSyncDate(d.toISOString());

        if(this.platform === 'web') {
            // save the db to store
            await this.sqliteConnection.saveToStore('db-test-json');
        }
        return;
    } catch (err: any) {
        const msg: string = err.message ? err.message : err;
        return Promise.reject(msg);
    }
  }
  async doSomeStuff(): Promise<void> {
    try {
        const stuffSet: Array<capSQLiteSet>  = [
            { statement:'INSERT INTO users (name,email,age) VALUES (?,?,?);',
              values:[
                  ['Jackson','Jackson@example.com',18],
                  ['Bush','Bush@example.com',25]
              ]
            },
            { statement:'INSERT INTO users (name,email,age) VALUES (?,?,?);',
              values:['Kennedy','Kennedy@example.com',45]
            },
            { statement:'INSERT INTO users (name,email,age) VALUES (?,?,?);',
              values:['Jeep','Jeep@example.com',65]
            },
            { statement:'UPDATE users SET email = ? WHERE id = ?',
              values: [
                ['Addington@example.com',5],
                ['Bannister@example.com',6]
              ]
            },
            { statement:'INSERT INTO messages (userid, title, body) VALUES (?,?,?);',
              values: [
                [2,'test post 5','content test post 5'],
                [4,'test post 6','content test post 6']
              ]
            },
            { statement: 'DELETE FROM users WHERE id = ?;',
              values: [4]
            }
        ];
        let res: any = await this.db.executeSet(stuffSet);
        if(res.changes.changes !== 10) {
            const msg = `executeSet delete "db-test-json" changes != 10 `;
            return Promise.reject(msg);
        }
        const delExecute = `
        DELETE FROM users WHERE id = 2;
        `;
        res = await this.db.execute(delExecute);
        if(res.changes.changes !== 3) {
            const msg = `execute delete "db-test-json" changes != 3 `;
            return Promise.reject(msg);
        }

    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
  }

  async exportPartial(): Promise<capSQLiteJson> {
    try {
        // export to json partial
        const jsonObj: any = await this.db.exportToJson('partial');
        // test Json object validity
        if(Object.keys(jsonObj.export).length <= 0) {
            const msg = 'Returned Json Object is empty, nothing to synchronize';
            return Promise.reject(msg);
        }
        const res: any = await this.sqliteConnection.isJsonValid(JSON.stringify(jsonObj.export));
        if(!res.result) {
            const msg = 'Error: isJsonValid Full returns false';
            return Promise.reject(msg);
        }
        return jsonObj;
    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
}
async localSynchronization(): Promise<void> {
    try {
      // set the synchronization date
      await this.db.setSyncDate((new Date()).toISOString());
      // remove all rows having sql_deleted = 1
      await this.db.deleteExportedRows();
      return;

    } catch (err: any) {
        const msg = err.message ? err.message : err;
        return Promise.reject(msg);
    }
}


  async closeConnection(dbName: string): Promise<void> {
    try {
      const res = (await this.sqliteConnection.isConnection(dbName)).result;
      if(res) {
          await this.sqliteConnection.closeConnection(dbName);
      }
    } catch (err: any) {
      const msg = err.message ? err.message : err;
      return Promise.reject(msg);
    }

  }
}
