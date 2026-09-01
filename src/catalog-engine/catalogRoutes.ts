import { Router, Request, Response } from 'express';
import { catalogService } from './catalogService';
import { guardrailEnforcer } from '../agent-orchestrator/guardrailPolicy';
import { auditEngine } from '../audit-dashboard/auditEngine';

export const catalogRoutes = Router();

/**
 * Standardized AP2 / ACP Agent Catalog Manifest
 */
catalogRoutes.get('/catalog', (req: Request, res: Response) => {
  const protocol = req.headers['x-agent-protocol'] || 'AP2/1.0';
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const manifest = catalogService.generateAP2Manifest(baseUrl);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Agent-Protocol-Version', protocol as string);
  res.setHeader('Cache-Control', 'public, max-age=60');
  
  res.json({
    status: 'success',
    manifest
  });
});

/**
 * Filtered / Human-readable product query
 */
catalogRoutes.get('/products', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const maxPrice = req.query.max_price ? parseFloat(req.query.max_price as string) : undefined;

  const products = query ? catalogService.searchProducts(query, maxPrice) : catalogService.getAllProducts();
  res.json({
    status: 'success',
    count: products.length,
    products
  });
});

/**
 * Create new product (CRUD)
 */
catalogRoutes.post('/products', (req: Request, res: Response) => {
  const { name, sku, category, priceInr, costPriceInr, stock, description, imageUrl, maxDiscountPct } = req.body;

  if (!name || !sku || priceInr === undefined) {
    res.status(400).json({ status: 'error', message: 'name, sku, and priceInr are required' });
    return;
  }

  const created = catalogService.addProduct({
    name,
    sku,
    category: category || 'Footwear',
    priceInr: parseFloat(priceInr),
    costPriceInr: parseFloat(costPriceInr || (priceInr * 0.6)),
    stock: parseInt(stock || 20, 10),
    description: description || 'Premium product designed for athletic endurance and comfort.',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    tags: [category?.toLowerCase() || 'gear', 'new'],
    currency: 'INR',
    rating: 4.8,
    reviewCount: 1,
    variants: [],
    discountPolicy: {
      maxAllowedDiscountPct: parseFloat(maxDiscountPct || 15),
      allowAgentNegotiation: true
    }
  });

  res.status(201).json({ status: 'success', product: created });
});

/**
 * Update product (CRUD)
 */
catalogRoutes.put('/products/:id', (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const updated = catalogService.updateProduct(id, req.body);
  if (!updated) {
    res.status(404).json({ status: 'error', message: 'Product not found' });
    return;
  }
  res.json({ status: 'success', product: updated });
});

/**
 * Delete product (CRUD)
 */
catalogRoutes.delete('/products/:id', (req: Request, res: Response): void => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const deleted = catalogService.deleteProduct(id);
  if (!deleted) {
    res.status(404).json({ status: 'error', message: 'Product not found' });
    return;
  }
  res.json({ status: 'success', message: 'Product deleted successfully' });
});

/**
 * Get single product by SKU
 */
catalogRoutes.get('/products/:sku', (req: Request, res: Response): void => {
  const sku = Array.isArray(req.params.sku) ? req.params.sku[0] : req.params.sku;
  const product = catalogService.getProductBySku(sku);
  if (!product) {
    res.status(404).json({ status: 'error', message: 'Product SKU not found' });
    return;
  }
  res.json({ status: 'success', product });
});

/**
 * AP2 Machine Pricing Quote Endpoint
 */
catalogRoutes.post('/pricing/quote', (req: Request, res: Response): void => {
  const { sku, quantity, proposed_discount_pct, proposed_price_inr, buyer_agent_id } = req.body;

  if (!sku) {
    res.status(400).json({ status: 'error', message: 'target sku is required' });
    return;
  }

  const product = catalogService.getProductBySku(sku);
  if (!product) {
    res.status(404).json({ status: 'error', message: 'SKU not found' });
    return;
  }

  const qty = quantity && quantity > 0 ? quantity : 1;
  const trace = auditEngine.startTrace(
    'ap2_machine_buyer',
    buyer_agent_id || 'Machine_Buyer_Quote_Engine',
    `Quotation Request for SKU: ${sku} (Qty: ${qty})`,
    sku,
    product.name
  );

  const evaluation = guardrailEnforcer.evaluatePriceProposal(
    trace.traceId,
    product,
    proposed_price_inr,
    proposed_discount_pct,
    qty
  );

  auditEngine.updatePricing(trace.traceId, {
    originalPriceInr: product.priceInr * qty,
    approvedDiscountPct: evaluation.approvedDiscountPct,
    finalPriceInr: evaluation.approvedPriceInr
  });

  auditEngine.finishTrace(trace.traceId, evaluation.allowed ? 'BOUNDED_APPROVED' : 'BOUNDED_REJECTED');

  res.json({
    status: 'success',
    quote: {
      trace_id: trace.traceId,
      sku: product.sku,
      title: product.name,
      quantity: qty,
      original_total_inr: product.priceInr * qty,
      quoted_total_inr: evaluation.approvedPriceInr,
      effective_discount_pct: evaluation.approvedDiscountPct,
      policy_bounded: evaluation.policyBreachAttempted,
      explanation: evaluation.explanation,
      valid_until: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });
});

/**
 * Configure merchant discount policy for live testing
 */
catalogRoutes.post('/policy/update', (req: Request, res: Response): void => {
  const { sku, max_discount_pct } = req.body;
  if (!sku || max_discount_pct === undefined) {
    res.status(400).json({ status: 'error', message: 'sku and max_discount_pct are required' });
    return;
  }

  const updated = catalogService.updateProductDiscountPolicy(sku, parseFloat(max_discount_pct));
  if (updated) {
    res.json({ status: 'success', message: `Policy updated for SKU: ${sku}` });
  } else {
    res.status(404).json({ status: 'error', message: 'Product not found' });
  }
});
