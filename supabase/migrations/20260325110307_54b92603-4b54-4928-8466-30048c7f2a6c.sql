DELETE FROM order_items WHERE order_id IN ('23c90f07-96c8-429c-94b4-088919f4b917', '3e345b86-fd00-4b89-a6fb-b7b46d88dc0e', 'dc0e8274-65bd-4f2b-8238-a435852d9a38');
DELETE FROM order_documents WHERE order_id IN ('23c90f07-96c8-429c-94b4-088919f4b917', '3e345b86-fd00-4b89-a6fb-b7b46d88dc0e', 'dc0e8274-65bd-4f2b-8238-a435852d9a38');
DELETE FROM orders WHERE client_id IN ('abbd4480-d572-4322-a922-89ffa2082d39', '4e03b105-e5c2-4da7-9680-783cf6aff05d', '491b411d-ae37-4a3a-ad50-ecacad26ec50');
DELETE FROM client_contacts WHERE client_id IN ('abbd4480-d572-4322-a922-89ffa2082d39', '4e03b105-e5c2-4da7-9680-783cf6aff05d', '491b411d-ae37-4a3a-ad50-ecacad26ec50');
DELETE FROM activities WHERE client_id IN ('abbd4480-d572-4322-a922-89ffa2082d39', '4e03b105-e5c2-4da7-9680-783cf6aff05d', '491b411d-ae37-4a3a-ad50-ecacad26ec50');
DELETE FROM clients WHERE id IN ('abbd4480-d572-4322-a922-89ffa2082d39', '4e03b105-e5c2-4da7-9680-783cf6aff05d', '491b411d-ae37-4a3a-ad50-ecacad26ec50');