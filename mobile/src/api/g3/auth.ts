import { api, tokenStore } from './client';
import type { AuthSession, JwtTokens } from './types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterCompanyInput {
  companyName: string;
  rfc?: string;
  contactEmail: string;
  contactPhone?: string;
  ownerName: string;
  password: string;
}

export const authApi = {
  async login(input: LoginInput): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/login', input, { anonymous: true });
    await tokenStore.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  },

  async registerCompany(input: RegisterCompanyInput): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/register-company', input, { anonymous: true });
    await tokenStore.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  },

  /** Envía un código de un solo uso por SMS al teléfono del chofer. */
  async requestOtp(phone: string): Promise<void> {
    await api.post<void>('/auth/otp/request', { phone }, { anonymous: true });
  },

  async verifyOtp(phone: string, code: string): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/otp/verify', { phone, code }, { anonymous: true });
    await tokenStore.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  },

  /** Siempre responde 202 (no revela si el correo existe). */
  async forgotPassword(email: string): Promise<void> {
    await api.post<void>('/auth/password/forgot', { email }, { anonymous: true });
  },

  async refresh(refreshToken: string): Promise<JwtTokens> {
    const res = await api.post<JwtTokens>('/auth/refresh', { refreshToken }, { anonymous: true });
    await tokenStore.save(res);
    return res;
  },

  async logout(): Promise<void> {
    await tokenStore.clear();
  },
};
