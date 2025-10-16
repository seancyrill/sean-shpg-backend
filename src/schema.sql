-- =====================================================
-- 1. SHOPS (core table for shop-related dependencies)
-- =====================================================
CREATE TABLE shops (
    shop_id SERIAL PRIMARY KEY,
    shop_name VARCHAR(100) UNIQUE NOT NULL,
    shop_email VARCHAR(100) NOT NULL
);

-- =====================================================
-- 2. SHOP IMAGES (depends on shops)
-- =====================================================
CREATE TABLE shop_imgs (
    img_id SERIAL PRIMARY KEY,
    shop_id INT REFERENCES shops(shop_id) ON DELETE CASCADE,
    img_url TEXT NOT NULL
);

-- Add the back-reference column now that shop_imgs exists
ALTER TABLE shops
ADD COLUMN shop_default_img_id INT REFERENCES shop_imgs(img_id) ON DELETE SET NULL;

-- =====================================================
-- 3. USERS (does NOT depend on user_imgs yet)
-- =====================================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    shop_id INT REFERENCES shops(shop_id) ON DELETE SET NULL,
    user_cart JSONB DEFAULT '[]'
);

-- =====================================================
-- 4. USER IMAGES (depends on users)
-- =====================================================
CREATE TABLE user_imgs (
    img_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    img_url TEXT NOT NULL,
    thumbnail_url TEXT
);

-- Add the user_default_img_id reference to users now
ALTER TABLE users
ADD COLUMN user_default_img_id INT REFERENCES user_imgs(img_id) ON DELETE SET NULL;

-- =====================================================
-- 5. ITEMS (depends on shops)
-- =====================================================
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    shop_id INT REFERENCES shops(shop_id) ON DELETE CASCADE,
    item_name VARCHAR(100) NOT NULL,
    item_desc TEXT,
    item_price NUMERIC(10,2) NOT NULL
);

-- =====================================================
-- 6. ITEM IMAGES (depends on items)
-- =====================================================
CREATE TABLE item_imgs (
    img_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    img_url TEXT NOT NULL,
    thumbnail_url TEXT
);

-- Add default image ref to items
ALTER TABLE items
ADD COLUMN item_default_img_id INT REFERENCES item_imgs(img_id) ON DELETE SET NULL;

-- =====================================================
-- 7. PROMO ITEMS (depends on items)
-- =====================================================
CREATE TABLE promo_items (
    promo_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    discount NUMERIC(5,2) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    promo_group_id INT
);

-- =====================================================
-- 8. ORDERS (depends on users + shops)
-- =====================================================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    shop_id INT REFERENCES shops(shop_id) ON DELETE CASCADE,
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. RATINGS (depends on users + items)
-- =====================================================
CREATE TABLE ratings (
    rating_id SERIAL PRIMARY KEY,
    rating_score INT NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
    rating_summary TEXT,
    rating_comment TEXT,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE
);

-- =====================================================
-- 10. ADDRESSES (depends on users)
-- =====================================================
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    address_line TEXT NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    zip_code VARCHAR(20)
);
