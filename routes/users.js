const express = require('express');
const router = express.Router();

// GET /api/users
router.get('/', (req, res) => {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
  ];
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = { id: userId, name: 'Sample User', email: 'user@example.com' };
  
  if (!userId || userId < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID'
    });
  }
  
  res.json({
    success: true,
    data: user
  });
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }
  
  const newUser = {
    id: Date.now(), // Simple ID generation for demo
    name,
    email,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    data: newUser,
    message: 'User created successfully'
  });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  
  if (!userId || userId < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID'
    });
  }
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }
  
  const updatedUser = {
    id: userId,
    name,
    email,
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: updatedUser,
    message: 'User updated successfully'
  });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (!userId || userId < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user ID'
    });
  }
  
  res.json({
    success: true,
    message: `User ${userId} deleted successfully`
  });
});

module.exports = router;
