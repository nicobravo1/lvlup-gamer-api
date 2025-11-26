// authMiddleware.js
const { supabase } = require('./supabaseClient')

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [, token] = authHeader.split(' ')

  if (!token) {
    return res.status(401).json({ error: 'Token no enviado' })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    console.error('Error en getUser:', error)
    return res.status(401).json({ error: 'Token inválido' })
  }

  const user = data.user

  // Rol por defecto
  let role = 'customer'
  // Si quieres, cambia este correo por el de tu admin real
  if (user.email === 'admin@lvlup.com') {
    role = 'admin'
  }

  req.user = {
    id: user.id,
    email: user.email,
    role,
  }

  next()
}

function requireRole(roleRequired) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    if (req.user.role !== roleRequired) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    next()
  }
}

module.exports = { authMiddleware, requireRole }
