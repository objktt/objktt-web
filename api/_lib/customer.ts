/**
 * Bridges a social-login identity to a real Shopify customer (Admin API), so
 * orders still attach to a customer record. Also reads the customer + recent
 * orders for /api/auth/me in the same shape src/lib/account.ts uses.
 */

import { computeBalance } from './points.js';
import { krCity, krProvinceCode, splitName } from './krAddress.js';

const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const ADMIN_DOMAIN =
  process.env.SHOPIFY_ADMIN_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || 'objktt.myshopify.com';
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

export interface AddressEntry {
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

export interface BridgedCustomer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  defaultAddress: Record<string, unknown> | null;
  addresses: AddressEntry[];
  orders: {
    id: string;
    orderNumber: number;
    processedAt: string;
    financialStatus: string | null;
    fulfillmentStatus: string | null;
    total: { amount: string; currencyCode: string };
    items: { title: string; quantity: number }[];
  }[];
  points: number;
}

async function adminGraphql<T = any>(query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://${ADMIN_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Shopify Admin API error: ${JSON.stringify(j.errors || j)}`);
  return j.data as T;
}

/** Find an existing customer GID by email (no creation). Returns null when none. */
export async function findCustomerByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const found = await adminGraphql<{ customers: { edges: { node: { id: string } }[] } }>(
    `query FindCustomer($q: String!) { customers(first: 1, query: $q) { edges { node { id } } } }`,
    { q: `email:${JSON.stringify(email)}` }
  );
  return found.customers.edges[0]?.node?.id ?? null;
}

/** Find an existing customer by email, or create one. Returns the customer GID. */
export async function findOrCreateCustomer(email: string, name?: string): Promise<string> {
  const existing = await findCustomerByEmail(email);
  if (existing) return existing;

  const created = await adminGraphql<{
    customerCreate: { customer: { id: string } | null; userErrors: { field: string[]; message: string }[] };
  }>(
    `mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) { customer { id } userErrors { field message } }
    }`,
    { input: { email, ...(name ? { firstName: name } : {}) } }
  );
  const node = created.customerCreate.customer;
  if (!node) {
    throw new Error(`customerCreate failed: ${JSON.stringify(created.customerCreate.userErrors)}`);
  }
  return node.id;
}

/** Korean numbers → E.164 so Shopify won't reject the address. */
function normalizePhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  const d = raw.replace(/\D/g, '');
  if (!d) return undefined;
  if (d.startsWith('82')) return `+${d}`;
  if (d.startsWith('0')) return `+82${d.slice(1)}`;
  return `+82${d}`;
}

export interface AddressInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  zip?: string;
  address1?: string;
  address2?: string;
  city?: string;
}

function toMailingAddress(a: AddressInput) {
  // Shopify는 lastName·province를 필수 검증한다 — 빠지면 주소 저장이 통째로
  // 실패한다 (krAddress.ts 주석 참고). 성이 따로 안 오면 이름을 쪼갠다.
  const { firstName, lastName } = (a.lastName || '').trim()
    ? { firstName: (a.firstName || '').trim() || '고객', lastName: (a.lastName as string).trim() }
    : splitName(a.firstName);
  return {
    firstName,
    lastName,
    phone: normalizePhone(a.phone),
    zip: a.zip || undefined,
    address1: a.address1 || undefined,
    address2: a.address2 || undefined,
    city: a.city || krCity(a.address1) || '서울',
    provinceCode: krProvinceCode(a.address1),
    countryCode: 'KR',
  };
}

/** Add a new address to the customer's address book. */
export async function createAddress(customerId: string, a: AddressInput, setAsDefault = false): Promise<void> {
  if (!a.address1) throw new Error('address1 required');
  const r = await adminGraphql<{ customerAddressCreate: { userErrors: { message: string }[] } }>(
    `mutation CreateAddr($cid: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
      customerAddressCreate(customerId: $cid, address: $address, setAsDefault: $setAsDefault) {
        address { id } userErrors { field message }
      }
    }`,
    { cid: customerId, address: toMailingAddress(a), setAsDefault }
  );
  const errs = r.customerAddressCreate.userErrors;
  if (errs?.length) throw new Error(`customerAddressCreate: ${JSON.stringify(errs)}`);
}

/** Edit an existing address (optionally make it the default). */
export async function updateAddress(customerId: string, addressId: string, a: AddressInput, setAsDefault = false): Promise<void> {
  const r = await adminGraphql<{ customerAddressUpdate: { userErrors: { message: string }[] } }>(
    `mutation UpdateAddr($cid: ID!, $aid: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
      customerAddressUpdate(customerId: $cid, addressId: $aid, address: $address, setAsDefault: $setAsDefault) {
        address { id } userErrors { field message }
      }
    }`,
    { cid: customerId, aid: addressId, address: toMailingAddress(a), setAsDefault }
  );
  const errs = r.customerAddressUpdate.userErrors;
  if (errs?.length) throw new Error(`customerAddressUpdate: ${JSON.stringify(errs)}`);
}

