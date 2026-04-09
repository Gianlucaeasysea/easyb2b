import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

export interface CartItem {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  b2bPrice: number;
  discountPct: number;
  quantity: number;
  stock: number;
  image: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  showSavedIndicator: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY_PREFIX = "easysea_cart_";
const getCartKey = (userId: string) => `${CART_KEY_PREFIX}${userId}`;

const loadCartFromStorage = (userId: string): CartItem[] => {
  try {
    const raw = localStorage.getItem(getCartKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveCartToStorage = (userId: string, items: CartItem[]) => {
  try {
    localStorage.setItem(getCartKey(userId), JSON.stringify(items));
  } catch {}
};

export const clearCartStorage = (userId?: string) => {
  try {
    if (userId) {
      localStorage.removeItem(getCartKey(userId));
    }
  } catch {}
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const initializedForUser = useRef<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load & validate cart when user changes
  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      initializedForUser.current = null;
      return;
    }

    if (initializedForUser.current === user.id) return;
    initializedForUser.current = user.id;

    const saved = loadCartFromStorage(user.id);
    if (!saved.length) {
      setItems([]);
      return;
    }

    // Validate products against DB
    const validate = async () => {
      const productIds = saved.map(i => i.productId);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, stock_quantity, active_b2b")
        .in("id", productIds);

      if (!products) {
        setItems(saved);
        return;
      }

      const productMap = new Map(products.map(p => [p.id, p]));
      let removedAny = false;
      const validated: CartItem[] = [];

      for (const item of saved) {
        const product = productMap.get(item.productId);
        if (!product || product.active_b2b === false) {
          removedAny = true;
          continue;
        }
        const stock = product.stock_quantity;
        // NULL stock = unlimited availability
        if (stock !== null && stock <= 0) {
          toast.info(`${product.name} is out of stock and was removed from your cart`);
          removedAny = true;
          continue;
        }
        if (item.quantity > stock) {
          toast.info(`Quantità di ${product.name} aggiornata a ${stock} per disponibilità limitata`);
          validated.push({ ...item, quantity: stock, stock });
        } else {
          validated.push({ ...item, stock });
        }
      }

      if (removedAny) {
        toast.warning("Alcuni prodotti non più disponibili sono stati rimossi dal carrello");
      }

      setItems(validated);
      saveCartToStorage(user.id, validated);
    };

    validate();
  }, [user?.id]);

  // Persist to localStorage on every change (after init)
  useEffect(() => {
    if (!user?.id || initializedForUser.current !== user.id) return;

    saveCartToStorage(user.id, items);

    // Show saved indicator briefly
    if (items.length > 0) {
      setShowSavedIndicator(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSavedIndicator(false), 1500);
    }
  }, [items, user?.id]);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity"> & { quantity?: number }) => {
    // Safety net: block items without a valid price from price list
    if (!newItem.b2bPrice || newItem.b2bPrice <= 0) {
      toast.error("Impossibile aggiungere: prezzo non disponibile");
      return;
    }

    setItems(prev => {
      const existing = prev.find(i => i.productId === newItem.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === newItem.productId
            ? { ...i, quantity: Math.min(i.quantity + (newItem.quantity || 1), i.stock) }
            : i
        );
      }
      return [...prev, { ...newItem, quantity: newItem.quantity || 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
    } else {
      setItems(prev => prev.map(i =>
        i.productId === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i
      ));
    }
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user?.id) {
      saveCartToStorage(user.id, []);
    }
  }, [user?.id]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.b2bPrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, totalItems, totalAmount, showSavedIndicator }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

/** Small animated "Carrello salvato" indicator */
export const CartSavedIndicator = () => {
  const { showSavedIndicator } = useCart();
  return (
    <AnimatePresence>
      {showSavedIndicator && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-[10px] text-muted-foreground"
        >
          Carrello salvato
        </motion.span>
      )}
    </AnimatePresence>
  );
};
