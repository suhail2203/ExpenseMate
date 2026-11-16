const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// Use Render persistent disk path in production
// Use local database path during development
const databasePath =
  process.env.DB_PATH || path.join(__dirname, 'expenseMate.db')

const db = new sqlite3.Database(databasePath, error => {
  if (error) {
    console.error('Database connection failed:', error.message)
  } else {
    console.log('Connected to ExpenseMate SQLite Database')
  }
})

// Initialize database tables before starting the server
db.ready = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        user_id INTEGER
      )`,
      error => {
        if (error) return reject(error)

        console.log('Transactions table ready')
      }
    )

    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )`,
      error => {
        if (error) return reject(error)

        console.log('Users table ready')
      }
    )

    // Migration for existing databases
    db.all('PRAGMA table_info(transactions)', (error, columns) => {
      if (error) return reject(error)

      const hasUserId = columns.some(
        column => column.name === 'user_id'
      )

      if (hasUserId) {
        console.log('User ID column already exists')
        resolve()
      } else {
        db.run(
          'ALTER TABLE transactions ADD COLUMN user_id INTEGER',
          error => {
            if (error) return reject(error)

            console.log('User ID column added')
            resolve()
          }
        )
      }
    })
  })
})

module.exports = db