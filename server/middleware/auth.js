import { verifyToken } from '../data/auth.js';
import { getDb, isSupabaseConfigured, getSupabaseClient } from '../data/db.js';
import { fromDbRecord } from '../data/supabase.js';

// Authenticate JWT token
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Check RBAC permission
export function authorize(resource, action) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const db = getDb();
    let user = (db.users || []).find(u => u.id === req.user.id);

    if (!user && isSupabaseConfigured()) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data } = await client.from('users').select('*').eq('id', req.user.id).limit(1);
          if (data && data.length > 0) {
            user = fromDbRecord(data[0]);
            if (!db.users) db.users = [];
            db.users.push(user);
          }
        }
      } catch (err) {
        console.error('Authorize user lookup error:', err.message);
      }
    }

    if (!user || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account inactive or not found' });
    }

    const perms = user.permissions || {};
    const resourcePerms = perms[resource];

    if (!resourcePerms || !resourcePerms[action]) {
      return res.status(403).json({ success: false, message: `Permission denied: ${resource}.${action}` });
    }

    next();
  };
}

// Data scope — agents see only their leads, managers see team, admin sees all
export function scopeQuery(req, resource) {
  if (!req.user) return {};

  const db = getDb();
  const user = (db.users || []).find(u => u.id === req.user.id);
  if (!user) return {};

  if (user.role === 'admin' || user.role === 'manager') return {}; // no filter
  if (user.role === 'agent') return { rep: user.name }; // only own leads
  return {}; // viewer sees all (read-only)
}
