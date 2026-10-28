-- ============================================================
-- El Perfumista Rubio — Supabase schema + seed data
-- ============================================================
-- Ejecutar este SQL en el SQL Editor de Supabase (o via MCP)
-- Genera todas las tablas, enums, indices y datos de prueba.
-- ============================================================

-- ============================== TABLAS ==============================

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'vendedor'
    CHECK (role IN ('admin', 'vendedor')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios (email);

-- Familias olfativas
CREATE TABLE IF NOT EXISTS familias_olfativas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_familias_slug ON familias_olfativas (slug);

-- Notas olfativas
CREATE TABLE IF NOT EXISTS notas_olfativas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notas_slug ON notas_olfativas (slug);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  brand VARCHAR(120),
  product_type VARCHAR(32) NOT NULL
    CHECK (product_type IN ('contratipo', 'esencia', 'perfume_arabe', 'body_splash', 'cuidado_personal')),
  family_id BIGINT REFERENCES familias_olfativas(id) ON DELETE SET NULL,
  concentration VARCHAR(80),
  gender VARCHAR(30),
  short_description VARCHAR(280),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_productos_sku ON productos (sku);
CREATE INDEX IF NOT EXISTS ix_productos_name ON productos (name);
CREATE INDEX IF NOT EXISTS ix_productos_slug ON productos (slug);
CREATE INDEX IF NOT EXISTS ix_productos_active ON productos (active);
CREATE INDEX IF NOT EXISTS ix_productos_featured ON productos (featured);

-- Relación producto ↔ nota
CREATE TABLE IF NOT EXISTS producto_notas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  note_id BIGINT NOT NULL REFERENCES notas_olfativas(id) ON DELETE CASCADE,
  note_type VARCHAR(20) NOT NULL
    CHECK (note_type IN ('salida', 'corazon', 'fondo')),
  UNIQUE (product_id, note_id, note_type)
);
CREATE INDEX IF NOT EXISTS ix_producto_notas_product ON producto_notas (product_id);
CREATE INDEX IF NOT EXISTS ix_producto_notas_note ON producto_notas (note_id);

-- Presentaciones
CREATE TABLE IF NOT EXISTS presentaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  volume_ml INTEGER NOT NULL,
  bottle_type VARCHAR(120),
  price_cop INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_presentaciones_product ON presentaciones (product_id);

-- Imágenes de producto
CREATE TABLE IF NOT EXISTS producto_imagenes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  path VARCHAR(300) NOT NULL,
  alt VARCHAR(200),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_producto_imagenes_product ON producto_imagenes (product_id);

-- Insumos
CREATE TABLE IF NOT EXISTS insumos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(32) NOT NULL
    CHECK (category IN ('esencia', 'fijador', 'alcohol', 'frasco', 'accesorio', 'otro')),
  unit VARCHAR(20) NOT NULL
    CHECK (unit IN ('ml', 'unidad', 'gr')),
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit_cost_cop INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_insumos_sku ON insumos (sku);
CREATE INDEX IF NOT EXISTS ix_insumos_name ON insumos (name);
CREATE INDEX IF NOT EXISTS ix_insumos_active ON insumos (active);

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL
    CHECK (item_type IN ('presentacion', 'insumo')),
  presentation_id BIGINT REFERENCES presentaciones(id) ON DELETE SET NULL,
  supply_id BIGINT REFERENCES insumos(id) ON DELETE SET NULL,
  movement_type VARCHAR(20) NOT NULL
    CHECK (movement_type IN ('entrada', 'salida', 'ajuste')),
  quantity INTEGER NOT NULL,
  resulting_stock INTEGER NOT NULL,
  reason VARCHAR(255),
  user_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_movimientos_item_type ON movimientos_inventario (item_type);
CREATE INDEX IF NOT EXISTS ix_movimientos_presentation ON movimientos_inventario (presentation_id);
CREATE INDEX IF NOT EXISTS ix_movimientos_supply ON movimientos_inventario (supply_id);
CREATE INDEX IF NOT EXISTS ix_movimientos_created ON movimientos_inventario (created_at);

-- Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================== SEED DATA ==============================

-- ---- Usuarios ----
-- Contraseña: Perfumista2026! (bcrypt hash)
INSERT INTO usuarios (name, email, password_hash, role) VALUES
  ('Administrador', 'admin@elperfumistarubio.com', '$2b$12$LJ3m9X6tV2nFzHq4QGdBWOvEcKpC7Fa8mXz1sMkRxHwPd5WqSjZ/y', 'admin'),
  ('Vendedor', 'vendedor@elperfumistarubio.com', '$2b$12$LJ3m9X6tV2nFzHq4QGdBWOvEcKpC7Fa8mXz1sMkRxHwPd5WqSjZ/y', 'vendedor')
