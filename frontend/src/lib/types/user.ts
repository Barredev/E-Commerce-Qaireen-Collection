export type UserRole = "customer" | "admin" | "warehouse";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  role_label: string | null;
  avatar_url: string | null;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string | null;
}

export interface AuthResponse {
  message: string;
  data: User;
  token: string;
}
