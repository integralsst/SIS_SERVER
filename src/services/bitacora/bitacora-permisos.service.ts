import { RolUsuario } from "@prisma/client";

import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorValidacionBitacora } from "../../validators/bitacora/bitacora.validator";
import { asegurarAccesoEmpresa } from "../evaluacion/acceso-evaluacion.service";

const ROLES_BITACORA_INTERNA: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

/**
 * La bitácora es un repositorio técnico interno. Reutilizamos la regla
 * multiempresa ya probada por Evaluación para no duplicar criterios de
 * asignación, pero bloqueamos expresamente los roles cliente.
 */
export async function asegurarAccesoBitacoraEmpresa(
  usuario: UsuarioSesionEvaluacion,
  empresaId: string
) {
  if (!ROLES_BITACORA_INTERNA.includes(usuario.rol)) {
    throw new ErrorValidacionBitacora(
      "Tu rol no tiene acceso a la bitácora técnica de la empresa.",
      403,
      "BITACORA_ROL_NO_AUTORIZADO"
    );
  }

  return asegurarAccesoEmpresa(usuario, empresaId, "ESCRITURA");
}
