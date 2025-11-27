# LVLUP Gamer – API

Backend REST de la tienda **LVLUP Gamer**, construido con **Node.js + Express** y **Supabase** como backend-as-a-service (auth + base de datos).

La API expone endpoints para:

- Autenticación de usuarios (login / registro).
- Gestión de perfiles y roles (customer / admin).
- CRUD de productos.
- Creación y consulta de órdenes de compra.

Deploy actual (Render):

> https://lvlup-gamer-api.onrender.com

> Todas las rutas reales están bajo el prefijo `/api/v1/...`

---

## 🧱 Stack tecnológico

- **Node.js** + **Express**
- **Supabase**
  - Auth (email/password)
  - Tablas: `profiles`, `products`, `orders`, `order_items`
- **JWT** (tokens de Supabase, validados por middleware)
- **Render** para el deploy

---

## ⚙️ Variables de entorno

En el proyecto se utiliza un archivo `.env` (no se sube al repo).  
Ejemplo de configuración mínima:

```env
PORT=10000

SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_JWT_SECRET=tu_jwt_secret_opcional
En producción (Render), estas variables se configuran en el panel de Environment.

▶️ Cómo correr el proyecto en local
Clonar el repo:

bash
Copiar código
git clone https://github.com/tu-usuario/lvlup-gamer-api.git
cd lvlup-gamer-api
Instalar dependencias:

bash
Copiar código
npm install
Crear archivo .env en la raíz con las variables de entorno.

Levantar el servidor:

bash
Copiar código
npm start
o en desarrollo:

bash
Copiar código
npm run dev
Por defecto la API queda disponible en:

text
Copiar código
http://localhost:10000
🔌 Endpoints principales
Healthcheck
GET /api/v1/health
Respuesta de prueba para verificar que la API está arriba.

🔐 Autenticación
POST /api/v1/auth/register
Crea un usuario en Supabase Auth y su perfil en la tabla profiles con rol customer.

Body (JSON):

json
Copiar código
{
  "name": "Nicolás",
  "email": "test@example.com",
  "password": "Password123!"
}
Respuesta (201):

json
Copiar código
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "role": "customer",
    "name": "Nicolás"
  }
}
POST /api/v1/auth/login
Inicia sesión contra Supabase y devuelve el token + perfil.

Body (JSON):

json
Copiar código
{
  "email": "test@example.com",
  "password": "Password123!"
}
Respuesta (200):

json
Copiar código
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "role": "customer",
    "name": "Nicolás"
  }
}
👤 Usuario actual
GET /api/v1/me
Requiere header Authorization: Bearer <token>.

Devuelve la info básica del usuario asociado al token.

json
Copiar código
{
  "id": "uuid",
  "email": "test@example.com",
  "role": "admin",
  "name": "Admin LVLUP"
}
🛒 Productos
GET /api/v1/products (público)
Lista todos los productos:

json
Copiar código
[
  {
    "id": 1,
    "name": "Teclado gamer RGB",
    "description": "Teclado mecánico con iluminación RGB",
    "price": 39990,
    "stock": 10,
    "image_url": "https://..."
  },
  ...
]
POST /api/v1/products (solo admin)
Crea un producto nuevo.
Requiere:

Header Authorization: Bearer <token> de usuario con role = 'admin'.

Body (JSON):

json
Copiar código
{
  "name": "Mouse gamer pro",
  "description": "Mouse gamer con DPI ajustable",
  "price": 29990,
  "stock": 15,
  "image_url": "https://..."
}
PUT /api/v1/products/:id (solo admin)
Actualiza un producto existente.

http
Copiar código
PUT /api/v1/products/1
Authorization: Bearer <token-admin>
Content-Type: application/json
Body (JSON):

json
Copiar código
{
  "name": "Mouse gamer pro v2",
  "description": "Versión actualizada",
  "price": 31990,
  "stock": 20,
  "image_url": "https://..."
}
DELETE /api/v1/products/:id (solo admin)
Elimina un producto por ID.

http
Copiar código
DELETE /api/v1/products/1
Authorization: Bearer <token-admin>
Respuesta: 204 No Content si se elimina correctamente.

📦 Órdenes
POST /api/v1/orders (usuario autenticado)
Crea una orden y sus items asociados.

Headers:

http
Copiar código
Authorization: Bearer <token>
Content-Type: application/json
Body (JSON):

json
Copiar código
{
  "items": [
    { "id": 1, "name": "Teclado gamer RGB", "price": 39990, "qty": 1 },
    { "id": 2, "name": "Mouse gamer pro", "price": 29990, "qty": 2 }
  ],
  "shipping": {
    "name": "Nicolás Bravo",
    "email": "nico@example.com",
    "address": "Av. Siempre Viva 123"
  }
}
Crea registro en orders y registros en order_items.

GET /api/v1/orders
Si el usuario es admin: devuelve todas las órdenes.

Si el usuario es customer: devuelve solo sus órdenes.

http
Copiar código
GET /api/v1/orders
Authorization: Bearer <token>
🧱 Middlewares de seguridad
En el proyecto hay dos middlewares clave:

authMiddleware

Valida el header Authorization: Bearer <token>.

Decodifica el token contra Supabase.

Carga req.user con { id, email, role, name }.

requireRole('admin')

Verifica que req.user.role coincida con el rol requerido.

Se usa en rutas de administración (productos, etc.).

Ejemplo de uso en rutas:

js
Copiar código
app.post(
  '/api/v1/products',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => { ... }
)
🧪 Ejemplos rápidos con cURL
Login
bash
Copiar código
curl -X POST https://lvlup-gamer-api.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lvlup.com",
    "password": "Admin123!"
  }'
Obtener productos
bash
Copiar código
curl https://lvlup-gamer-api.onrender.com/api/v1/products
Crear producto (admin)
bash
Copiar código
curl -X POST https://lvlup-gamer-api.onrender.com/api/v1/products \
  -H "Authorization: Bearer TU_TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Headset gamer",
    "description": "Audífonos con micrófono",
    "price": 25990,
    "stock": 8,
    "imagasade_url": "https://..."
  }'