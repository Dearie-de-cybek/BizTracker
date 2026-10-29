import { getCountry } from './reference';
import type { Business, BusinessSettings, BusinessType, Ctx, DbState, Weekday } from './types';
import {
  cleanOptional,
  FieldErrors,
  hasErrors,
  isValidEmail,
  isValidPhone,
  isValidTime,
  parseQuantity,
  ValidationError,
} from './validation';

/** Form state of the setup wizard. Kept as strings where the user types. */
export interface SetupDraft {
  step: number;
  name: string;
  type: BusinessType | null;
  typeOther: string;
  address: string;
  countryCode: string;
  currencyCode: string;
  description: string;
  phone: string;
  email: string;
  logoUri: string | null;
  trackStock: boolean;
  lowStockAlerts: boolean;
  lowStockThreshold: string;
  useSkus: boolean;
  pricesIncludeTax: boolean;
  ownerName: string;
  receiptShowLogo: boolean;
  receiptShowAddress: boolean;
  receiptShowPhone: boolean;
  receiptFooter: string;
  openingInventory: 'add_now' | 'empty' | null;
  hoursEnabled: boolean;
  hoursDays: Weekday[];
  hoursOpens: string;
  hoursCloses: string;
}

export const SETUP_STEPS = [
  { title: 'Set up your business', short: 'Business' },
  { title: 'Contact and logo', short: 'Contact' },
  { title: 'Inventory and sales', short: 'Preferences' },
  { title: 'Owner and operations', short: 'Operations' },
] as const;

export function emptySetupDraft(): SetupDraft {
  // Country/currency default to Nigeria/NGN as the primary market; both are editable.
  return {
    step: 0,
    name: '',
    type: null,
    typeOther: '',
    address: '',
    countryCode: 'NG',
    currencyCode: 'NGN',
    description: '',
    phone: '',
    email: '',
    logoUri: null,
    trackStock: true,
    lowStockAlerts: true,
    lowStockThreshold: '5',
    useSkus: false,
    pricesIncludeTax: true,
    ownerName: '',
    receiptShowLogo: true,
    receiptShowAddress: true,
    receiptShowPhone: true,
    receiptFooter: 'Thank you for your patronage.',
    openingInventory: null,
    hoursEnabled: false,
    hoursDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    hoursOpens: '08:00',
    hoursCloses: '19:00',
  };
}

export function validateSetupStep(step: number, d: SetupDraft): FieldErrors<keyof SetupDraft> {
  const e: FieldErrors<keyof SetupDraft> = {};
  if (step === 0) {
    if (d.name.trim().length < 2) e.name = 'Enter your business name.';
    if (!d.type) e.type = 'Choose the type of business.';
    if (d.type === 'other' && !d.typeOther.trim()) e.typeOther = 'Describe your type of business.';
    if (!d.address.trim()) e.address = 'Enter where your business operates.';
    if (!getCountry(d.countryCode)) e.countryCode = 'Choose a country.';
    if (!d.currencyCode) e.currencyCode = 'Choose a currency.';
  }
  if (step === 1) {
    if (!d.phone.trim()) e.phone = 'Enter a phone number customers can reach.';
    else if (!isValidPhone(d.phone)) e.phone = 'Enter a valid phone number (7–15 digits).';
    if (d.email.trim() && !isValidEmail(d.email)) e.email = 'Enter a valid email or leave it empty.';
  }
  if (step === 2) {
    if (d.trackStock && d.lowStockAlerts && parseQuantity(d.lowStockThreshold) === null)
      e.lowStockThreshold = 'Enter a whole number, e.g. 5.';
  }
  if (step === 3) {
    if (d.ownerName.trim().length < 2) e.ownerName = 'Enter the owner or administrator name.';
    if (!d.openingInventory) e.openingInventory = 'Choose how you want to start.';
    if (d.hoursEnabled) {
      if (d.hoursDays.length === 0) e.hoursDays = 'Pick at least one day.';
      if (!isValidTime(d.hoursOpens)) e.hoursOpens = 'Use 24-hour time, e.g. 08:00.';
      if (!isValidTime(d.hoursCloses)) e.hoursCloses = 'Use 24-hour time, e.g. 19:00.';
    }
  }
  return e;
}

/** First step that has errors, or -1 when the whole draft is valid. */
export function firstInvalidStep(d: SetupDraft): number {
  for (let i = 0; i < SETUP_STEPS.length; i++) if (hasErrors(validateSetupStep(i, d))) return i;
  return -1;
}

export function settingsFromDraft(d: SetupDraft): BusinessSettings {
  return {
    trackStock: d.trackStock,
    lowStockAlerts: d.trackStock && d.lowStockAlerts,
    lowStockThreshold: parseQuantity(d.lowStockThreshold) ?? 5,
    useSkus: d.useSkus,
    pricesIncludeTax: d.pricesIncludeTax,
    receipt: {
      showLogo: d.receiptShowLogo,
      showAddress: d.receiptShowAddress,
      showPhone: d.receiptShowPhone,
      footerMessage: d.receiptFooter.trim(),
    },
    openingInventory: d.openingInventory ?? 'empty',
  };
}

export function completeSetup(state: DbState, d: SetupDraft, ctx: Ctx): DbState {
  const bad = firstInvalidStep(d);
  if (bad !== -1) {
    throw new ValidationError('Some required details are missing.', validateSetupStep(bad, d));
  }
  const now = ctx.now().toISOString();
  const business: Business = {
    id: state.business?.id ?? ctx.id(),
    name: d.name.trim(),
    type: d.type!,
    typeOther: d.type === 'other' ? d.typeOther.trim() : undefined,
    address: d.address.trim(),
    countryCode: d.countryCode,
    currencyCode: d.currencyCode,
    description: cleanOptional(d.description),
    phone: d.phone.trim(),
    email: cleanOptional(d.email),
    logoUri: d.logoUri ?? undefined,
    ownerName: d.ownerName.trim(),
    openingHours: d.hoursEnabled
      ? { days: d.hoursDays, opens: d.hoursOpens.trim(), closes: d.hoursCloses.trim() }
      : undefined,
    createdAt: state.business?.createdAt ?? now,
    updatedAt: now,
  };
  return { ...state, business, settings: settingsFromDraft(d), setupCompletedAt: now };
}
