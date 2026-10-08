/** Public store address. This is the shop address shown to customers, not an approved legal registration record. */
export const STORE_ADDRESS = {
  street: 'Avinguda Alcora 412',
  postalCode: '12006',
  city: 'Castelló de la Plana',
  region: 'Castelló',
  country: 'Spain',
  countryCode: 'ES',
  lines: ['Avinguda Alcora 412', '12006 Castelló de la Plana', 'Castelló, Spain'],
} as const;

export const STORE_ADDRESS_LINE = 'Avinguda Alcora 412, 12006 Castelló de la Plana, Castelló, Spain';

/** UK branch office shown alongside the store address. */
export const UK_BRANCH_OFFICE = {
  label: 'UK branch office',
  street: '519 Beverley Dr',
  postalCode: 'ST2 0QB',
  city: 'Stoke-on-Trent',
  country: 'United Kingdom',
  countryCode: 'GB',
  lines: ['519 Beverley Dr', 'Stoke-on-Trent ST2 0QB, UK'],
} as const;

export const UK_BRANCH_OFFICE_LINE = '519 Beverley Dr, Stoke-on-Trent ST2 0QB, UK';
