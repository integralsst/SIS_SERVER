import {
  Prisma,
} from "@prisma/client";

import { comoJsonPrismaEvaluacion } from "../../utils/evaluacion";

interface RegistrarHistorialInput {
  compromisoId: string;
  entidadTipo: string;
  entidadId?: string | null;
  accion: string;
  descripcion: string;
  usuarioId: string;
  datosAntes?: unknown;
  datosDespues?: unknown;
}

export function registrarHistorialCompromiso(
  tx: Prisma.TransactionClient,
  input: RegistrarHistorialInput
) {
  return tx.historialCompromiso.create({
    data: {
      compromisoId: input.compromisoId,
      entidadTipo: input.entidadTipo,
      entidadId: input.entidadId ?? null,
      accion: input.accion,
      descripcion: input.descripcion,
      usuarioId: input.usuarioId,
      datosAntes:
        input.datosAntes === undefined
          ? undefined
          : comoJsonPrismaEvaluacion(
              input.datosAntes
            ),
      datosDespues:
        input.datosDespues === undefined
          ? undefined
          : comoJsonPrismaEvaluacion(
              input.datosDespues
            ),
    },
  });
}
