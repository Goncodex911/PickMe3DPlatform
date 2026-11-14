/**
 * Payout Service — API layer for Creator Wallet & Payout operations
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("pickme3d_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface WalletMetrics {
  totalEarnings: number;
  availableBalance: number;
  pendingPayout: number;
  paidPayout: number;
  rejectedPayout: number;
  salesEarnings: number;
  seededBalance: number;
}

export interface PayoutRecord {
  _id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  amount: number;
  creatorBalance: number;
  bankInfo: BankInfo;
  status: "PENDING" | "PAID" | "REJECTED";
  adminNote?: string;
  paymentProof?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EarningsRecord {
  _id: string;
  orderCode: number;
  templateTitle: string;
  templateThumbnail: string;
  grossAmount: number;
  amount: number;
  creatorEarnings: number;
  buyerName: string;
  buyerEmail?: string;
  paidAt: string;
}

export interface CreatorWalletSummary {
  metrics: WalletMetrics;
  savedBankInfo: BankInfo;
  earningsHistory: EarningsRecord[];
  payoutHistory: PayoutRecord[];
}

/**
 * Fetch creator wallet summary, metrics, and transaction histories
 */
export async function fetchCreatorWalletSummaryApi(): Promise<{
  success: boolean;
  data?: CreatorWalletSummary;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/payouts/wallet`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || "Failed to fetch wallet summary" };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Network error while loading wallet information." };
  }
}

/**
 * Submit a new withdrawal / payout request
 */
export async function requestPayoutApi(payload: {
  amount: number;
  bankInfo: BankInfo;
  saveBankInfo?: boolean;
}): Promise<{
  success: boolean;
  data?: PayoutRecord;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/payouts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || "Could not submit the payout request." };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Could not connect while submitting the payout request." };
  }
}

/**
 * Update saved bank information in user profile
 */
export async function updateSavedBankInfoApi(payload: BankInfo): Promise<{
  success: boolean;
  data?: BankInfo;
  message?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/payouts/bank-info`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, message: json.message || "Could not update bank details." };
    }
    return json;
  } catch (err: any) {
    return { success: false, message: err?.message || "Could not connect while saving bank details." };
  }
}

