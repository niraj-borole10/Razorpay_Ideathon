import { Router, Response } from 'express';
import { orderService } from './orderService';
import { authMiddleware, AuthenticatedRequest } from '../auth/authMiddleware';

export const orderRouter = Router();

/**
 * Get orders for currently authenticated user
 */
orderRouter.get('/my-orders', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userIdentifier = req.user?.userId || req.user?.username || (req.query.user as string) || (req.headers['x-user-id'] as string);

    if (!userIdentifier) {
      res.json({
        status: 'success',
        orders: []
      });
      return;
    }

    const orders = await orderService.getOrdersForUser(userIdentifier);
    res.json({
      status: 'success',
      count: orders.length,
      orders
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Get all orders (for admin & merchant overview)
 */
orderRouter.get('/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json({
      status: 'success',
      count: orders.length,
      orders
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Record an order directly
 */
orderRouter.post('/record', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const userId = req.user?.userId || data.userId || (data.customerName ? `cust_${data.customerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'cust_guest');
    const username = req.user?.username || data.username || data.customerName || 'guest';

    const order = await orderService.saveOrder({
      ...data,
      userId,
      username
    });

    res.status(201).json({
      status: 'success',
      order
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
