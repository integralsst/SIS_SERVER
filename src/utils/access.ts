import { RolUsuario } from "@prisma/client";

// ======================================================
// GRUPOS DE ROLES
// ======================================================

export const ROLES_INTERNOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

export const ROLES_GESTION_USUARIOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.ADMIN_CLIENTE,
];

const NIVEL_ROL: Record<RolUsuario, number> = {
  [RolUsuario.USUARIO]: 10,
  [RolUsuario.USUARIO_CLIENTE]: 10,
  [RolUsuario.PROFESIONAL]: 20,
  [RolUsuario.COORDINADOR]: 30,
  [RolUsuario.ADMIN_CLIENTE]: 30,
  [RolUsuario.ADMIN]: 40,
  [RolUsuario.PROPIETARIO]: 50,
  [RolUsuario.SUPERADMIN]: 60,
};

// ======================================================
// VALIDACIONES DE ACCESO
// ======================================================

export function esRolInterno(rol: RolUsuario): boolean {
  return ROLES_INTERNOS.includes(rol);
}

export function esRolCliente(rol: RolUsuario): boolean {
  return (
    rol === RolUsuario.ADMIN_CLIENTE ||
    rol === RolUsuario.USUARIO_CLIENTE
  );
}

export function puedeAsignarRol(
  rolActor: RolUsuario,
  rolObjetivo: RolUsuario
): boolean {
  if (rolActor === RolUsuario.SUPERADMIN) {
    return true;
  }

  if (rolActor === RolUsuario.ADMIN_CLIENTE) {
    return rolObjetivo === RolUsuario.USUARIO_CLIENTE;
  }

  return NIVEL_ROL[rolActor] > NIVEL_ROL[rolObjetivo];
}

export function puedeGestionarRolObjetivo(
  rolActor: RolUsuario,
  rolObjetivo: RolUsuario
): boolean {
  if (rolActor === RolUsuario.SUPERADMIN) {
    return true;
  }

  if (rolActor === RolUsuario.ADMIN_CLIENTE) {
    return rolObjetivo === RolUsuario.USUARIO_CLIENTE;
  }

  return NIVEL_ROL[rolActor] > NIVEL_ROL[rolObjetivo];
}

// ======================================================
// ALIASES TEMPORALES
// ======================================================
// Permiten actualizar los demás controladores paso a paso.

export const INTERNAL_ROLES = ROLES_INTERNOS;
export const USER_MANAGEMENT_ROLES = ROLES_GESTION_USUARIOS;

export const isInternalRole = esRolInterno;
export const isClientRole = esRolCliente;
export const canAssignRole = puedeAsignarRol;
export const canManageTargetRole =
  puedeGestionarRolObjetivo;
