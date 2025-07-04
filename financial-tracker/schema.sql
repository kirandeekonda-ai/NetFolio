CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    color VARCHAR(7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT INTO categories (name, type, color, is_default) VALUES
('Food & Dining', 'essential', '#FF6347', true),
('Bills & Utilities', 'essential', '#FFD700', true),
('Transportation', 'essential', '#FF4500', true),
('Shopping', 'lifestyle', '#DA70D6', true),
('Entertainment', 'lifestyle', '#8A2BE2', true),
('Health & Wellness', 'lifestyle', '#20B2AA', true),
('Travel', 'lifestyle', '#4682B4', true),
('Income', 'financial', '#32CD32', true),
('Investments', 'financial', '#1E90FF', true),
('Other', 'lifestyle', '#A9A9A9', true),
('Uncategorized', 'other', '#696969', true);
