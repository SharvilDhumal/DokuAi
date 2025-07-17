-- Check current admin user
SELECT id, email, role, is_verified FROM user1 WHERE email = 'admin@dokuai.com';

-- Update admin role if needed
UPDATE user1 
SET role = 'admin', is_verified = true 
WHERE email = 'admin@dokuai.com';

-- Verify the update
SELECT id, email, role, is_verified FROM user1 WHERE email = 'admin@dokuai.com';
