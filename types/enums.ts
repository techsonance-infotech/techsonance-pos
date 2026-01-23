// Replacements for Prisma Enums since SQLite schema uses Strings

export const Role = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    BUSINESS_OWNER: 'BUSINESS_OWNER',
    MANAGER: 'MANAGER',
    CASHIER: 'CASHIER',
    USER: 'USER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const BackupType = {
    MANUAL: 'MANUAL',
    SCHEDULED: 'SCHEDULED',
} as const;
export type BackupType = (typeof BackupType)[keyof typeof BackupType];

export const BackupScope = {
    FULL: 'FULL',
    COMPANY: 'COMPANY',
} as const;
export type BackupScope = (typeof BackupScope)[keyof typeof BackupScope];

export const BackupStatus = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;
export type BackupStatus = (typeof BackupStatus)[keyof typeof BackupStatus];

export const LicenseStatus = {
    ACTIVE: 'ACTIVE',
    PENDING: 'PENDING',
    EXPIRED: 'EXPIRED',
    REVOKED: 'REVOKED',
} as const;
export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export const LicenseType = {
    TRIAL: 'TRIAL',
    ANNUAL: 'ANNUAL',
    PERPETUAL: 'PERPETUAL',
} as const;
export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

export const SecurityRuleType = {
    IP: 'IP',
    COUNTRY: 'COUNTRY',
    USER_AGENT: 'USER_AGENT',
} as const;
export type SecurityRuleType = (typeof SecurityRuleType)[keyof typeof SecurityRuleType];

export const TableStatus = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const OrderStatus = {
    HELD: 'HELD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMode = {
    CASH: 'CASH',
    CARD: 'CARD',
    UPI: 'UPI',
    OTHER: 'OTHER',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];
