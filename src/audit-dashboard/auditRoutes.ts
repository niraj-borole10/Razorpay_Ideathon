import { Router, Request, Response } from 'express';
import { auditEngine } from './auditEngine';
import { fallbackService } from '../razorpay-service/fallbackService';

export const auditRoutes = Router();

/**
 * Fetch chronological audit traces
 */
auditRoutes.get('/logs', (req: Request, res: Response) => {
  const traces = auditEngine.getAllTraces();
  res.json({
    status: 'success',
    count: traces.length,
    traces
  });
});

/**
 * Fetch single trace details
 */
auditRoutes.get('/logs/:traceId', (req: Request, res: Response): void => {
  const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;
  const trace = auditEngine.getTrace(traceId);
  if (!trace) {
    res.status(404).json({ status: 'error', message: 'Trace not found' });
    return;
  }
  res.json({ status: 'success', trace });
});

/**
 * Fetch trust and safety metrics
 */
auditRoutes.get('/stats', (req: Request, res: Response) => {
  const stats = auditEngine.getStats();
  res.json({
    status: 'success',
    stats
  });
});

/**
 * Trigger Graceful Failure Recovery Simulation ("The Bar")
 */
auditRoutes.post('/simulate-failure', async (req: Request, res: Response) => {
  const { failure_type, sku, customer_name, customer_phone } = req.body;

  const result = await fallbackService.handleGracefulFallback({
    failureType: failure_type || 'EXPIRED_SESSION',
    sku: sku || 'SHOE-RUN-001',
    customerName: customer_name || 'Ananya Iyer',
    customerPhone: customer_phone || '+919988776655'
  });

  res.json({
    status: 'success',
    simulation_result: result
  });
});

/**
 * Reset audit logs for testing
 */
auditRoutes.post('/clear', (req: Request, res: Response) => {
  auditEngine.clear();
  res.json({ status: 'success', message: 'Audit traces cleared' });
});
