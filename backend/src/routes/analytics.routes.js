import { Router } from 'express';
import { requireAuth } from '../services/auth.js';
import {
  summary, byDimension, distributionBands, topEarners, payGapByGender,
} from '../repositories/analyticsRepo.js';
import { payGapPct } from '../services/analytics.js';

const router = Router();
router.use(requireAuth);

// GET /api/analytics/summary
router.get('/summary', async (req, res, next) => {
  try { res.json(await summary()); } catch (err) { next(err); }
});

// GET /api/analytics/by/:dimension  (department | country | level)
router.get('/by/:dimension', async (req, res, next) => {
  try {
    res.json(await byDimension(req.params.dimension));
  } catch (err) {
    if (err.message?.startsWith('Unsupported dimension')) {
      return res.status(400).json({ error: err.message });
    }
    return next(err);
  }
});

// GET /api/analytics/distribution
router.get('/distribution', async (req, res, next) => {
  try { res.json(await distributionBands()); } catch (err) { next(err); }
});

// GET /api/analytics/top-earners
router.get('/top-earners', async (req, res, next) => {
  try { res.json(await topEarners(Number(req.query.limit) || 10)); } catch (err) { next(err); }
});

// GET /api/analytics/pay-gap — average USD by gender + a simple gap signal
router.get('/pay-gap', async (req, res, next) => {
  try {
    const rows = await payGapByGender();
    const m = rows.find((r) => r.key === 'male');
    const f = rows.find((r) => r.key === 'female');
    const gap = m && f ? payGapPct(Number(m.avg_usd), Number(f.avg_usd)) : null;
    res.json({ byGender: rows, femaleVsMaleGapPct: gap });
  } catch (err) { next(err); }
});

export default router;
