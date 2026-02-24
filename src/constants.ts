export const CATEGORIES = [
  'SaaS',
  'AI',
  'Fintech',
  'Healthtech',
  'E-commerce',
  'DevTools',
  'Web3',
  'Marketing',
  'Education',
  'Other'
] as const;

export type Category = typeof CATEGORIES[number];
