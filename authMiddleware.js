// authMiddleware.js
const { supabase } = require('./supabaseClient');

/**
 * Middleware que valida el JWT de Supabase y carga usuario + rol en req.user
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Validar token con Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('Error validando token:', userError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    const user = userData.user;

    // Buscar el perfil en la tabla profiles (para obtener el rol)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error buscando perfil:', profileError);
      return res.status(403).json({ error: 'Perfil no encontrado' });
    }

    // Guardamos info en la request
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role
    };

    next();
  } catch (err) {
    console.error('Error en authMiddleware:', err);
    res.status(500).json({ error: 'Error interno de autenticación' });
  }
}

/**
 * Middleware para exigir un rol específico
 * @param {string|string[]} rolesPermitidos
 */
function requireRole(rolesPermitidos) {
  const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta operación' });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole
};