ON CONFLICT (email) DO NOTHING;

-- ---- Configuración ----
INSERT INTO configuracion (key, value) VALUES
  ('business_name', 'El Perfumista Rubio'),
  ('whatsapp_primary', '+584126402721'),
  ('whatsapp_secondary', '+584126402175'),
  ('hours', '9:00 a.m. – 6:00 p.m.'),
  ('instagram_url', 'https://www.instagram.com/elperfumistarubio.2023'),
  ('location_1', 'Calle 1, El Poblado'),
  ('location_2', 'Centro – San Martín'),
  ('hero_title', 'Fragancias que dejan huella'),
  ('hero_subtitle', 'Perfumes, esencias y cuidado personal seleccionados para cada estilo. Consulta disponibilidad y recibe asesoría personalizada.'),
  ('about_text', 'En El Perfumista Rubio creamos y seleccionamos fragancias para acompañarte en cada momento. Trabajamos con esencias de calidad, frasquería fina y una atención cercana para ayudarte a encontrar tu aroma ideal.')
ON CONFLICT (key) DO NOTHING;

-- ---- Familias olfativas ----
INSERT INTO familias_olfativas (name, slug, description, sort_order) VALUES
  ('Ámbar floral',     'ambar-floral',     'Cálida, resinosa y envolvente.',           0),
  ('Aromática',        'aromatica',        'Hierbas, lavanda y especias frescas.',      1),
  ('Gourmand',         'gourmand',         'Vainilla, praliné y notas dulces.',         2),
  ('Amaderada',        'amaderada',        'Cedro, sándalo y vetiver.',                 3),
  ('Floral',           'floral',           'Ramos, pétalos y notas femeninas.',         4),
  ('Acuática',         'acuatica',         'Fresca, marina y luminosa.',                5),
  ('Cítrica',          'citrica',          'Fresca, chispeante y energizante.',         6),
  ('Frutal',           'frutal',           'Dulce, jugosa y juvenil.',                  7)
ON CONFLICT (name) DO NOTHING;

-- ---- Notas olfativas ----
INSERT INTO notas_olfativas (name, slug) VALUES
  ('Azafrán',          'azafran'),
  ('Jazmín',           'jazmin'),
  ('Ámbar gris',       'ambar-gris'),
  ('Resina de abeto',  'resina-de-abeto'),
  ('Cedro',            'cedro'),
  ('Almizcle',         'almizcle'),
  ('Bergamota',        'bergamota'),
  ('Pimienta',         'pimienta'),
  ('Lavanda',          'lavanda'),
  ('Ambroxan',         'ambroxan'),
  ('Vetiver',          'vetiver'),
  ('Iris',             'iris'),
  ('Praliné',          'praline'),
  ('Vainilla',         'vainilla'),
  ('Pachulí',          'pachuli'),
  ('Haba tonka',       'haba-tonka'),
  ('Almendra',         'almendra'),
  ('Café',             'cafe'),
  ('Nardo',            'nardo'),
  ('Cacao',            'cacao'),
  ('Menta',            'menta'),
  ('Mandarina',        'mandarina'),
  ('Canela',           'canela'),
  ('Rosa damascena',   'rosa-damascena'),
  ('Cuero',            'cuero'),
  ('Dátil',            'datil'),
  ('Benjuí',           'benjui'),
  ('Orquídea',         'orquidea'),
  ('Heliotropo',       'heliotropo'),
  ('Frutas rojas',     'frutas-rojas'),
  ('Musgo',            'musgo'),
  ('Piña',             'pina'),
  ('Bayas negras',     'bayas-negras'),
  ('Geranio',          'geranio'),
  ('Peonía',           'peonia'),
  ('Magnolia',         'magnolia'),
  ('Sándalo',          'sandalo'),
  ('Azahar',           'azahar'),
  ('Romero',           'romero'),
  ('Salvia',           'salvia'),
  ('Cereza',           'cereza'),
  ('Té verde',         'te-verde'),
  ('Oud',              'oud'),
  ('Notas marinas',    'notas-marinas'),
  ('Pomelo',           'pomelo'),
  ('Laurel',           'laurel'),
  ('Madera de guayaco','madera-de-guayaco')
ON CONFLICT (name) DO NOTHING;


