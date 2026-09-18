import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RoleGate({ resource, action, children, fallback = null }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(resource, action)) return fallback;
  return children;
}
