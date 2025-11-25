// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const { authMiddleware, requireRole } = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares base
app.use(cors());
app.use(express.json());

// ======================
//  HEALTHCHECK
// ======================
app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, message: 'API lvlup-gamer funcionando 👾' });
});

// ======================
//  LOGIN (frontend -> backend -> Supabase)
// ======================
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  try {
    // Login contra Supabase desde el backend
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session) {
      console.error('Error login Supabase (backend):', error);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = data.session.access_token;
    const user = data.user;

    // Buscar perfil en la tabla profiles para obtener rol
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error buscando perfil en login:', profileError);
      return res.status(403).json({ error: 'Perfil no encontrado' });
    }

    // Devolvemos token + info del usuario
    return res.json({
      token,
      user: profile, // { id, email, role }
    });
  } catch (err) {
    console.error('Error inesperado en /auth/login:', err);
    return res.status(500).json({ error: 'Error interno en login' });
  }
});
// ======================
//  REGISTRO (frontend -> backend -> Supabase)
// ======================
app.post('/api/v1/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y password son obligatorios' });
  }

  try {
    // 1) Crear el usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data?.user) {
      console.error('Error en signUp Supabase:', error);
      return res.status(400).json({ error: 'No se pudo crear el usuario' });
    }

    const user = data.user;

    // 2) Crear el perfil con rol "customer"
    const profilePayload = {
      id: user.id,
      email,
      role: 'customer',
      name, // columna name en tabla profiles
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profilePayload)
      .select()
      .single();

    if (profileError) {
      console.error('Error creando perfil en register:', profileError);
      return res.status(500).json({ error: 'Usuario creado, pero fallo al guardar perfil' });
    }

    // 3) Obtener un token de sesión (por si signUp no lo devuelve)
    let token = data.session?.access_token;

    if (!token) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError || !loginData?.session) {
        console.error('Error obteniendo sesión tras registro:', loginError);
        return res.status(500).json({ error: 'Usuario creado, pero sin sesión' });
      }

      token = loginData.session.access_token;
    }

    // 4) Devolver token + perfil (igual que en login)
    return res.status(201).json({
      token,
      user: profile, // { id, email, role, name }
    });
  } catch (err) {
    console.error('Error inesperado en /auth/register:', err);
    return res.status(500).json({ error: 'Error interno en registro' });
  }
});




// ======================
//  RUTA /me (usuario actual)
// ======================
app.get('/api/v1/me', authMiddleware, (req, res) => {
  // req.user viene del authMiddleware
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
});

// ======================
//  PRODUCTOS
// ======================

// Listar todos los productos (público)
app.get('/api/v1/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error obteniendo productos:', error);
      return res.status(500).json({ error: 'Error obteniendo productos' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error inesperado en /products:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Crear producto (solo admin)
app.post(
  '/api/v1/products',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { name, description, price, stock, image_url } = req.body;

      if (!name || price == null) {
        return res
          .status(400)
          .json({ error: 'name y price son obligatorios' });
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{ name, description, price, stock, image_url }])
        .select()
        .single();

      if (error) {
        console.error('Error creando producto:', error);
        return res.status(500).json({ error: 'Error creando producto' });
      }

      res.status(201).json(data);
    } catch (err) {
      console.error('Error inesperado en POST /products:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  }
);

// Actualizar producto (solo admin)
app.put(
  '/api/v1/products/:id',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const { name, description, price, stock, image_url } = req.body;

      const { data, error } = await supabase
        .from('products')
        .update({ name, description, price, stock, image_url })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando producto:', error);
        return res.status(500).json({ error: 'Error actualizando producto' });
      }

      res.json(data);
    } catch (err) {
      console.error('Error inesperado en PUT /products/:id:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  }
);

// Eliminar producto (solo admin)
app.delete(
  '/api/v1/products/:id',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const id = req.params.id;

      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        console.error('Error eliminando producto:', error);
        return res.status(500).json({ error: 'Error eliminando producto' });
      }

      res.status(204).send();
    } catch (err) {
      console.error('Error inesperado en DELETE /products/:id:', err);
      res.status(500).json({ error: 'Error interno' });
    }
  }
);

// ======================
//  ÓRDENES
// ======================

// Crear orden (usuario autenticado)
app.post('/api/v1/orders', authMiddleware, async (req, res) => {
  const { items, shipping } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La orden debe tener items' });
  }

  try {
    const total = items.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0),
      0
    );

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: req.user.id,
          total,
          shipping_name: shipping?.name || null,
          shipping_email: shipping?.email || null,
          shipping_address: shipping?.address || null,
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error creando orden:', orderError);
      return res.status(500).json({ error: 'Error creando orden' });
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.qty,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creando items de orden:', itemsError);
      return res
        .status(500)
        .json({ error: 'Orden creada, pero fallo al guardar items' });
    }

    res.status(201).json({ ...order, items });
  } catch (err) {
    console.error('Error inesperado en POST /orders:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Listar órdenes (cliente ve las suyas, admin ve todas)
app.get('/api/v1/orders', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      ordersQuery = ordersQuery.eq('user_id', req.user.id);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error obteniendo órdenes:', ordersError);
      return res.status(500).json({ error: 'Error obteniendo órdenes' });
    }

    if (!orders || orders.length === 0) {
      return res.json([]);
    }

    const orderIds = orders.map((o) => o.id);

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Error obteniendo items de órdenes:', itemsError);
      return res
        .status(500)
        .json({ error: 'Error obteniendo items de órdenes' });
    }

    const itemsByOrder = {};
    for (const it of items || []) {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    }

    const result = orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error('Error inesperado en GET /orders:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ======================
//  ARRANQUE DEL SERVIDOR
// ======================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

