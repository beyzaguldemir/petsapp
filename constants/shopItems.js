// ── Shop catalogue ────────────────────────────────────────────
// slot: 'hat' | 'glasses' | 'shoes'
// type (glasses only):
//   'dark_glasses'        → hides eyes entirely (sunglasses effect 😎)
//   'transparent_glasses' → eyes stay visible, glasses render on top 👓
// Only one item per slot can be equipped at a time.

export const SHOP_ITEMS = [
  // ── Hats ──────────────────────────────────────────────────
  { id: 'crown',          name: 'Crown',          price: 1000, emoji: '👑', slot: 'hat' },
  { id: 'graduation_hat', name: 'Graduation Hat', price: 1000, emoji: '🎓', slot: 'hat' },
  { id: 'helmet',         name: 'Helmet',         price: 1000, emoji: '🪖', slot: 'hat' },
  { id: 'black_hat',      name: 'Black Hat',      price: 1000, emoji: '🎩', slot: 'hat' },
  // ── Glasses ───────────────────────────────────────────────
  { id: 'sunglasses',    name: 'Sunglasses',    price: 70, emoji: '🕶️', slot: 'glasses', type: 'dark_glasses'        },
  { id: 'round_glasses', name: 'Round Glasses', price: 60, emoji: '👓', slot: 'glasses', type: 'transparent_glasses' },
  // ── Shoes ─────────────────────────────────────────────────
  { id: 'shoes',       name: 'Sneakers',    price:  80, emoji: '👟', slot: 'shoes' },
  { id: 'boots',       name: 'Boots',       price: 300, emoji: '👢', slot: 'shoes' },
  { id: 'high_heels',  name: 'High Heels',  price: 300, emoji: '👠', slot: 'shoes' },
  { id: 'hiking_boot', name: 'Hiking Boot', price: 300, emoji: '🥾', slot: 'shoes' },
  { id: 'sandal',      name: 'Sandal',      price: 300, emoji: '👡', slot: 'shoes' },
];

// Lookup helper: find item by id
export const findItem = (id) => SHOP_ITEMS.find(i => i.id === id) ?? null;