-- ---- Productos ----
-- Usamos un DO block para poder referenciar IDs de familias y notas
DO $$
DECLARE
  -- Family IDs
  fam_ambar_floral BIGINT;
  fam_aromatica    BIGINT;
  fam_gourmand     BIGINT;
  fam_amaderada    BIGINT;
  fam_floral       BIGINT;
  fam_acuatica     BIGINT;
  fam_citrica      BIGINT;
  fam_frutal       BIGINT;

  -- Note IDs (solo las que se usan)
  n_azafran       BIGINT; n_jazmin        BIGINT; n_ambar_gris    BIGINT;
  n_resina_abeto  BIGINT; n_cedro         BIGINT; n_almizcle      BIGINT;
  n_bergamota     BIGINT; n_pimienta      BIGINT; n_lavanda       BIGINT;
  n_ambroxan      BIGINT; n_vetiver       BIGINT; n_iris          BIGINT;
  n_praline       BIGINT; n_vainilla      BIGINT; n_pachuli       BIGINT;
  n_haba_tonka    BIGINT; n_almendra      BIGINT; n_cafe          BIGINT;
  n_nardo         BIGINT; n_cacao         BIGINT; n_menta         BIGINT;
  n_mandarina     BIGINT; n_canela        BIGINT; n_rosa          BIGINT;
  n_cuero         BIGINT; n_datil         BIGINT; n_benjui        BIGINT;
  n_orquidea      BIGINT; n_heliotropo    BIGINT; n_frutas_rojas  BIGINT;
  n_musgo         BIGINT; n_pina          BIGINT; n_bayas_negras  BIGINT;
  n_geranio       BIGINT; n_peonia        BIGINT; n_magnolia      BIGINT;
  n_sandalo       BIGINT; n_azahar        BIGINT; n_romero        BIGINT;
  n_salvia        BIGINT; n_cereza        BIGINT; n_te_verde      BIGINT;
  n_oud           BIGINT; n_notas_marinas BIGINT; n_pomelo        BIGINT;
  n_laurel        BIGINT; n_madera_guayaco BIGINT;

  -- Admin user ID
  admin_id BIGINT;

  -- Temp vars for product/presentation IDs
  prod_id BIGINT;
  pres_id BIGINT;
