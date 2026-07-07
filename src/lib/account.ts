/**
 * Customer accounts via the Shopify Storefront API (classic accounts).
 * These operate on the SAME Shopify customers shown in the admin — we only
 * host the login/register UI. The access token is kept in localStorage.
 */
import { shopifyFetch } from './shopify';

const TOKEN_KEY = 'objktt-customer-token';

export interface StoredToken {
  accessToken: string;
  expiresAt: string; // ISO
}

export interface CustomerAddress {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  zip: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  total: { amount: string; currencyCode: string };
}

export interface CustomerAddressEntry {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  zip: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: CustomerAddress | null;
  addresses: CustomerAddressEntry[];
  orders: CustomerOrder[];
  points?: number; // 적립금 잔액(원)
}

export interface UserError {
  code?: string;
  message: string;
}

export const getStoredToken = (): StoredToken | null => {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as StoredToken;
    if (!t.accessToken || new Date(t.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
};
const setStoredToken = (t: StoredToken) => localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
export const clearStoredToken = () => localStorage.removeItem(TOKEN_KEY);

const TOKEN_CREATE = /* GraphQL */ `
  mutation Login($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code message }
    }
  }
`;

export async function login(email: string, password: string): Promise<{ token?: StoredToken; errors: UserError[] }> {
  const data = await shopifyFetch<{
    customerAccessTokenCreate: {
      customerAccessToken: { accessToken: string; expiresAt: string } | null;
      customerUserErrors: UserError[];
    };
  }>(TOKEN_CREATE, { input: { email, password } });
  const r = data.customerAccessTokenCreate;
  if (r.customerAccessToken) {
    const token = { accessToken: r.customerAccessToken.accessToken, expiresAt: r.customerAccessToken.expiresAt };
    setStoredToken(token);
    return { token, errors: [] };
  }
  return { errors: r.customerUserErrors.length ? r.customerUserErrors : [{ message: '로그인에 실패했습니다.' }] };
}

const CUSTOMER_CREATE = /* GraphQL */ `
  mutation Register($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id }
      customerUserErrors { code message }
    }
  }
`;

export async function register(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{ errors: UserError[] }> {
  const data = await shopifyFetch<{
    customerCreate: { customer: { id: string } | null; customerUserErrors: UserError[] };
  }>(CUSTOMER_CREATE, {
    input: {
      email: input.email,
      password: input.password,
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    },
  });
  const r = data.customerCreate;
  if (r.customer) return { errors: [] };
  // 가입 보너스는 로그인 후 첫 적립금 조회(account 'points' 액션) 시 멱등 적립된다.
  return { errors: r.customerUserErrors.length ? r.customerUserErrors : [{ message: '회원가입에 실패했습니다.' }] };
}

const CUSTOMER_QUERY = /* GraphQL */ `
  query Me($token: String!) {
    customer(customerAccessToken: $token) {
      id
      firstName
      lastName
      email
      phone
      defaultAddress { id firstName lastName phone zip address1 address2 city province country }
      addresses(first: 20) {
        edges { node { id firstName lastName phone zip address1 address2 city province country } }
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            currentTotalPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

async function fetchPoints(token: string): Promise<number> {
  try {
    const r = await fetch('/api/account/address', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-storefront-token': token },
      body: JSON.stringify({ action: 'points' }),
    });
    if (!r.ok) return 0;
    const j = (await r.json()) as { balance?: number };
    return Number(j.balance ?? 0) || 0;
  } catch {
    return 0;
  }
}

export async function getCustomer(token: string): Promise<Customer | null> {
  const data = await shopifyFetch<{ customer: any | null }>(CUSTOMER_QUERY, { token });
  const c = data.customer;
  if (!c) return null;
  const points = await fetchPoints(token);
  return {
    points,
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    defaultAddress: c.defaultAddress ?? null,
    addresses: (c.addresses?.edges ?? []).map((e: any) => ({
      id: e.node.id,
      firstName: e.node.firstName,
      lastName: e.node.lastName,
      phone: e.node.phone,
      zip: e.node.zip,
      address1: e.node.address1,
      address2: e.node.address2,
      city: e.node.city,
      isDefault: e.node.id === c.defaultAddress?.id,
    })),
    orders: (c.orders?.edges ?? []).map((e: any) => ({
      id: e.node.id,
      orderNumber: e.node.orderNumber,
      processedAt: e.node.processedAt,
      financialStatus: e.node.financialStatus,
      fulfillmentStatus: e.node.fulfillmentStatus,
      total: e.node.currentTotalPrice,
    })),
  };
}

const TOKEN_DELETE = /* GraphQL */ `
  mutation Logout($token: String!) {
    customerAccessTokenDelete(customerAccessToken: $token) {
      deletedAccessToken
      userErrors { field message }
    }
  }
`;

export async function logout(token: string): Promise<void> {
  try {
    await shopifyFetch(TOKEN_DELETE, { token });
  } catch {
    /* best-effort */
  }
  clearStoredToken();
}

/**
 * Social-login (Google/Naver/Kakao) session — issued by our backend as an
 * HttpOnly cookie, so it isn't readable from JS; we ask the server who we are.
 */
export async function fetchSocialSession(): Promise<Customer | null> {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) return null;
    const data = (await r.json()) as { customer: Customer | null };
    return data.customer ?? null;
  } catch {
    return null;
  }
}

export async function socialLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* best-effort */
  }
}

export interface AddressPayload {
  firstName?: string;
  phone?: string;
  zip?: string;
  address1?: string;
  address2?: string;
}

/**
 * Address-book operations. Works for both auth modes: the social session cookie
 * is sent automatically (credentials:include), and email/password users attach
 * their Storefront token so the server can resolve their customer.
 */
async function addressRequest(body: object): Promise<{ ok: boolean; error?: string }> {
  const token = getStoredToken();
  try {
    const r = await fetch('/api/account/address', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-storefront-token': token.accessToken } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (r.ok && data.ok) return { ok: true };
    return { ok: false, error: data.error || '주소 처리에 실패했습니다.' };
  } catch {
    return { ok: false, error: '주소 처리 중 오류가 발생했습니다.' };
  }
}

export const addAddress = (address: AddressPayload, setAsDefault = false) =>
  addressRequest({ action: 'create', address, setAsDefault });
export const editAddress = (addressId: string, address: AddressPayload, setAsDefault = false) =>
  addressRequest({ action: 'update', addressId, address, setAsDefault });
export const removeAddress = (addressId: string) => addressRequest({ action: 'delete', addressId });
export const makeDefaultAddress = (addressId: string) => addressRequest({ action: 'setDefault', addressId });
