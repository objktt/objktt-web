/**
 * Shopify Storefront Cart API.
 *
 * Flow:
 *   1. addItem(variantId, qty) — creates a Cart if none exists, otherwise appends a line.
 *   2. The cart is persisted by its ID in localStorage.
 *   3. cart.checkoutUrl is a Shopify-hosted URL — redirect the user there to complete payment.
 *
 * Cart line item quantities for the same variant are merged by Shopify automatically.
 */

import { shopifyFetch } from './shopify';

const CART_ID_KEY = 'objktt-cart-id';

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    image: { url: string; altText: string | null } | null;
    price: { amount: string; currencyCode: string };
    product: {
      id: string;
      handle: string;
      title: string;
      featuredImage: { url: string; altText: string | null } | null;
    };
  };
  cost: {
    totalAmount: { amount: string; currencyCode: string };
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: CartLine[];
  cost: {
    subtotalAmount: { amount: string; currencyCode: string };
    totalAmount: { amount: string; currencyCode: string };
  };
}

const CART_FIELDS = /* GraphQL */ `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            image { url altText }
            price { amount currencyCode }
            product {
              id
              handle
              title
              featuredImage { url altText }
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message }
    }
  }
`;

const CART_QUERY = /* GraphQL */ `
  query Cart($id: ID!) {
    cart(id: $id) { ${CART_FIELDS} }
  }
`;

interface RawCartLineEdge {
  node: Omit<CartLine, 'merchandise'> & {
    merchandise: CartLine['merchandise'];
  };
}
interface RawCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: Cart['cost'];
  lines: { edges: RawCartLineEdge[] };
}

function reshape(raw: RawCart | null | undefined): Cart | null {
  if (!raw) return null;
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    cost: raw.cost,
    lines: raw.lines.edges.map((e) => e.node),
  };
}

function getStoredCartId(): string | null {
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

function setStoredCartId(id: string | null) {
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id);
    else localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* ignore quota / privacy errors */
  }
}

interface CartMutationResponse {
  cart: RawCart | null;
  userErrors: { field?: string[]; message: string }[];
}

function assertNoUserErrors(resp: CartMutationResponse, op: string) {
  if (resp.userErrors && resp.userErrors.length > 0) {
    const msg = resp.userErrors.map((e) => e.message).join('; ');
    throw new Error(`${op} failed: ${msg}`);
  }
}

export async function getCart(): Promise<Cart | null> {
  const id = getStoredCartId();
  if (!id) return null;
  try {
    const data = await shopifyFetch<{ cart: RawCart | null }>(CART_QUERY, { id });
    if (!data.cart) {
      setStoredCartId(null);
      return null;
    }
    return reshape(data.cart);
  } catch {
    setStoredCartId(null);
    return null;
  }
}

async function createCart(variantId: string, quantity: number): Promise<Cart> {
  const data = await shopifyFetch<{ cartCreate: CartMutationResponse }>(CART_CREATE, {
    lines: [{ merchandiseId: variantId, quantity }],
  });
  assertNoUserErrors(data.cartCreate, 'cartCreate');
  const cart = reshape(data.cartCreate.cart);
  if (!cart) throw new Error('cartCreate returned no cart');
  setStoredCartId(cart.id);
  return cart;
}

export async function addItem(variantId: string, quantity: number = 1): Promise<Cart> {
  const existing = await getCart();
  if (!existing) return createCart(variantId, quantity);

  const data = await shopifyFetch<{ cartLinesAdd: CartMutationResponse }>(CART_LINES_ADD, {
    cartId: existing.id,
    lines: [{ merchandiseId: variantId, quantity }],
  });
  assertNoUserErrors(data.cartLinesAdd, 'cartLinesAdd');
  const cart = reshape(data.cartLinesAdd.cart);
  if (!cart) throw new Error('cartLinesAdd returned no cart');
  return cart;
}

export async function updateLineQuantity(lineId: string, quantity: number): Promise<Cart> {
  const id = getStoredCartId();
  if (!id) throw new Error('No cart to update');
  const data = await shopifyFetch<{ cartLinesUpdate: CartMutationResponse }>(CART_LINES_UPDATE, {
    cartId: id,
    lines: [{ id: lineId, quantity }],
  });
  assertNoUserErrors(data.cartLinesUpdate, 'cartLinesUpdate');
  const cart = reshape(data.cartLinesUpdate.cart);
  if (!cart) throw new Error('cartLinesUpdate returned no cart');
  return cart;
}

export async function removeLine(lineId: string): Promise<Cart> {
  const id = getStoredCartId();
  if (!id) throw new Error('No cart to update');
  const data = await shopifyFetch<{ cartLinesRemove: CartMutationResponse }>(CART_LINES_REMOVE, {
    cartId: id,
    lineIds: [lineId],
  });
  assertNoUserErrors(data.cartLinesRemove, 'cartLinesRemove');
  const cart = reshape(data.cartLinesRemove.cart);
  if (!cart) throw new Error('cartLinesRemove returned no cart');
  return cart;
}

export function clearStoredCart() {
  setStoredCartId(null);
}
