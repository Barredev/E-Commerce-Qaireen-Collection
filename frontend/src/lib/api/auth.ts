import { api } from "./client";

import type { AuthResponse } from "@/lib/types/user";
import type { ResourceResponse } from "@/lib/types/api";
import type { User } from "@/lib/types/user";

export interface LoginPayload {
  email: string;
  password: string;
  device_name?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  device_name?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  password?: string;
  password_confirmation?: string;
  current_password?: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    device_name: "web",
    ...payload,
  });

  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    device_name: "web",
    ...payload,
  });

  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<ResourceResponse<User>>("/auth/me");

  return data.data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<User> {
  const { data } = await api.put<ResourceResponse<User>>("/auth/me", payload);

  return data.data;
}
