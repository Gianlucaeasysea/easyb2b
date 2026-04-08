
-- Normalize legacy payment_status values
UPDATE orders SET payment_status = 'paid' WHERE payment_status = 'Payed';
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status = 'To be paid';
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;

-- Normalize legacy order status values
UPDATE orders SET status = 'processing' WHERE status = 'To be prepared';
UPDATE orders SET status = 'ready_to_ship' WHERE status = 'Ready';
UPDATE orders SET status = 'shipped' WHERE status = 'On the road';
UPDATE orders SET status = 'delivered' WHERE status = 'Delivered';
UPDATE orders SET status = 'cancelled' WHERE status = 'lost';
UPDATE orders SET status = 'delivered' WHERE status = 'Returned';
UPDATE orders SET status = 'confirmed' WHERE status = 'Payed';
