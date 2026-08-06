import {
  Prisma,
  RolUsuario,
} from "@prisma/client";

import type { ResponsableDisponibleCompromiso } from "../../../types/evaluacion/compromisos/finalizacion-gestion.types";
import { ErrorEvaluacion } from "../../../utils/evaluacion";

const ROLES_INTERNOS_RESPONSABLES: RolUsuario[] = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const ROLES_PROFESIONALES_RESPONSABLES: RolUsuario[] = [
  RolUsuario.COORDINADOR,
  RolUsuario.PROFESIONAL,
];

const ROLES_CLIENTE_RESPONSABLES: RolUsuario[] = [
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

export async function listarResponsablesDisponibles(
  tx: Pick<Prisma.TransactionClient, "usuario">,
  empresaId: string
): Promise<ResponsableDisponibleCompromiso[]> {
  const ahora = new Date();

  const usuarios = await tx.usuario.findMany({
    where: {
      activo: true,
      OR: [
        {
          rol: {
            in: ROLES_INTERNOS_RESPONSABLES,
          },
        },
        {
          rol: {
            in: ROLES_PROFESIONALES_RESPONSABLES,
          },
          profesional: {
            is: {
              activo: true,
              asignacionesEmpresas: {
                some: {
                  empresaId,
                  activo: true,
                  OR: [
                    {
                      fechaFin: null,
                    },
                    {
                      fechaFin: {
                        gte: ahora,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          rol: {
            in: ROLES_CLIENTE_RESPONSABLES,
          },
          empresaId,
        },
      ],
    },
    select: {
      id: true,
      nombre: true,
      rol: true,
    },
    orderBy: {
      nombre: "asc",
    },
  });

  return usuarios.map((usuario) => ({
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol,
    tipoActor: ROLES_CLIENTE_RESPONSABLES.includes(
      usuario.rol
    )
      ? "CLIENTE"
      : "INTERNO",
  }));
}

export function asegurarResponsablesDisponibles(
  responsablesDisponibles: ResponsableDisponibleCompromiso[],
  usuarioIds: string[]
): void {
  const disponibles = new Set(
    responsablesDisponibles.map(
      (responsable) => responsable.id
    )
  );

  const noDisponibles = usuarioIds.filter(
    (usuarioId) => !disponibles.has(usuarioId)
  );

  if (noDisponibles.length > 0) {
    throw new ErrorEvaluacion(
      "Uno o más responsables no están activos o no tienen relación vigente con la empresa.",
      409,
      "RESPONSABLE_NO_DISPONIBLE"
    );
  }
}
