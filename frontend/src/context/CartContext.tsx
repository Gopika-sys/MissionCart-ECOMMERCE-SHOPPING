import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api, unwrap } from '../services/api';
import { CartSummary, Product } from '../types';
import { useAuth } from './AuthContext';

const GUEST_WISHLIST_IDS_KEY = 'mc_guest_wishlist_ids';
const GUEST_WISHLIST_ITEMS_KEY = 'mc_guest_wishlist_items';

function readGuestIds(): number[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function readGuestItems(): Product[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestWishlist(items: Product[]) {
  try {
    localStorage.setItem(GUEST_WISHLIST_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(GUEST_WISHLIST_IDS_KEY, JSON.stringify(items.map((p) => p.id)));
  } catch {
    // ignore storage quota errors
  }
}

function clearGuestWishlist() {
  try {
    localStorage.removeItem(GUEST_WISHLIST_IDS_KEY);
    localStorage.removeItem(GUEST_WISHLIST_ITEMS_KEY);
  } catch {
    // ignore
  }
}

interface CartCtx {
  cart: CartSummary | null;
  wishlist: Product[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, quantity?: number, missionId?: number, variantId?: number, selectedSize?: string, selectedColor?: string) => Promise<void>;
  updateCartItem: (itemId: number, quantity?: number, savedForLater?: boolean, variantId?: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  toggleWishlist: (productId: number, product?: Product) => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [wishlist, setWishlist] = useState<Product[]>(() => readGuestItems());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastSyncedUserId = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3200);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!user) {
      lastSyncedUserId.current = null;
      setCart(null);
      setWishlist(readGuestItems());
      return;
    }
    try {
      const guestIds = readGuestIds();
      let syncedWishlist: Product[] | null = null;
      if (guestIds.length > 0 && lastSyncedUserId.current !== user.id) {
        const syncRes = await api.post('/wishlist/sync', { productIds: guestIds });
        syncedWishlist = unwrap<Product[]>(syncRes);
        clearGuestWishlist();
        showToast('Saved guest wishlist synced to your account');
      }
      lastSyncedUserId.current = user.id;

      const [cRes, wRes] = await Promise.all([
        api.get('/cart'),
        syncedWishlist ? Promise.resolve(null) : api.get('/wishlist'),
      ]);
      setCart(unwrap<CartSummary>(cRes));
      setWishlist(syncedWishlist ?? unwrap<Product[]>(wRes!));
    } catch {
      // ignore unauthenticated
    }
  }, [user, showToast]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (
    productId: number,
    quantity = 1,
    missionId?: number,
    variantId?: number,
    selectedSize?: string,
    selectedColor?: string,
  ) => {
    if (!user) {
      showToast('Please sign in to save items to your shopping bag.');
      return;
    }
    try {
      const res = await api.post('/cart/items', { productId, quantity, missionId, variantId, selectedSize, selectedColor });
      setCart(unwrap<CartSummary>(res));
      setDrawerOpen(true);
      showToast(selectedSize ? `Added (${selectedSize}) to your MissionCart bag` : 'Added to your MissionCart bag');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to add item to bag');
    }
  };

  const updateCartItem = async (itemId: number, quantity?: number, savedForLater?: boolean, variantId?: number) => {
    try {
      const res = await api.patch(`/cart/items/${itemId}`, { quantity, savedForLater, variantId });
      setCart(unwrap<CartSummary>(res));
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to update item');
    }
  };

  const removeCartItem = async (itemId: number) => {
    const res = await api.delete(`/cart/items/${itemId}`);
    setCart(unwrap<CartSummary>(res));
    showToast('Removed from shopping bag');
  };

  const toggleWishlist = async (productId: number, product?: Product) => {
    if (!user) {
      const current = readGuestItems();
      const exists = current.some((p) => p.id === productId);
      if (exists) {
        const next = current.filter((p) => p.id !== productId);
        writeGuestWishlist(next);
        setWishlist(next);
        showToast('Removed from wishlist');
        return;
      }
      let resolved = product;
      if (!resolved) {
        try {
          resolved = unwrap<Product>(await api.get(`/products/${productId}`));
        } catch {
          showToast('Unable to save item to wishlist right now.');
          return;
        }
      }
      const next = [resolved, ...current.filter((p) => p.id !== productId)];
      writeGuestWishlist(next);
      setWishlist(next);
      showToast('Saved to wishlist on this device (sign in to sync)');
      return;
    }

    try {
      const res = await api.post(`/wishlist/${productId}`);
      const updated = unwrap<Product[]>(res);
      setWishlist(updated);
      const added = updated.some((p) => p.id === productId);
      showToast(added ? 'Added to your wishlist' : 'Removed from your wishlist');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Could not update wishlist.');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        drawerOpen,
        setDrawerOpen,
        refreshCart,
        addToCart,
        updateCartItem,
        removeCartItem,
        toggleWishlist,
        toast,
        showToast,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 100,
            background: 'var(--mc-burgundy)',
            color: 'var(--mc-white)',
            padding: '0.8rem 1.25rem',
            borderRadius: 'var(--mc-radius-pill)',
            boxShadow: 'var(--mc-shadow-lift)',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {toast}
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
