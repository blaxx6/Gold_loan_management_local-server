const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseMigration {
  constructor() {
    this.dbPath = path.join(__dirname, 'financial_app.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database for migration');
          resolve();
        }
      });
    });
  }

  async checkTableExists(tableName) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(!!row);
          }
        }
      );
    });
  }

  async getTableSchema(tableName) {
    return new Promise((resolve, reject) => {
      this.db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
          reject(err);
        } else {
          resolve(columns);
        }
      });
    });
  }

  async migrateToBlob() {
    console.log('Starting migration to BLOB storage...');
    
    const goldImagesExists = await this.checkTableExists('gold_images');
    
    if (!goldImagesExists) {
      console.log('Gold images table does not exist, creating with BLOB storage...');
      await this.createGoldImagesTableWithBlob();
      return;
    }

    const schema = await this.getTableSchema('gold_images');
    const imageDataColumn = schema.find(col => col.name === 'image_data');
    
    if (imageDataColumn && imageDataColumn.type === 'BLOB') {
      console.log('Table already has BLOB storage - no migration needed');
      return;
    }

    console.log('Converting TEXT image storage to BLOB...');
    await this.convertTextToBlob();
  }

  async createGoldImagesTableWithBlob() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS gold_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          image_name TEXT NOT NULL,
          image_data BLOB NOT NULL,
          image_size INTEGER NOT NULL,
          image_type TEXT NOT NULL,
          upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Gold images table created with BLOB storage');
          resolve();
        }
      });
    });
  }

  async convertTextToBlob() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        // Create new table with BLOB storage
        const createNewTable = `
          CREATE TABLE gold_images_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            image_name TEXT NOT NULL,
            image_data BLOB NOT NULL,
            image_size INTEGER NOT NULL,
            image_type TEXT NOT NULL,
            upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
          )
        `;

        this.db.run(createNewTable, (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }

          // Get existing data
          this.db.all('SELECT * FROM gold_images', [], (err, rows) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (rows.length === 0) {
              // No data to migrate
              this.db.run('DROP TABLE gold_images', (err) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                this.db.run('ALTER TABLE gold_images_new RENAME TO gold_images', (err) => {
                  if (err) {
                    this.db.run('ROLLBACK');
                    reject(err);
                  } else {
                    this.db.run('COMMIT');
                    console.log('Successfully migrated to BLOB storage');
                    resolve();
                  }
                });
              });
              return;
            }

            // Convert and insert data
            let processed = 0;
            const total = rows.length;

            rows.forEach(row => {
              // Convert base64 string to Buffer
              let imageBuffer;
              try {
                const base64Data = row.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
              } catch (e) {
                console.warn(`Error converting image for row ${row.id}: ${e.message}`);
                imageBuffer = Buffer.from(''); // Empty buffer as fallback
              }

              this.db.run(
                'INSERT INTO gold_images_new (customer_id, image_name, image_data, image_size, image_type, upload_date) VALUES (?, ?, ?, ?, ?, ?)',
                [row.customer_id, row.image_name, imageBuffer, row.image_size, row.image_type, row.upload_date],
                (err) => {
                  if (err) {
                    this.db.run('ROLLBACK');
                    reject(err);
                    return;
                  }

                  processed++;
                  if (processed === total) {
                    // All data converted, now replace table
                    this.db.run('DROP TABLE gold_images', (err) => {
                      if (err) {
                        this.db.run('ROLLBACK');
                        reject(err);
                        return;
                      }

                      this.db.run('ALTER TABLE gold_images_new RENAME TO gold_images', (err) => {
                        if (err) {
                          this.db.run('ROLLBACK');
                          reject(err);
                        } else {
                          this.db.run('COMMIT');
                          console.log(`Successfully migrated ${total} images to BLOB storage`);
                          resolve();
                        }
                      });
                    });
                  }
                }
              );
            });
          });
        });
      });
    });
  }

  async updateCustomersTable() {
    console.log('Checking customers table schema...');
    
    const customersExists = await this.checkTableExists('customers');
    
    if (!customersExists) {
      console.log('Creating customers table...');
      await this.createCustomersTable();
      return;
    }

    console.log('Customers table exists and is up to date');
  }

  async createCustomersTable() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          address TEXT,
          id_type TEXT NOT NULL,
          id_number TEXT NOT NULL,
          gold_weight REAL NOT NULL,
          gold_rate REAL DEFAULT 0,
          lent_amount REAL NOT NULL,
          current_balance REAL NOT NULL,
          target_amount REAL DEFAULT 0,
          auto_interest_enabled INTEGER DEFAULT 1,
          account_status TEXT DEFAULT 'active',
          last_interest_date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Customers table created successfully');
          resolve();
        }
      });
    });
  }

  async createIndexes() {
    console.log('Creating database indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      'CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(account_status)',
      'CREATE INDEX IF NOT EXISTS idx_gold_images_customer ON gold_images(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)'
    ];

    for (const indexSQL of indexes) {
      await new Promise((resolve) => {
        this.db.run(indexSQL, (err) => {
          if (err) {
            console.log(`Index creation skipped: ${err.message}`);
          }
          resolve();
        });
      });
    }
    
    console.log('Database indexes created/updated');
  }

  async runMigration() {
    try {
      console.log('Starting database migration...');
      
      await this.connect();
      await this.updateCustomersTable();
      await this.migrateToBlob();
      await this.createIndexes();
      
      console.log('Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    } finally {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed');
          }
        });
      }
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migration = new DatabaseMigration();
  migration.runMigration()
    .then(() => {
      console.log('Migration process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigration;
