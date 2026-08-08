import {
  EstadoAsignacionCompromiso,
  EstadoCompromiso,
  RolUsuario,
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import { ErrorEvaluacion } from "../../utils/evaluacion";
import { asegurarAccesoEmpresa } from "../evaluacion/acceso-evaluacion.service";

const ROLES_SUPERVISION: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

const ROLES_CLIENTE: RolUsuario[] = [
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

const ESTADOS_EDITABLES: EstadoCompromiso[] = [
  EstadoCompromiso.EN_EJECUCION,
  EstadoCompromiso.PENDIENTE_DE_REASIGNACION,
];

export function esRolSupervisorCompromiso(
  rol: RolUsuario
): boolean {
  return ROLES_SUPERVISION.includes(rol);
}

export function esRolClienteCompromiso(
  rol: RolUsuario
): boolean {
  return ROLES_CLIENTE.includes(rol);
}

export async function obtenerCompromisoOperacion(
  compromisoId: string
) {
  const compromiso = await prisma.compromiso.findUnique({
    where: {
      id: compromisoId,
    },
    select: {
      id: true,
      empresaId: true,
      estado: true,
      aspectoId: true,
      aspectoCodigo: true,
    },
  });

  if (!compromiso) {
    throw new ErrorEvaluacion(
      "El compromiso seleccionado no existe.",
      404,
      "COMPROMISO_NO_ENCONTRADO"
    );
  }

  return compromiso;
}

export async function asegurarSupervisionCompromiso(
  usuario: UsuarioSesionEvaluacion,
  compromiso: Awaited<
    ReturnType<typeof obtenerCompromisoOperacion>
  >
): Promise<void> {
  if (!esRolSupervisorCompromiso(usuario.rol)) {
    throw new ErrorEvaluacion(
      "Tu rol no puede administrar este compromiso.",
      403,
      "SUPERVISION_COMPROMISO_NO_AUTORIZADA"
    );
  }

  await asegurarAccesoEmpresa(
    usuario,
    compromiso.empresaId,
    "ESCRITURA"
  );
}

export async function asegurarParticipacionCompromiso(
  usuario: UsuarioSesionEvaluacion,
  compromiso: Awaited<
    ReturnType<typeof obtenerCompromisoOperacion>
  >
): Promise<void> {
  if (esRolSupervisorCompromiso(usuario.rol)) {
    await asegurarAccesoEmpresa(
      usuario,
      compromiso.empresaId,
      "ESCRITURA"
    );
    return;
  }

  if (
    usuario.rol !== RolUsuario.PROFESIONAL &&
    !esRolClienteCompromiso(usuario.rol)
  ) {
    throw new ErrorEvaluacion(
      "Tu rol no puede gestionar este compromiso.",
      403,
      "GESTION_COMPROMISO_NO_AUTORIZADA"
    );
  }

  await asegurarAccesoEmpresa(
    usuario,
    compromiso.empresaId,
    esRolClienteCompromiso(usuario.rol)
      ? "LECTURA"
      : "ESCRITURA"
  );

  const asignacion =
    await prisma.compromisoResponsable.findFirst({
      where: {
        compromisoId: compromiso.id,
        usuarioResponsableId: usuario.usuarioId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
      select: {
        id: true,
      },
    });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "No eres responsable activo de este compromiso.",
      403,
      "RESPONSABLE_COMPROMISO_NO_AUTORIZADO"
    );
  }
}

export async function asegurarResponsableActivoCompromiso(
  usuario: UsuarioSesionEvaluacion,
  compromiso: Awaited<
    ReturnType<typeof obtenerCompromisoOperacion>
  >
): Promise<void> {
  await asegurarParticipacionCompromiso(
    usuario,
    compromiso
  );

  const asignacion =
    await prisma.compromisoResponsable.findFirst({
      where: {
        compromisoId: compromiso.id,
        usuarioResponsableId: usuario.usuarioId,
        estado:
          EstadoAsignacionCompromiso.ASIGNADA,
      },
      select: {
        id: true,
      },
    });

  if (!asignacion) {
    throw new ErrorEvaluacion(
      "Solo un responsable activo puede realizar esta acción.",
      403,
      "RESPONSABLE_COMPROMISO_REQUERIDO"
    );
  }
}

export function asegurarCompromisoEditable(
  compromiso: Awaited<
    ReturnType<typeof obtenerCompromisoOperacion>
  >
): void {
  if (!ESTADOS_EDITABLES.includes(compromiso.estado)) {
    throw new ErrorEvaluacion(
      "El compromiso no admite cambios en su estado actual.",
      409,
      "COMPROMISO_NO_EDITABLE"
    );
  }
}

export function asegurarCompromisoEnEjecucion(
  compromiso: Awaited<
    ReturnType<typeof obtenerCompromisoOperacion>
  >
): void {
  if (
    compromiso.estado !==
    EstadoCompromiso.EN_EJECUCION
  ) {
    throw new ErrorEvaluacion(
      "El compromiso debe estar en ejecución para realizar esta acción.",
      409,
      "COMPROMISO_NO_EJECUCION"
    );
  }
}
