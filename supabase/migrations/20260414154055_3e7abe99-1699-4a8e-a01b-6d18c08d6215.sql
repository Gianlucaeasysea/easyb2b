-- Remove duplicate orders created by race condition, keeping the most recent one
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM order_events WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM order_documents WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM deals WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM client_notifications WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM client_communications WHERE order_id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);

DELETE FROM orders WHERE id IN (
  SELECT id FROM (
    SELECT id, order_code, ROW_NUMBER() OVER (PARTITION BY order_code ORDER BY updated_at DESC) as rn
    FROM orders
    WHERE order_code IS NOT NULL
  ) t WHERE rn > 1
);