const express = require('express')
const cors = require('cors')
const db = require('./db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.json())

// Authentication middleware
const authenticateToken = (request, response, next) => {
  const authHeader = request.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return response.status(401).json({
      error: 'Access denied. Please login.',
    })
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      return response.status(403).json({
        error: 'Invalid or expired token',
      })
    }

    request.user = user
    next()
  })
}

// Test API
app.get('/', (request, response) => {
  response.send('ExpenseMate Backend Server is Running!')
})

// Register API
app.post('/api/register', async (request, response) => {
  const { name, email, password } = request.body

  if (!name || !email || !password) {
    return response.status(400).json({
      error: 'Please fill in all fields',
    })
  }

  if (password.length < 8) {
    return response.status(400).json({
      error: 'Password must be at least 8 characters',
    })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    db.run(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword],
      function (error) {
        if (error) {
          if (error.message.includes('UNIQUE')) {
            return response.status(409).json({
              error: 'Email already registered',
            })
          }

          return response.status(500).json({
            error: 'Registration failed',
          })
        }

        response.status(201).json({
          message: 'Registration successful',
          userId: this.lastID,
        })
      },
    )
  } catch (error) {
    response.status(500).json({
      error: 'Something went wrong',
    })
  }
})

// Login API
app.post('/api/login', (request, response) => {
  const { email, password } = request.body

  if (!email || !password) {
    return response.status(400).json({
      error: 'Please enter email and password',
    })
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email.trim().toLowerCase()],
    async (error, user) => {
      if (error) {
        return response.status(500).json({
          error: 'Login failed',
        })
      }

      if (!user) {
        return response.status(401).json({
          error: 'Invalid email or password',
        })
      }

      try {
        const isPasswordValid = await bcrypt.compare(
          password,
          user.password,
        )

        if (!isPasswordValid) {
          return response.status(401).json({
            error: 'Invalid email or password',
          })
        }

        const token = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: '1d' },
        )

        response.status(200).json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
      } catch (error) {
        response.status(500).json({
          error: 'Login failed',
        })
      }
    },
  )
})

// Add transaction - protected
app.post('/api/transactions', authenticateToken, (request, response) => {
  const { title, amount, category, type, date } = request.body

  if (
    !title?.trim() ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !category ||
    !['Income', 'Expense'].includes(type)
  ) {
    return response.status(400).json({
      error: 'Please provide valid transaction details',
    })
  }

  const sql = `
    INSERT INTO transactions
    (title, amount, category, type, date, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `

  const values = [
    title.trim(),
    Number(amount),
    category,
    type,
    date || new Date().toISOString(),
    request.user.id,
  ]

  db.run(sql, values, function (error) {
    if (error) {
      return response.status(500).json({
        error: error.message,
      })
    }

    response.status(201).json({
      message: 'Transaction added successfully',
      id: this.lastID,
    })
  })
})

// Get logged-in user's transactions
app.get('/api/transactions', authenticateToken, (request, response) => {
  db.all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC',
    [request.user.id],
    (error, rows) => {
      if (error) {
        return response.status(500).json({
          error: error.message,
        })
      }

      response.status(200).json(rows)
    },
  )
})

// Delete own transaction only
app.delete('/api/transactions/:id', authenticateToken, (request, response) => {
  db.run(
    'DELETE FROM transactions WHERE id = ? AND user_id = ?',
    [request.params.id, request.user.id],
    function (error) {
      if (error) {
        return response.status(500).json({
          error: error.message,
        })
      }

      if (this.changes === 0) {
        return response.status(404).json({
          message: 'Transaction not found',
        })
      }

      response.status(200).json({
        message: 'Transaction deleted successfully',
      })
    },
  )
})

// Update own transaction only
app.put('/api/transactions/:id', authenticateToken, (request, response) => {
  const { title, amount, category, type, date } = request.body

  if (
    !title?.trim() ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !category ||
    !['Income', 'Expense'].includes(type)
  ) {
    return response.status(400).json({
      error: 'Please provide valid transaction details',
    })
  }

  const sql = `
    UPDATE transactions
    SET title = ?, amount = ?, category = ?, type = ?, date = ?
    WHERE id = ? AND user_id = ?
  `

  const values = [
    title.trim(),
    Number(amount),
    category,
    type,
    date || new Date().toISOString(),
    request.params.id,
    request.user.id,
  ]

  db.run(sql, values, function (error) {
    if (error) {
      return response.status(500).json({
        error: error.message,
      })
    }

    if (this.changes === 0) {
      return response.status(404).json({
        message: 'Transaction not found',
      })
    }

    response.status(200).json({
      message: 'Transaction updated successfully',
    })
  })
})

// Start server
const PORT = process.env.PORT || 5000

db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch(error => {
    console.error('Database initialization failed:', error)
    process.exit(1)
  })