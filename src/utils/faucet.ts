// Updated frontend faucet service to use backend API

interface FaucetResult {
  success: boolean;
  txHash?: string;
  error?: string;
  nextClaimTime?: number;
}

interface FaucetStats {
  totalClaimed: number;
  totalUsers: number;
  totalTransactions: number;
  faucetBalance: number;
  lastClaim: string | null;
}

interface PrivateFaucetStats {
  totalClaimed: number;
  totalUsers: number;
  totalTransactions: number;
  faucetBalance: string;
  lastClaim: string | null;
}
interface EligibilityCheck {
  eligible: boolean;
  reason?: string;
  nextClaimTime?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function sendFaucetTransaction(
  recipientAddress: string, 
  recaptchaToken: string
): Promise<FaucetResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/faucet/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: recipientAddress,
        recaptchaToken
      })
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        txHash: data.txHash
      };
    } else {
      return {
        success: false,
        error: data.error || 'Claim failed',
        nextClaimTime: data.nextClaimTime
      };
    }
  } catch (error) {
    console.error('Faucet claim error:', error);
    return {
      success: false,
      error: 'Network error. Please try again later.'
    };
  }
}

export async function sendPrivateFaucetTransaction(
  recipientAddress: string, 
  recaptchaToken: string
): Promise<FaucetResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/faucet/claim-private`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: recipientAddress,
        recaptchaToken
      })
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        txHash: data.txHash
      };
    } else {
      return {
        success: false,
        error: data.error || 'Private claim failed',
        nextClaimTime: data.nextClaimTime
      };
    }
  } catch (error) {
    console.error('Private faucet claim error:', error);
    return {
      success: false,
      error: 'Network error. Please try again later.'
    };
  }
}
export async function getFaucetStats(): Promise<FaucetStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/faucet/stats`);
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to fetch stats');
    }
  } catch (error) {
    console.error('Failed to fetch faucet stats:', error);
    return {
      totalClaimed: 0,
      totalUsers: 0,
      totalTransactions: 0,
      faucetBalance: 0,
      lastClaim: null
    };
  }
}

export async function getPrivateFaucetStats(): Promise<PrivateFaucetStats> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/faucet/stats-private`);
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to fetch private stats');
    }
  } catch (error) {
    console.error('Failed to fetch private faucet stats:', error);
    return {
      totalClaimed: 0,
      totalUsers: 0,
      totalTransactions: 0,
      faucetBalance: "Private OCT",
      lastClaim: null
    };
  }
}
export async function checkEligibility(address: string): Promise<EligibilityCheck> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/faucet/eligibility/${address}`);
    
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error('Failed to check eligibility');
    }
  } catch (error) {
    console.error('Failed to check eligibility:', error);
    return {
      eligible: false,
      reason: 'Unable to check eligibility'
    };
  }
}

export function formatTimeRemaining(nextClaimTime: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = nextClaimTime - now;
  
  if (secondsRemaining <= 0) return "Available now";
  
  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}