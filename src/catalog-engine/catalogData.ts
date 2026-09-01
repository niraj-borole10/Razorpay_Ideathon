import { Product } from './types';

export const merchantCatalog: Product[] = [
  {
    id: 'prod_run_001',
    sku: 'SHOE-RUN-001',
    name: 'ShopStore Nitro 4 Running Shoes',
    category: 'Footwear',
    description: 'High-responsiveness lightweight marathon running shoes with carbon-fiber plate and breathable mesh.',
    tags: ['running', 'shoe', 'sports', 'marathon', 'footwear', 'lightweight'],
    priceInr: 1899,
    costPriceInr: 1100,
    currency: 'INR',
    stock: 45,
    rating: 4.8,
    reviewCount: 320,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_001_uk8', sku: 'SHOE-RUN-001-UK8', name: 'UK 8 / Blaze Red', size: 'UK 8', color: 'Blaze Red', priceInr: 1899, stock: 15 },
      { id: 'var_001_uk9', sku: 'SHOE-RUN-001-UK9', name: 'UK 9 / Blaze Red', size: 'UK 9', color: 'Blaze Red', priceInr: 1899, stock: 20 },
      { id: 'var_001_uk10', sku: 'SHOE-RUN-001-UK10', name: 'UK 10 / Stealth Black', size: 'UK 10', color: 'Stealth Black', priceInr: 1899, stock: 10 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 5,
      bulkDiscountPct: 12,
      couponCodesAllowed: ['AERO10', 'FIRSTAGENT']
    }
  },
  {
    id: 'prod_sneaker_002',
    sku: 'SHOE-SNK-002',
    name: 'UrbanGlide Classic Leather Sneakers',
    category: 'Footwear',
    description: 'Minimalist everyday premium leather sneakers with memory foam insole and anti-slip rubber outsole.',
    tags: ['sneakers', 'casual', 'leather', 'white shoes', 'urban', 'footwear'],
    priceInr: 1399,
    costPriceInr: 800,
    currency: 'INR',
    stock: 30,
    rating: 4.6,
    reviewCount: 180,
    imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_002_uk8', sku: 'SHOE-SNK-002-UK8', name: 'UK 8 / Pure White', size: 'UK 8', color: 'Pure White', priceInr: 1399, stock: 12 },
      { id: 'var_002_uk9', sku: 'SHOE-SNK-002-UK9', name: 'UK 9 / Pure White', size: 'UK 9', color: 'Pure White', priceInr: 1399, stock: 18 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 12,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 3,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['URBAN10']
    }
  },
  {
    id: 'prod_smart_003',
    sku: 'WEAR-PRO-003',
    name: 'PulseWatch Ultra GPS Smartwatch',
    category: 'Wearables',
    description: 'AMOLED Always-on Display, 14-day battery life, dual-band GPS, SpO2 & VO2 max real-time telemetry.',
    tags: ['smartwatch', 'watch', 'fitness', 'gps', 'wearable', 'tech', 'amoled'],
    priceInr: 2299,
    costPriceInr: 1300,
    currency: 'INR',
    stock: 22,
    rating: 4.9,
    reviewCount: 512,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_003_blk', sku: 'WEAR-PRO-003-BLK', name: 'Titanium Black / 46mm', size: '46mm', color: 'Titanium Black', priceInr: 2299, stock: 14 },
      { id: 'var_003_slv', sku: 'WEAR-PRO-003-SLV', name: 'Starlight Silver / 46mm', size: '46mm', color: 'Starlight Silver', priceInr: 2299, stock: 8 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 10,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 2,
      bulkDiscountPct: 8,
      couponCodesAllowed: ['PULSE5']
    }
  },
  {
    id: 'prod_audio_004',
    sku: 'AUD-ANC-004',
    name: 'AeroAcoustics True Wireless Earbuds',
    category: 'Accessories',
    description: 'Active Noise Cancellation (-42dB), LDAC Hi-Res Audio, 36h playtime with Qi Wireless fast charging.',
    tags: ['earbuds', 'audio', 'anc', 'wireless', 'music', 'accessories'],
    priceInr: 1199,
    costPriceInr: 650,
    currency: 'INR',
    stock: 60,
    rating: 4.7,
    reviewCount: 410,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_004_blk', sku: 'AUD-ANC-004-BLK', name: 'Midnight Matte Black', color: 'Black', priceInr: 1199, stock: 35 },
      { id: 'var_004_wht', sku: 'AUD-ANC-004-WHT', name: 'Frost White', color: 'White', priceInr: 1199, stock: 25 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 4,
      bulkDiscountPct: 12,
      couponCodesAllowed: ['SOUND15']
    }
  },
  {
    id: 'prod_tee_005',
    sku: 'APP-DRY-005',
    name: 'Dri-Fit Aero-Vent Tech Performance Tee',
    category: 'Apparel',
    description: 'Sweat-wicking lightweight 4-way stretch fabric engineered for high-intensity gym and outdoor workouts.',
    tags: ['tshirt', 'apparel', 'gym', 'dryfit', 'clothing'],
    priceInr: 499,
    costPriceInr: 250,
    currency: 'INR',
    stock: 80,
    rating: 4.5,
    reviewCount: 220,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_005_m', sku: 'APP-DRY-005-M', name: 'Size M / Navy Blue', size: 'M', color: 'Navy Blue', priceInr: 499, stock: 40 },
      { id: 'var_005_l', sku: 'APP-DRY-005-L', name: 'Size L / Navy Blue', size: 'L', color: 'Navy Blue', priceInr: 499, stock: 40 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 5,
      bulkDiscountPct: 15,
      couponCodesAllowed: ['GYM10']
    }
  },
  {
    id: 'prod_mat_006',
    sku: 'ACC-MAT-006',
    name: 'ProGrip Eco Dual-Layer Yoga & Exercise Mat 6mm',
    category: 'Accessories',
    description: 'High-density cushioned TPE eco-friendly anti-slip exercise mat with alignment guidelines and carry strap.',
    tags: ['yoga', 'mat', 'exercise', 'fitness', 'accessories', 'workout'],
    priceInr: 699,
    costPriceInr: 350,
    currency: 'INR',
    stock: 50,
    rating: 4.8,
    reviewCount: 195,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_006_teal', sku: 'ACC-MAT-006-TEA', name: 'Teal Blue / 6mm', color: 'Teal Blue', priceInr: 699, stock: 25 },
      { id: 'var_006_prp', sku: 'ACC-MAT-006-PRP', name: 'Violet Purple / 6mm', color: 'Violet Purple', priceInr: 699, stock: 25 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 3,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['YOGA10']
    }
  },
  {
    id: 'prod_bottle_007',
    sku: 'ACC-BOT-007',
    name: 'HydroPulse Insulated Stainless Steel Shaker Bottle 750ml',
    category: 'Accessories',
    description: 'Double-wall vacuum insulated shaker bottle with built-in blending whisk, keeps drinks cold 24 hours.',
    tags: ['bottle', 'shaker', 'gym', 'accessories', 'protein', 'hydration'],
    priceInr: 449,
    costPriceInr: 220,
    currency: 'INR',
    stock: 75,
    rating: 4.7,
    reviewCount: 310,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_007_blk', sku: 'ACC-BOT-007-BLK', name: 'Matte Stealth Black', color: 'Black', priceInr: 449, stock: 40 },
      { id: 'var_007_slv', sku: 'ACC-BOT-007-SLV', name: 'Brushed Silver', color: 'Silver', priceInr: 449, stock: 35 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 4,
      bulkDiscountPct: 12,
      couponCodesAllowed: ['HYDRO10']
    }
  },
  {
    id: 'prod_shorts_008',
    sku: 'APP-SHT-008',
    name: 'AeroStretch 2-in-1 Marathon Running Shorts',
    category: 'Apparel',
    description: 'Lightweight outer shell with built-in compressive liner and anti-bounce zipper phone storage pocket.',
    tags: ['shorts', 'running', 'apparel', 'gym', 'clothing'],
    priceInr: 599,
    costPriceInr: 300,
    currency: 'INR',
    stock: 65,
    rating: 4.6,
    reviewCount: 140,
    imageUrl: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_008_m', sku: 'APP-SHT-008-M', name: 'Size M / Charcoal Grey', size: 'M', color: 'Charcoal Grey', priceInr: 599, stock: 35 },
      { id: 'var_008_l', sku: 'APP-SHT-008-L', name: 'Size L / Charcoal Grey', size: 'L', color: 'Charcoal Grey', priceInr: 599, stock: 30 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 3,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['RUN10']
    }
  },
  {
    id: 'prod_bands_009',
    sku: 'ACC-BND-009',
    name: 'FlexiBand Heavy-Duty Resistance Loop Bands (Set of 5)',
    category: 'Accessories',
    description: '100% natural latex resistance exercise bands for strength training, physiotherapy, and glute activation.',
    tags: ['resistance', 'bands', 'workout', 'gym', 'fitness', 'accessories'],
    priceInr: 349,
    costPriceInr: 160,
    currency: 'INR',
    stock: 90,
    rating: 4.9,
    reviewCount: 480,
    imageUrl: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_009_multi', sku: 'ACC-BND-009-SET', name: 'Set of 5 (X-Light to X-Heavy)', color: 'Multi-color', priceInr: 349, stock: 90 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 5,
      bulkDiscountPct: 15,
      couponCodesAllowed: ['FLEX10']
    }
  },
  {
    id: 'prod_bag_010',
    sku: 'ACC-BAG-010',
    name: 'AeroVent Water-Resistant Gym Duffel Bag 35L',
    category: 'Accessories',
    description: 'Spacious sports duffel bag with dedicated ventilated shoe compartment and wet towel pocket.',
    tags: ['bag', 'duffel', 'gym', 'sports', 'accessories', 'travel'],
    priceInr: 899,
    costPriceInr: 450,
    currency: 'INR',
    stock: 40,
    rating: 4.7,
    reviewCount: 160,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_010_blk', sku: 'ACC-BAG-010-BLK', name: 'Stealth Black 35L', color: 'Black', priceInr: 899, stock: 25 },
      { id: 'var_010_nvy', sku: 'ACC-BAG-010-NVY', name: 'Deep Navy 35L', color: 'Navy', priceInr: 899, stock: 15 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 2,
      bulkDiscountPct: 8,
      couponCodesAllowed: ['BAG10']
    }
  },
  {
    id: 'prod_socks_011',
    sku: 'APP-SCK-011',
    name: 'CushionMax Anti-Blister Compression Ankle Socks (Pack of 3)',
    category: 'Apparel',
    description: 'Targeted arch compression, seamless toe box, and moisture-wicking breathable mesh for long-distance runs.',
    tags: ['socks', 'running', 'apparel', 'marathon', 'footwear'],
    priceInr: 249,
    costPriceInr: 110,
    currency: 'INR',
    stock: 120,
    rating: 4.8,
    reviewCount: 260,
    imageUrl: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_011_wht', sku: 'APP-SCK-011-WHT', name: 'Pack of 3 / Classic White', color: 'White', priceInr: 249, stock: 60 },
      { id: 'var_011_blk', sku: 'APP-SCK-011-BLK', name: 'Pack of 3 / Stealth Black', color: 'Black', priceInr: 249, stock: 60 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 4,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['SOCK10']
    }
  },
  {
    id: 'prod_gloves_012',
    sku: 'ACC-GLV-012',
    name: 'PowerGrip Padded Weightlifting & Gym Gloves',
    category: 'Accessories',
    description: 'Silicone anti-slip palm grip with integrated wrist wraps for maximum wrist stability and blister prevention.',
    tags: ['gloves', 'gym', 'lifting', 'workout', 'accessories'],
    priceInr: 379,
    costPriceInr: 180,
    currency: 'INR',
    stock: 55,
    rating: 4.6,
    reviewCount: 175,
    imageUrl: 'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_012_m', sku: 'ACC-GLV-012-M', name: 'Size M / Black', size: 'M', color: 'Black', priceInr: 379, stock: 30 },
      { id: 'var_012_l', sku: 'ACC-GLV-012-L', name: 'Size L / Black', size: 'L', color: 'Black', priceInr: 379, stock: 25 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 3,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['GRIP10']
    }
  },
  {
    id: 'prod_roller_013',
    sku: 'ACC-ROL-013',
    name: 'DeepTissue High-Density Foam Muscle Roller',
    category: 'Accessories',
    description: 'Trigger-point grid foam roller designed for deep tissue massage, myofascial release, and post-workout recovery.',
    tags: ['foam roller', 'recovery', 'massage', 'fitness', 'accessories'],
    priceInr: 549,
    costPriceInr: 260,
    currency: 'INR',
    stock: 45,
    rating: 4.8,
    reviewCount: 210,
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_013_blk', sku: 'ACC-ROL-013-BLK', name: 'High-Density / Solid Black', color: 'Black', priceInr: 549, stock: 45 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 2,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['ROLL10']
    }
  },
  {
    id: 'prod_cap_014',
    sku: 'APP-CAP-014',
    name: 'AeroVent Breathable Quick-Dry Sports Running Cap',
    category: 'Apparel',
    description: 'Ultra-lightweight laser-perforated running cap with UPF 50+ sun protection and reflective rear strap.',
    tags: ['cap', 'hat', 'running', 'apparel', 'sports', 'accessories'],
    priceInr: 299,
    costPriceInr: 130,
    currency: 'INR',
    stock: 85,
    rating: 4.7,
    reviewCount: 130,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_014_blk', sku: 'APP-CAP-014-BLK', name: 'Pitch Black / Adjustable', color: 'Black', priceInr: 299, stock: 45 },
      { id: 'var_014_wht', sku: 'APP-CAP-014-WHT', name: 'Arctic White / Adjustable', color: 'White', priceInr: 299, stock: 40 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 3,
      bulkDiscountPct: 10,
      couponCodesAllowed: ['CAP10']
    }
  },
  {
    id: 'prod_rope_015',
    sku: 'ACC-ROP-015',
    name: 'SpeedPro 360° Ball-Bearing Adjustable Jump Rope',
    category: 'Accessories',
    description: 'Tangle-free steel wire speed jump rope with aluminum knurled handles for high-speed crossfit and cardio.',
    tags: ['jump rope', 'skipping', 'cardio', 'fitness', 'crossfit', 'accessories'],
    priceInr: 249,
    costPriceInr: 95,
    currency: 'INR',
    stock: 110,
    rating: 4.8,
    reviewCount: 340,
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&auto=format&fit=crop&q=80',
    variants: [
      { id: 'var_015_red', sku: 'ACC-ROP-015-RED', name: 'Steel Wire / Crimson Red', color: 'Red', priceInr: 249, stock: 55 },
      { id: 'var_015_blk', sku: 'ACC-ROP-015-BLK', name: 'Steel Wire / Matte Black', color: 'Black', priceInr: 249, stock: 55 }
    ],
    discountPolicy: {
      maxAllowedDiscountPct: 15,
      allowAgentNegotiation: true,
      minOrderQuantityForBulk: 5,
      bulkDiscountPct: 15,
      couponCodesAllowed: ['SPEED10']
    }
  }
];
