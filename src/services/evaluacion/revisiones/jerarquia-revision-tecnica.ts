import { RolUsuario } from "@prisma/client";

const ROLES_RESOLUCION_LEGADA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const ROLES_EVALUADOR_LEGADOS: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

export function puedeResolverRevisionSegunJerarquia(
  rolRevisor: RolUsuario,
  rolEvaluador: RolUsuario
): boolean {
  if (rolEvaluador === RolUsuario.PROFESIONAL) {
    return rolRevisor === RolUsuario.COORDINADOR;
  }

  if (rolEvaluador === RolUsuario.COORDINADOR) {
    return rolRevisor === RolUsuario.SUPERADMIN;
  }

  // Compatibilidad: los demás roles de evaluación no fueron redefinidos
  // por la regla funcional aprobada y conservan el comportamiento previo.
  return ROLES_RESOLUCION_LEGADA.includes(rolRevisor);
}

export function rolesEvaluadorPermitidosParaRevisor(
  rolRevisor: RolUsuario
): RolUsuario[] {
  if (rolRevisor === RolUsuario.COORDINADOR) {
    return [RolUsuario.PROFESIONAL, ...ROLES_EVALUADOR_LEGADOS];
  }

  if (rolRevisor === RolUsuario.SUPERADMIN) {
    return [RolUsuario.COORDINADOR, ...ROLES_EVALUADOR_LEGADOS];
  }

  if (
    rolRevisor === RolUsuario.PROPIETARIO ||
    rolRevisor === RolUsuario.ADMIN
  ) {
    return [...ROLES_EVALUADOR_LEGADOS];
  }

  return [];
}

export function descripcionJerarquiaRevision(
  rolEvaluador: RolUsuario
): string | null {
  if (rolEvaluador === RolUsuario.PROFESIONAL) {
    return "Las evaluaciones registradas por un PROFESIONAL deben ser revisadas por un COORDINADOR.";
  }

  if (rolEvaluador === RolUsuario.COORDINADOR) {
    return "Las evaluaciones registradas por un COORDINADOR deben ser revisadas por un SUPERADMIN.";
  }

  return null;
}