BEGIN
  -- Resolve families
  SELECT id INTO fam_ambar_floral FROM familias_olfativas WHERE slug = 'ambar-floral';
  SELECT id INTO fam_aromatica    FROM familias_olfativas WHERE slug = 'aromatica';
  SELECT id INTO fam_gourmand     FROM familias_olfativas WHERE slug = 'gourmand';
  SELECT id INTO fam_amaderada    FROM familias_olfativas WHERE slug = 'amaderada';
  SELECT id INTO fam_floral       FROM familias_olfativas WHERE slug = 'floral';
  SELECT id INTO fam_acuatica     FROM familias_olfativas WHERE slug = 'acuatica';
  SELECT id INTO fam_citrica      FROM familias_olfativas WHERE slug = 'citrica';
  SELECT id INTO fam_frutal       FROM familias_olfativas WHERE slug = 'frutal';

  -- Resolve notes
  SELECT id INTO n_azafran       FROM notas_olfativas WHERE slug = 'azafran';
  SELECT id INTO n_jazmin        FROM notas_olfativas WHERE slug = 'jazmin';
  SELECT id INTO n_ambar_gris    FROM notas_olfativas WHERE slug = 'ambar-gris';
  SELECT id INTO n_resina_abeto  FROM notas_olfativas WHERE slug = 'resina-de-abeto';
  SELECT id INTO n_cedro         FROM notas_olfativas WHERE slug = 'cedro';
  SELECT id INTO n_almizcle      FROM notas_olfativas WHERE slug = 'almizcle';
  SELECT id INTO n_bergamota     FROM notas_olfativas WHERE slug = 'bergamota';
  SELECT id INTO n_pimienta      FROM notas_olfativas WHERE slug = 'pimienta';
  SELECT id INTO n_lavanda       FROM notas_olfativas WHERE slug = 'lavanda';
  SELECT id INTO n_ambroxan      FROM notas_olfativas WHERE slug = 'ambroxan';
  SELECT id INTO n_vetiver       FROM notas_olfativas WHERE slug = 'vetiver';
  SELECT id INTO n_iris          FROM notas_olfativas WHERE slug = 'iris';
  SELECT id INTO n_praline       FROM notas_olfativas WHERE slug = 'praline';
  SELECT id INTO n_vainilla      FROM notas_olfativas WHERE slug = 'vainilla';
  SELECT id INTO n_pachuli       FROM notas_olfativas WHERE slug = 'pachuli';
  SELECT id INTO n_haba_tonka    FROM notas_olfativas WHERE slug = 'haba-tonka';
  SELECT id INTO n_almendra      FROM notas_olfativas WHERE slug = 'almendra';
  SELECT id INTO n_cafe          FROM notas_olfativas WHERE slug = 'cafe';
  SELECT id INTO n_nardo         FROM notas_olfativas WHERE slug = 'nardo';
  SELECT id INTO n_cacao         FROM notas_olfativas WHERE slug = 'cacao';
  SELECT id INTO n_menta         FROM notas_olfativas WHERE slug = 'menta';
  SELECT id INTO n_mandarina     FROM notas_olfativas WHERE slug = 'mandarina';
  SELECT id INTO n_canela        FROM notas_olfativas WHERE slug = 'canela';
  SELECT id INTO n_rosa          FROM notas_olfativas WHERE slug = 'rosa-damascena';
  SELECT id INTO n_cuero         FROM notas_olfativas WHERE slug = 'cuero';
  SELECT id INTO n_datil         FROM notas_olfativas WHERE slug = 'datil';
  SELECT id INTO n_benjui        FROM notas_olfativas WHERE slug = 'benjui';
  SELECT id INTO n_orquidea      FROM notas_olfativas WHERE slug = 'orquidea';
  SELECT id INTO n_heliotropo    FROM notas_olfativas WHERE slug = 'heliotropo';
  SELECT id INTO n_frutas_rojas  FROM notas_olfativas WHERE slug = 'frutas-rojas';
  SELECT id INTO n_musgo         FROM notas_olfativas WHERE slug = 'musgo';
  SELECT id INTO n_pina          FROM notas_olfativas WHERE slug = 'pina';
  SELECT id INTO n_bayas_negras  FROM notas_olfativas WHERE slug = 'bayas-negras';
  SELECT id INTO n_geranio       FROM notas_olfativas WHERE slug = 'geranio';
  SELECT id INTO n_peonia        FROM notas_olfativas WHERE slug = 'peonia';
  SELECT id INTO n_magnolia      FROM notas_olfativas WHERE slug = 'magnolia';
  SELECT id INTO n_sandalo       FROM notas_olfativas WHERE slug = 'sandalo';
  SELECT id INTO n_azahar        FROM notas_olfativas WHERE slug = 'azahar';
  SELECT id INTO n_romero        FROM notas_olfativas WHERE slug = 'romero';
  SELECT id INTO n_salvia        FROM notas_olfativas WHERE slug = 'salvia';
  SELECT id INTO n_cereza        FROM notas_olfativas WHERE slug = 'cereza';
  SELECT id INTO n_te_verde      FROM notas_olfativas WHERE slug = 'te-verde';
  SELECT id INTO n_oud           FROM notas_olfativas WHERE slug = 'oud';
  SELECT id INTO n_notas_marinas FROM notas_olfativas WHERE slug = 'notas-marinas';
  SELECT id INTO n_pomelo        FROM notas_olfativas WHERE slug = 'pomelo';
  SELECT id INTO n_laurel        FROM notas_olfativas WHERE slug = 'laurel';
  SELECT id INTO n_madera_guayaco FROM notas_olfativas WHERE slug = 'madera-de-guayaco';

  -- Admin
  SELECT id INTO admin_id FROM usuarios WHERE role = 'admin' LIMIT 1;

  -- ===== PRODUCTO 1: Baccarat Rouge 540 =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0001', 'Baccarat Rouge 540', 'baccarat-rouge-540', 'El Perfumista Rubio', 'contratipo', fam_ambar_floral, 'Extrait de parfum', 'unisex',
    'Azafrán, ámbar gris y cedro en una estela luminosa.',
    'Una interpretación intensa y elegante del clásico Baccarat Rouge 540. Abre con azafrán y jazmín, evoluciona hacia un corazón de ámbar gris y resina de abeto, y cierra con cedro y almizcle. Ideal para ocasiones especiales.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_azafran, 'salida'), (prod_id, n_jazmin, 'salida'),
    (prod_id, n_ambar_gris, 'corazon'), (prod_id, n_resina_abeto, 'corazon'),
    (prod_id, n_cedro, 'fondo'), (prod_id, n_almizcle, 'fondo');
  -- 30ml (stock 16 after exit of 2)
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 45000, 16, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 18, 18, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'salida', 2, 16, 'Venta en mostrador', admin_id);
  -- 50ml
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 65000, 12, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 12, 12, 'Stock inicial', admin_id);
  -- 100ml
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 95000, 6, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 6, 6, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/baccarat-rouge-540.webp', 'Baccarat Rouge 540', 0);

  -- ===== PRODUCTO 2: Sauvage =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0002', 'Sauvage', 'sauvage', 'El Perfumista Rubio', 'contratipo', fam_aromatica, 'Eau de parfum', 'masculino',
    'Bergamota, lavanda y ambroxan con un fondo de cedro.',
    'Frescura aromática con carácter. La bergamota y la pimienta dan paso a lavanda y ambroxan, sobre una base de cedro y vetiver. Una fragancia versátil para el día a día.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_bergamota, 'salida'), (prod_id, n_pimienta, 'salida'),
    (prod_id, n_lavanda, 'corazon'), (prod_id, n_ambroxan, 'corazon'),
    (prod_id, n_cedro, 'fondo'), (prod_id, n_vetiver, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 38000, 25, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 25, 25, 'Stock inicial', admin_id);
  -- 50ml (stock 12 after exit of 3)
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 55000, 12, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 15, 15, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'salida', 3, 12, 'Venta en mostrador', admin_id);
  -- 100ml (agotado)
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 78000, 0, 3) RETURNING id INTO pres_id;
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/sauvage.webp', 'Sauvage', 0);

  -- ===== PRODUCTO 3: La Vie Est Belle =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0003', 'La Vie Est Belle', 'la-vie-est-belle', 'El Perfumista Rubio', 'contratipo', fam_gourmand, 'Eau de parfum', 'femenino',
    'Iris, praliné y vainilla para una estela dulce y sofisticada.',
    'Un gourmand floral reconocible y femenino. El iris y el praliné se encuentran con la vainilla y el pachulí, mientras el haba tonka y el almizcle redondean la composición.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_iris, 'salida'), (prod_id, n_praline, 'salida'),
    (prod_id, n_vainilla, 'corazon'), (prod_id, n_pachuli, 'corazon'),
    (prod_id, n_haba_tonka, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 40000, 10, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 10, 10, 'Stock inicial', admin_id);
  -- 50ml (stock 6 after exit of 2)
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 58000, 6, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 8, 8, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'salida', 2, 6, 'Venta en mostrador', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 82000, 3, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 3, 3, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/la-vie-est-belle.webp', 'La Vie Est Belle', 0);

  -- ===== PRODUCTO 4: Good Girl =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0004', 'Good Girl', 'good-girl', 'El Perfumista Rubio', 'contratipo', fam_ambar_floral, 'Eau de parfum', 'femenino',
    'Almendra, café y nardo con un fondo cálido de cacao.',
    'Contraste entre lo dulce y lo amaderado. La almendra y el café abren con intensidad, el nardo y el jazmín aportan luminosidad, y el cacao cierra con una calidez envolvente.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_almendra, 'salida'), (prod_id, n_cafe, 'salida'),
    (prod_id, n_nardo, 'corazon'), (prod_id, n_jazmin, 'corazon'),
    (prod_id, n_haba_tonka, 'fondo'), (prod_id, n_cacao, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 42000, 14, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 14, 14, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 62000, 7, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 7, 7, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/good-girl.webp', 'Good Girl', 0);

  -- ===== PRODUCTO 5: One Million =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0005', 'One Million', 'one-million', 'El Perfumista Rubio', 'contratipo', fam_amaderada, 'Eau de toilette', 'masculino',
    'Menta, canela y cuero en una firma masculina inconfundible.',
    'Una fragancia especiada y segura. La menta y la mandarina refrescan la salida, la canela y la rosa aportan carácter, y el cuero con el ámbar gris construyen un fondo duradero.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_menta, 'salida'), (prod_id, n_mandarina, 'salida'),
    (prod_id, n_canela, 'corazon'), (prod_id, n_rosa, 'corazon'),
    (prod_id, n_cuero, 'fondo'), (prod_id, n_ambar_gris, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 36000, 20, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 20, 20, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 52000, 10, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 10, 10, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 74000, 4, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 4, 4, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/one-million.webp', 'One Million', 0);

  -- ===== PRODUCTO 6: Khamrah =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0006', 'Khamrah', 'khamrah', 'El Perfumista Rubio', 'contratipo', fam_gourmand, 'Eau de parfum', 'unisex',
    'Dátil, canela y vainilla con un toque de praliné.',
    'Inspirado en la perfumería árabe contemporánea. El dátil y la canela abren un recorrido cálido que se vuelve cremoso con el praliné y el nardo, y termina en vainilla y benjuí.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_canela, 'salida'), (prod_id, n_datil, 'salida'),
    (prod_id, n_praline, 'corazon'), (prod_id, n_nardo, 'corazon'),
    (prod_id, n_vainilla, 'fondo'), (prod_id, n_benjui, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 68000, 9, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 9, 9, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 98000, 2, 2) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 2, 2, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/khamrah.webp', 'Khamrah', 0);

  -- ===== PRODUCTO 7: Yara =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0007', 'Yara', 'yara', 'El Perfumista Rubio', 'contratipo', fam_gourmand, 'Eau de parfum', 'femenino',
    'Orquídea, vainilla y frutas rojas en una estela dulce.',
    'Dulce, cremoso y juvenil. La orquídea y el heliotropo se mezclan con vainilla y frutas rojas, sobre un fondo de musgo y almizcle que aporta suavidad.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_orquidea, 'salida'), (prod_id, n_heliotropo, 'salida'),
    (prod_id, n_vainilla, 'corazon'), (prod_id, n_frutas_rojas, 'corazon'),
    (prod_id, n_musgo, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Vidrio con válvula', 39000, 16, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 16, 16, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 56000, 9, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 9, 9, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 79000, 5, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 5, 5, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/yara.webp', 'Yara', 0);

  -- ===== PRODUCTO 8: Asad =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0008', 'Asad', 'asad', 'El Perfumista Rubio', 'contratipo', fam_amaderada, 'Eau de parfum', 'masculino',
    'Piña, bayas negras y cedro con un fondo de vainilla y ámbar.',
    'Una fragancia frutal y amaderada con mucha presencia. La piña y las bayas negras abren con energía, el cedro y el pachulí dan estructura, y la vainilla con el ámbar gris suavizan el conjunto.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_pina, 'salida'), (prod_id, n_bayas_negras, 'salida'),
    (prod_id, n_cedro, 'corazon'), (prod_id, n_pachuli, 'corazon'),
    (prod_id, n_vainilla, 'fondo'), (prod_id, n_ambar_gris, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 60000, 11, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 11, 11, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 88000, 4, 2) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 4, 4, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/asad.webp', 'Asad', 0);

  -- ===== PRODUCTO 9: Rosa Damascena =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0009', 'Rosa Damascena', 'rosa-damascena', 'El Perfumista Rubio', 'esencia', fam_floral, 'Esencia concentrada', 'femenino',
    'Rosa damascena, geranio y un fondo de musgo y almizcle.',
    'Esencia floral clásica para crear tu propia fragancia o disfrutarla sola. La rosa damascena y el geranio se acompañan de peonía y magnolia, con un fondo de musgo y almizcle.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_rosa, 'salida'), (prod_id, n_geranio, 'salida'),
    (prod_id, n_peonia, 'corazon'), (prod_id, n_magnolia, 'corazon'),
    (prod_id, n_musgo, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 10, 'Frasco ámbar', 18000, 30, 8) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 30, 30, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Frasco ámbar', 32000, 22, 6) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 22, 22, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Frasco ámbar', 48000, 12, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 12, 12, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/rosa-damascena.webp', 'Rosa Damascena', 0);

  -- ===== PRODUCTO 10: Vainilla Premium =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0010', 'Vainilla Premium', 'vainilla-premium', 'El Perfumista Rubio', 'esencia', fam_gourmand, 'Esencia concentrada', 'unisex',
    'Vainilla, benjuí y haba tonka para un fondo cálido y dulce.',
    'Una esencia golosa y versátil. La vainilla y el benjuí se combinan con haba tonka y praliné, sobre un fondo de almizcle y sándalo. Perfecta para combinar con notas florales o amaderadas.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_vainilla, 'salida'), (prod_id, n_benjui, 'salida'),
    (prod_id, n_haba_tonka, 'corazon'), (prod_id, n_praline, 'corazon'),
    (prod_id, n_almizcle, 'fondo'), (prod_id, n_sandalo, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 10, 'Frasco ámbar', 16000, 40, 10) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 40, 40, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Frasco ámbar', 30000, 28, 8) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 28, 28, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Frasco ámbar', 45000, 14, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 14, 14, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/vainilla-premium.webp', 'Vainilla Premium', 0);

  -- ===== PRODUCTO 11: Jazmín Nocturno =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0011', 'Jazmín Nocturno', 'jazmin-nocturno', 'El Perfumista Rubio', 'esencia', fam_floral, 'Esencia concentrada', 'femenino',
    'Jazmín, azahar y magnolia con un fondo de musgo.',
    'La elegancia del jazmín en una esencia luminosa y envolvente. El nardo y el azahar realzan su carácter floral, mientras el musgo y el almizcle aportan permanencia.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_jazmin, 'salida'), (prod_id, n_nardo, 'salida'),
    (prod_id, n_azahar, 'corazon'), (prod_id, n_magnolia, 'corazon'),
    (prod_id, n_musgo, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 10, 'Frasco ámbar', 17000, 26, 8) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 26, 26, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Frasco ámbar', 31000, 15, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 15, 15, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/jazmin-nocturno.webp', 'Jazmín Nocturno', 0);

  -- ===== PRODUCTO 12: Lavanda Francesa =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0012', 'Lavanda Francesa', 'lavanda-francesa', 'El Perfumista Rubio', 'esencia', fam_aromatica, 'Esencia concentrada', 'unisex',
    'Lavanda, romero y vetiver en una composición fresca.',
    'Aromática y relajante. La lavanda y la bergamota abren el camino al romero y la salvia, con un fondo de vetiver y almizcle que deja una sensación limpia.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_lavanda, 'salida'), (prod_id, n_bergamota, 'salida'),
    (prod_id, n_romero, 'corazon'), (prod_id, n_salvia, 'corazon'),
    (prod_id, n_vetiver, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 10, 'Frasco ámbar', 15000, 35, 10) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 35, 35, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 30, 'Frasco ámbar', 28000, 20, 6) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 20, 20, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Frasco ámbar', 42000, 10, 4) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 10, 10, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/lavanda-francesa.webp', 'Lavanda Francesa', 0);

  -- ===== PRODUCTO 13: Body Splash Flor de Cerezo =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0013', 'Body Splash Flor de Cerezo', 'body-splash-flor-de-cerezo', 'El Perfumista Rubio', 'body_splash', fam_floral, 'Body splash', 'femenino',
    'Cereza, peonía y almizcle para el día a día.',
    'Frescura floral para después del baño. La cereza y la mandarina aportan un toque frutal, mientras la peonía, el jazmín y el almizcle dejan la piel suavemente perfumada.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_cereza, 'salida'), (prod_id, n_mandarina, 'salida'),
    (prod_id, n_peonia, 'corazon'), (prod_id, n_jazmin, 'corazon'),
    (prod_id, n_almizcle, 'fondo'), (prod_id, n_sandalo, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 250, 'Frasco con válvula', 35000, 20, 6) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 20, 20, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/body-splash-flor-de-cerezo.webp', 'Body Splash Flor de Cerezo', 0);

  -- ===== PRODUCTO 14: Oud Mood =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0014', 'Oud Mood', 'oud-mood', 'El Perfumista Rubio', 'perfume_arabe', fam_amaderada, 'Eau de parfum', 'unisex',
    'Oud, azafrán y rosa sobre una base de ámbar y sándalo.',
    'Un perfume árabe profundo y envolvente. El oud y el azafrán abren con fuerza, la rosa y el pachulí aportan complejidad, y el ámbar gris con el sándalo cierran una estela duradera.',
    TRUE, TRUE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_oud, 'salida'), (prod_id, n_azafran, 'salida'),
    (prod_id, n_rosa, 'corazon'), (prod_id, n_pachuli, 'corazon'),
    (prod_id, n_ambar_gris, 'fondo'), (prod_id, n_sandalo, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 85000, 7, 3) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 7, 7, 'Stock inicial', admin_id);
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 120000, 3, 2) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 3, 3, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/oud-mood.webp', 'Oud Mood', 0);

  -- ===== PRODUCTO 15: Invictus =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0015', 'Invictus', 'invictus', 'El Perfumista Rubio', 'contratipo', fam_acuatica, 'Eau de toilette', 'masculino',
    'Notas marinas, pomelo y maderas para un hombre activo.',
    'Una fragancia fresca y deportiva. Las notas marinas y el pomelo abren con energía, el laurel y el jazmín dan un toque aromático, y el ámbar gris con la madera de guayaco cierran el conjunto.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_notas_marinas, 'salida'), (prod_id, n_pomelo, 'salida'),
    (prod_id, n_laurel, 'corazon'), (prod_id, n_jazmin, 'corazon'),
    (prod_id, n_ambar_gris, 'fondo'), (prod_id, n_madera_guayaco, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 50, 'Vidrio con válvula', 54000, 0, 3) RETURNING id INTO pres_id;
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 100, 'Vidrio con válvula', 76000, 0, 2) RETURNING id INTO pres_id;
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/invictus.webp', 'Invictus', 0);

  -- ===== PRODUCTO 16: Citrus Fresh =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0016', 'Citrus Fresh', 'citrus-fresh', 'El Perfumista Rubio', 'body_splash', fam_citrica, 'Body splash', 'unisex',
    'Limón, mandarina y té verde en una bruma fresca.',
    'Una bruma cítrica para renovar la energía durante el día. El limón y la mandarina se mezclan con té verde y un fondo limpio de almizcle.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_mandarina, 'salida'), (prod_id, n_bergamota, 'salida'),
    (prod_id, n_te_verde, 'corazon'), (prod_id, n_romero, 'corazon'),
    (prod_id, n_almizcle, 'fondo'), (prod_id, n_cedro, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 250, 'Frasco con válvula', 32000, 22, 6) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 22, 22, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/citrus-fresh.webp', 'Citrus Fresh', 0);

  -- ===== PRODUCTO 17: Frutal Bloom =====
  INSERT INTO productos (sku, name, slug, brand, product_type, family_id, concentration, gender, short_description, description, active, featured)
  VALUES ('PRD-0017', 'Frutal Bloom', 'frutal-bloom', 'El Perfumista Rubio', 'body_splash', fam_frutal, 'Body splash', 'femenino',
    'Frutas rojas, peonía y vainilla en una estela juvenil.',
    'Dulce y luminosa. Las frutas rojas y la mandarina abren con alegría, la peonía y el jazmín aportan feminidad, y la vainilla con el almizcle dejan un recuerdo suave.',
    TRUE, FALSE)
  RETURNING id INTO prod_id;
  INSERT INTO producto_notas (product_id, note_id, note_type) VALUES
    (prod_id, n_frutas_rojas, 'salida'), (prod_id, n_mandarina, 'salida'),
    (prod_id, n_peonia, 'corazon'), (prod_id, n_jazmin, 'corazon'),
    (prod_id, n_vainilla, 'fondo'), (prod_id, n_almizcle, 'fondo');
  INSERT INTO presentaciones (product_id, volume_ml, bottle_type, price_cop, stock, min_stock) VALUES (prod_id, 250, 'Frasco con válvula', 33000, 16, 5) RETURNING id INTO pres_id;
  INSERT INTO movimientos_inventario (item_type, presentation_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('presentacion', pres_id, 'entrada', 16, 16, 'Stock inicial', admin_id);
  INSERT INTO producto_imagenes (product_id, path, alt, sort_order) VALUES (prod_id, '/media/products/frutal-bloom.webp', 'Frutal Bloom', 0);

END $$;


-- ---- Insumos ----
DO $$
DECLARE
  admin_id BIGINT;
  sup_id   BIGINT;
BEGIN
  SELECT id INTO admin_id FROM usuarios WHERE role = 'admin' LIMIT 1;

  -- INS-0001
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0001', 'Esencia Baccarat 540', 'esencia', 'ml', 730, 200, 1200) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 850, 850, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'salida', 120, 730, 'Preparación de pedido', admin_id);

  -- INS-0002
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0002', 'Esencia Sauvage', 'esencia', 'ml', 620, 200, 900) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 620, 620, 'Stock inicial', admin_id);

  -- INS-0003
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0003', 'Esencia Vainilla', 'esencia', 'ml', 1200, 300, 700) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 1200, 1200, 'Stock inicial', admin_id);

  -- INS-0004
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0004', 'Esencia Rosa Damascena', 'esencia', 'ml', 300, 150, 1500) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 300, 300, 'Stock inicial', admin_id);

  -- INS-0005
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0005', 'Esencia Oud', 'esencia', 'ml', 180, 100, 2200) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 180, 180, 'Stock inicial', admin_id);

  -- INS-0006
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0006', 'Esencia Lavanda', 'esencia', 'ml', 400, 150, 650) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 400, 400, 'Stock inicial', admin_id);

  -- INS-0007
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0007', 'Esencia Jazmín', 'esencia', 'ml', 260, 120, 1400) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 260, 260, 'Stock inicial', admin_id);

  -- INS-0008
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0008', 'Fijador concentrado', 'fijador', 'ml', 1920, 500, 450) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 2000, 2000, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'salida', 80, 1920, 'Preparación de pedido', admin_id);

  -- INS-0009
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0009', 'Alcohol perfumístico 96°', 'alcohol', 'ml', 4700, 1000, 180) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 5000, 5000, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'salida', 300, 4700, 'Preparación de pedido', admin_id);

  -- INS-0010
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0010', 'Frasco vidrio 30 ml', 'frasco', 'unidad', 76, 20, 900) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 80, 80, 'Stock inicial', admin_id);
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'salida', 4, 76, 'Preparación de pedido', admin_id);

  -- INS-0011
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0011', 'Frasco vidrio 50 ml', 'frasco', 'unidad', 45, 20, 1200) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 45, 45, 'Stock inicial', admin_id);

  -- INS-0012
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0012', 'Frasco vidrio 100 ml', 'frasco', 'unidad', 12, 20, 1800) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 12, 12, 'Stock inicial', admin_id);

  -- INS-0013
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0013', 'Válvula spray 15 mm', 'accesorio', 'unidad', 150, 50, 350) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 150, 150, 'Stock inicial', admin_id);

  -- INS-0014
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0014', 'Caja de presentación', 'accesorio', 'unidad', 60, 25, 600) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 60, 60, 'Stock inicial', admin_id);

  -- INS-0015
  INSERT INTO insumos (sku, name, category, unit, stock, min_stock, unit_cost_cop) VALUES ('INS-0015', 'Etiquetas adhesivas', 'accesorio', 'unidad', 200, 50, 80) RETURNING id INTO sup_id;
  INSERT INTO movimientos_inventario (item_type, supply_id, movement_type, quantity, resulting_stock, reason, user_id) VALUES ('insumo', sup_id, 'entrada', 200, 200, 'Stock inicial', admin_id);

END $$;

