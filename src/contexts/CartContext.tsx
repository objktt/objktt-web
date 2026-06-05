import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addItem as apiAddItem,
  getCart as apiGetCart,
  removeLine as apiRemoveLine,
  updateLineQuantity as apiUpdateQty,
  clearStoredCart,
  type Cart,
} from '../lib/cart';
import { isShopifyConfigured } from '../lib/shopify';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<Cart>;
  buyNow: (variantId: string, quantity?: number) => Promise<void>;
  updateQty: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  checkout: () => void;
  reset: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Hydrate cart on mount
  useEffect(() => {
    if (!isShopifyConfigured) return;
    let cancelled = false;
    apiGetCart()
      .then((c) => { if (!cancelled) setCart(c); })
      .catch(() => { if (!cancelled) setCart(null); });
    return () => { cancelled = true; };
  }, []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1, opts?: { openDrawer?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const next = await apiAddItem(variantId, quantity);
        setCart(next);
        if (opts?.openDrawer ?? true) setIsOpen(true);
        return next;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to add item';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const buyNow = useCallback(
    async (variantId: string, quantity = 1) => {
      setLoading(true);
      setError(null);
      try {
        const next = await apiAddItem(variantId, quantity);
        setCart(next);
        setIsOpen(false);
        navigate('/checkout');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to start checkout';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  const updateQty = useCallback(async (lineId: string, quantity: number) => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiUpdateQty(lineId, quantity);
      setCart(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }, []);

  const removeLine = useCallback(async (lineId: string) => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiRemoveLine(lineId);
      setCart(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkout = useCallback(() => {
    if (cart && cart.lines.length > 0) {
      setIsOpen(false);
      navigate('/checkout');
    }
  }, [cart, navigate]);

  const reset = useCallback(() => {
    clearStoredCart();
    setCart(null);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      error,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      addItem,
      buyNow,
      updateQty,
      removeLine,
      checkout,
      reset,
    }),
    [cart, loading, error, isOpen, addItem, buyNow, updateQty, removeLine, checkout, reset]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
