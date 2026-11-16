import { useState,useEffect } from 'react'
import Auth from './components/Auth'
import './App.css'

function App() {
  const [authData, setAuthData] = useState(() => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')

  return token && user
    ? { token, user: JSON.parse(user) }
    : null
})

const handleLogin = data => {
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  setAuthData(data)
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  setAuthData(null)
}
  // Store all transactions
  const [transactions, setTransactions] = useState([])

  const [editingId, setEditingId] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [selectedCategory, setSelectedCategory] = useState('All')

  const [selectedType, setSelectedType] = useState('All')

  const [sortOrder, setSortOrder] = useState('newest')

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth()
  )

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  )

  useEffect(() => {
  if (!authData) {
    setTransactions([])
    return
  }

  const getTransactions = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/transactions',
        {
          headers: {
            Authorization: `Bearer ${authData.token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  getTransactions()
}, [authData])


  // Store form input values
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Food',
    type: 'Expense',
  })

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Add a new transaction
  const handleSubmit = async event => {
  event.preventDefault()

  if (!formData.title.trim()) {
  alert('Please enter transaction name')
  return
}

if (!formData.amount || Number(formData.amount) <= 0) {
  alert('Please enter a valid amount')
  return
}

if (!Number.isFinite(Number(formData.amount))) {
  alert('Amount must be a valid number')
  return
}

  const transactionData = {
    title: formData.title,
    amount: Number(formData.amount),
    category: formData.category,
    type: formData.type,
    date: new Date().toISOString(),
  }

  const url = editingId
    ? `http://localhost:5000/api/transactions/${editingId}`
    : 'http://localhost:5000/api/transactions'

  const method = editingId ? 'PUT' : 'POST'

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      },
      body: JSON.stringify(transactionData),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Transaction operation failed')
    }

    if (editingId) {
      setTransactions(prevTransactions =>
        prevTransactions.map(transaction =>
          transaction.id === editingId
            ? { ...transaction, ...transactionData }
            : transaction,
        ),
      )
    } else {
      setTransactions(prevTransactions => [
        ...prevTransactions,
        { ...transactionData, id: data.id },
      ])
    }

    setFormData({
      title: '',
      amount: '',
      category: 'Food',
      type: 'Expense',
    })

    setEditingId(null)

  } catch (error) {
    console.error('Error saving transaction:', error)
    alert(error.message)
  }
}


const handleEdit = transaction => {
  setEditingId(transaction.id)

  setFormData({
    title: transaction.title,
    amount: transaction.amount.toString(),
    category: transaction.category,
    type: transaction.type,
  })
}
  
  // Delete a transaction
  const handleDelete = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/transactions/${id}`,
        {
          method: 'DELETE',
           headers: {
                  Authorization: `Bearer ${authData.token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete transaction')
      }

      setTransactions((prevTransactions) =>
        prevTransactions.filter(
          (transaction) => transaction.id !== id
        )
      )
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert(error.message)
    }
  }

  // Calculate income and expenses
  const totalIncome = transactions
    .filter((transaction) => transaction.type === 'Income')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === 'Expense')
    .reduce((total, transaction) => total + transaction.amount, 0)


 const filteredTransactions = transactions
  .filter(transaction => {
    const matchesSearch = transaction.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === 'All' ||
      transaction.category === selectedCategory

    const matchesType =
      selectedType === 'All' ||
      transaction.type === selectedType

    return matchesSearch && matchesCategory && matchesType
  })
  .sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()

    return sortOrder === 'newest'
      ? dateB - dateA
      : dateA - dateB
  })


  const clearFilters = () => {
  setSearchTerm('')
  setSelectedCategory('All')
  setSelectedType('All')
  setSortOrder('newest')
}

  const balance = totalIncome - totalExpenses

  // Get selected month's expenses
const currentMonthExpenses = transactions.filter(transaction => {
  const transactionDate = new Date(transaction.date)

  return (
    transaction.type === 'Expense' &&
    transactionDate.getMonth() === Number(selectedMonth) &&
    transactionDate.getFullYear() === Number(selectedYear)
  )
})

// Calculate monthly expenses FIRST
const monthlyExpenseTotal = currentMonthExpenses.reduce(
  (total, transaction) => total + transaction.amount,
  0
)

// Calculate category-wise expenses
const categoryExpenses = currentMonthExpenses.reduce(
  (result, transaction) => {
    result[transaction.category] =
      (result[transaction.category] || 0) + transaction.amount

    return result
  },
  {}
)

// Get selected month's income
const currentMonthIncome = transactions.filter(transaction => {
  const transactionDate = new Date(transaction.date)

  return (
    transaction.type === 'Income' &&
    transactionDate.getMonth() === Number(selectedMonth) &&
    transactionDate.getFullYear() === Number(selectedYear)
  )
})

// Calculate monthly income
const monthlyIncomeTotal = currentMonthIncome.reduce(
  (total, transaction) => total + transaction.amount,
  0
)

const monthlySavings = monthlyIncomeTotal - monthlyExpenseTotal

const savingsPercentage =
  monthlyIncomeTotal > 0
    ? (monthlySavings / monthlyIncomeTotal) * 100
    : 0

// Calculate maximum amount for comparison
const maxMonthlyAmount = Math.max(
  monthlyIncomeTotal,
  monthlyExpenseTotal,
  1
)
// Calculate total monthly expenses

