export type BoxStatus = 'available' | 'active' | 'expired' | 'held';

export interface Box {
  id: number;
  status: BoxStatus;
  startup_name?: string;
  tagline?: string;
  category?: string;
  logo_url?: string;
  target_url?: string;
  inventor_name?: string;
  secret_key?: string;
  github_id?: string;
  created_at: string;
}

export interface PurchaseRequest {
  id: number;
  startup_name: string;
  tagline: string;
  category: string;
  logo_url: string;
  target_url: string;
  inventor_name: string;
}
