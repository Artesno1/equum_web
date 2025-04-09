const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Store orders in memory
const orders = new Map();

// POST /api/order
app.post('/api/order', (req, res) => {
  try {
    const orderData = req.body;
    console.log('Received order:', orderData);
    
    // Store the order
    orders.set(orderData.id, {
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    res.json({ success: true, orderId: orderData.id });
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/order/:id
app.get('/api/order/:id', (req, res) => {
  try {
    const orderId = req.params.id;
    const order = orders.get(orderId);
    
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error retrieving order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mock server is running on port ${PORT}`);
}); 