const maxCategoryExpense = Math.max(
  ...Object.values(categoryExpenses),
  0
)

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  if (!authData) {
  return <Auth onLogin={handleLogin} />
}

  return (
    <div className="app">
      <header className="header">
  <h2>ExpenseMate</h2>
  <p>Personal Expense Tracker</p>

  <p>Welcome, {authData.user.name}!</p>

  <button type="button" onClick={handleLogout}>
    Logout
  </button>
      </header>
      <main className="dashboard">
        <h1>Dashboard</h1>
        <p>Welcome back! Here&apos;s your financial overview.</p>

        {/* Financial Summary */}
        <section className="summary-cards">
          <div className="card">
            <h3>Total Balance</h3>
            <h2>{formatCurrency(balance)}</h2>
          </div>

          <div className="card">
            <h3>Total Income</h3>
            <h2>{formatCurrency(totalIncome)}</h2>
          </div>

          <div className="card">
            <h3>Total Expenses</h3>
            <h2>{formatCurrency(totalExpenses)}</h2>
          </div>
        </section>


        {/* Expense Analytics */}
        <section className="analytics-section">
          <h2>Monthly Expense Analytics</h2>

          <div className="month-filter">
  <select
    value={selectedMonth}
    onChange={event => setSelectedMonth(event.target.value)}
  >
    {[
      'January', 'February', 'March', 'April',
      'May', 'June', 'July', 'August',
      'September', 'October', 'November', 'December',
    ].map((month, index) => (
      <option value={index} key={month}>
        {month}
      </option>
    ))}
  </select>

  <select
    value={selectedYear}
    onChange={event => setSelectedYear(event.target.value)}
  >
    {[2025, 2026, 2027].map(year => (
      <option value={year} key={year}>
        {year}
      </option>
    ))}
  </select>
          </div>

          <div className="monthly-expense-card">
            <p>This Month's Total Expenses</p>
            <h2>{formatCurrency(monthlyExpenseTotal)}</h2>
          </div>

          {/* Monthly Savings Summary */}
            <div className="savings-card">
              <p>Monthly Savings</p>

              <h2>
                {formatCurrency(monthlySavings)}
              </h2>

              <span>
                Savings Rate: {savingsPercentage.toFixed(1)}%
              </span>
            </div>

          {/* Income vs Expense Comparison */}
          <div className="comparison-section">
            <h3>Income vs Expense</h3>

            <div className="comparison-item">
              <div className="comparison-info">
                <span>Income</span>
                <strong className="income-text">
                  {formatCurrency(monthlyIncomeTotal)}
                </strong>
              </div>

              <div className="comparison-track">
                <div
                  className="comparison-income-bar"
                  style={{
                    width: `${(monthlyIncomeTotal / maxMonthlyAmount) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="comparison-item">
              <div className="comparison-info">
                <span>Expenses</span>
                <strong className="expense-text">
                  {formatCurrency(monthlyExpenseTotal)}
                </strong>
              </div>

              <div className="comparison-track">
                <div
                  className="comparison-expense-bar"
                  style={{
                    width: `${(monthlyExpenseTotal / maxMonthlyAmount) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="category-analytics">
            <h3>Category-wise Expenses</h3>

            {Object.keys(categoryExpenses).length === 0 ? (
              <p>No expenses recorded this month.</p>
            ) : (
              Object.entries(categoryExpenses).map(([category, amount]) => (
                <div className="category-row" key={category}>
                  <div className="category-info">
                    <span>{category}</span>
                    <strong>{formatCurrency(amount)}</strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(amount / maxCategoryExpense) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Add Transaction Form */}
        <section className="transaction-form">
          <h2>{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Transaction Name</label>
              <input
                id="title"
                type="text"
                name="title"
                placeholder="Example: Grocery Shopping"
                value={formData.title}
                onChange={handleChange}
                maxLength={50}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (₹)</label>
              <input
                id="amount"
                type="number"
                name="amount"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={handleChange}
                min="1"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Food">Food</option>
                <option value="Travel">Travel</option>
                <option value="Shopping">Shopping</option>
                <option value="Bills">Bills</option>
                <option value="Salary">Salary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="type">Transaction Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="Expense">Expense</option>
                <option value="Income">Income</option>
              </select>
            </div>

            <button className="add-button" type="submit">
              {editingId ? 'Save Changes' : 'Add Transaction'}
            </button>

            {editingId && (
              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setEditingId(null)
                  setFormData({
                    title: '',
                    amount: '',
                    category: 'Food',
                    type: 'Expense',
                  })
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>
        </section>

        {/* Transaction History */}
        <section className="transactions">
          <h2>Recent Transactions</h2>

          <input
            type="text"
            className="search-input"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
          />

          <div className="filter-container">
            <select
              value={selectedCategory}
              onChange={event => setSelectedCategory(event.target.value)}
              className="filter-select"
            >
              <option value="All">All Categories</option>
              <option value="Food">Food</option>
              <option value="Travel">Travel</option>
              <option value="Shopping">Shopping</option>
              <option value="Bills">Bills</option>
              <option value="Salary">Salary</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={selectedType}
              onChange={event => setSelectedType(event.target.value)}
              className="filter-select"
            >
              <option value="All">All Types</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>

            <select
              className="filter-select"
              value={sortOrder}
              onChange={event => setSortOrder(event.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <button
            type="button"
            className="clear-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

          {filteredTransactions.length === 0 ? (
              <p>No matching transactions found.</p>
          ) : (
            <div className="transaction-list">
              {filteredTransactions.map((transaction) => (
                <div className="transaction-item" key={transaction.id}>
                  <div>
                    <h3>{transaction.title}</h3>
                    <p className="transaction-details">
                    <span className="category-label">{transaction.category}</span>
                    <span className="date-label">
                      {new Date(transaction.date).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                  </div>

                  <div className="transaction-actions">
                    <strong
                      className={
                        transaction.type === 'Income'
                          ? 'income-amount'
                          : 'expense-amount'
                      }
                    >
                      {transaction.type === 'Income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </strong>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      Delete
                    </button>

                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => handleEdit(transaction)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App