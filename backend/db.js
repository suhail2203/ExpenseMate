const sqlite3 = require('sqlite3').verbose()

const db = new sqlite3.Database('./expenseMate.db', (error) => {
  if (error) {
    console.error('Database connection failed:', error.message)
  } else {
    console.log('Connected to ExpenseMate SQLite Database')
  }
})

// Create transactions table
db.run(
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL
  )`,
  (error) => {
    if (error) {
      console.error('Table creation failed:', error.message)
    } else {
      console.log('Transactions table created successfully')
    }
  }
)

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`, error => {
  if (error) {
    console.error('Users table creation error:', error.message)
  } else {
    console.log('Users table ready')
  }
})



db.all('PRAGMA table_info(transactions)', (error, columns) => {
  if (error) {
    console.error('Database migration error:', error.message)
    return
  }

  const hasUserId = columns.some(column => column.name === 'user_id')

  if (!hasUserId) {
    db.run(
      'ALTER TABLE transactions ADD COLUMN user_id INTEGER',
      error => {
        if (error) {
          console.error('User ID column error:', error.message)
        } else {
          console.log('Transactions user_id column added')
        }
      },
    )
  } else {
    console.log('Transactions user_id column already exists')
  }
})

module.exports = db