/** Remove an address from the book. */
export async function deleteAddress(customerId: string, addressId: string): Promise<void> {
  const r = await adminGraphql<{ customerAddressDelete: { deletedAddressId: string | null; userErrors: { message: string }[] } }>(
    `mutation DeleteAddr($cid: ID!, $aid: ID!) {
      customerAddressDelete(customerId: $cid, addressId: $aid) { deletedAddressId userErrors { field message } }
    }`,
    { cid: customerId, aid: addressId }
  );
  const errs = r.customerAddressDelete.userErrors;
  if (errs?.length) throw new Error(`customerAddressDelete: ${JSON.stringify(errs)}`);
}

/** Make an existing address the default. */
export async function setDefault(customerId: string, addressId: string): Promise<void> {
  const r = await adminGraphql<{ customerUpdateDefaultAddress: { userErrors: { message: string }[] } }>(
    `mutation SetDefault($cid: ID!, $aid: ID!) {
      customerUpdateDefaultAddress(customerId: $cid, addressId: $aid) { customer { id } userErrors { field message } }
    }`,
    { cid: customerId, aid: addressId }
  );
  const errs = r.customerUpdateDefaultAddress.userErrors;
  if (errs?.length) throw new Error(`customerUpdateDefaultAddress: ${JSON.stringify(errs)}`);
}

const addrKey = (a: { zip?: string | null; address1?: string | null; address2?: string | null }) =>
  `${(a.zip || '').trim()}|${(a.address1 || '').trim()}|${(a.address2 || '').trim()}`;

/**
 * Called after an order: add the shipping address to the book if it isn't
 * already there. Sets it as default only when the customer has no addresses yet,
 * so we never override a default the customer chose themselves.
 */
export async function saveOrderAddress(customerId: string, a: AddressInput): Promise<void> {
  if (!a.address1) return;
  const cust = await getCustomerById(customerId);
  const existing = cust?.addresses ?? [];
  const dupe = existing.some((e) => addrKey(e) === addrKey(a));
  if (dupe) return;
  await createAddress(customerId, a, existing.length === 0);
}

/** Read a customer + recent orders by GID, shaped like src/lib/account.ts Customer. */
export async function getCustomerById(id: string): Promise<BridgedCustomer | null> {
  const data = await adminGraphql<{ customer: any | null }>(
    `query GetCustomer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        email
        phone
        pointsLedger: metafield(namespace: "kolektt", key: "points_ledger") { value }
        defaultAddress { id firstName lastName phone zip address1 address2 city province country }
        addresses(first: 20) { id firstName lastName phone zip address1 address2 city province country }
        orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
          edges {
            node {
              id
              name
              processedAt
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              currentTotalPriceSet { shopMoney { amount currencyCode } }
              lineItems(first: 5) { edges { node { title quantity } } }
            }
          }
        }
      }
    }`,
    { id }
  );
  const c = data.customer;
  if (!c) return null;
  const defaultId = c.defaultAddress?.id;
  let points = 0;
  try {
    const ledger = c.pointsLedger?.value ? JSON.parse(c.pointsLedger.value) : [];
    if (Array.isArray(ledger)) points = computeBalance(ledger);
  } catch {
    points = 0;
  }
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    defaultAddress: c.defaultAddress ?? null,
    addresses: (c.addresses ?? []).map((n: any) => ({
      id: n.id,
      firstName: n.firstName,
      lastName: n.lastName,
      phone: n.phone,
      zip: n.zip,
      address1: n.address1,
      address2: n.address2,
      city: n.city,
      isDefault: n.id === defaultId,
    })),
    orders: (c.orders?.edges ?? []).map((e: any) => ({
      id: e.node.id,
      orderNumber: Number(String(e.node.name).replace(/[^0-9]/g, '')) || 0,
      processedAt: e.node.processedAt || e.node.createdAt,
      financialStatus: e.node.displayFinancialStatus ?? null,
      fulfillmentStatus: e.node.displayFulfillmentStatus ?? null,
      total: e.node.currentTotalPriceSet?.shopMoney ?? { amount: '0', currencyCode: 'KRW' },
      items: (e.node.lineItems?.edges ?? []).map((li: any) => ({
        title: li.node.title,
        quantity: li.node.quantity,
      })),
    })),
    points,
  };
}
