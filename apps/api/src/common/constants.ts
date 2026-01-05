/**
 * Application-wide constants
 */

// Hold configuration
export const HOLD_EXPIRATION_MINUTES = 10;

// Cron job configuration
export const HOLD_CLEANUP_BATCH_SIZE = 50;
export const HOLD_CLEANUP_MAX_WAIT_MS = 5000;
export const HOLD_CLEANUP_TIMEOUT_MS = 10000;

// Availability configuration
export const MAX_AVAILABILITY_DATE_RANGE_DAYS = 90;

// Transaction configuration
export const DEFAULT_TRANSACTION_TIMEOUT_MS = 10000;
export const DEFAULT_TRANSACTION_MAX_WAIT_MS = 5000;

// Booking configuration
export const BOOKING_CODE_LENGTH = 8;
export const BOOKING_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
