// ============================================================
// Transaction & Wallet Domain Types
// ============================================================

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'contribution' | 'fee' | 'interest' | string;
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | string;

export interface Transaction {
  id: number | string;
  amount: string | number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  created_at: string;
  description?: string;
  reference?: string;
  channel?: string;
  source_type?: string;
  destination_type?: string;
  recipient_name?: string;
  recipient_phone?: string;
  fee?: string | number;
  net_amount?: string | number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
  formatted?: string;
}

export interface BankDetails {
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  branch_code?: string;
}

export interface MobileMoneyDetails {
  provider: string;
  phone_number: string;
  recipient_name: string;
}
