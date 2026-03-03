-- Tabela de administradores do sistema
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de lojas (lojistas)
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  store_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES admins(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de veiculos
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('carro', 'moto')),
  plate VARCHAR(10) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  version VARCHAR(100),
  manufacture_year INTEGER NOT NULL,
  model_year INTEGER NOT NULL,
  purchase_value DECIMAL(12,2) NOT NULL,
  sale_value DECIMAL(12,2),
  renavam VARCHAR(20) NOT NULL,
  chassis VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'em_estoque' CHECK (status IN ('em_estoque', 'vendido')),
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de gastos por veiculo
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  description VARCHAR(255) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_vehicles_store_id ON vehicles(store_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_store_id ON vehicle_expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_cpf ON stores(cpf);
