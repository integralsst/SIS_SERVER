import type {
  AccionCentro,
  CategoriaAccionCentro,
  NivelAccionCentro,
} from "../../types/alertas/centro-acciones.types";

interface AlertaBaseCentro {
  id: string;
  compromisoId: string;
  tipo: string;
  nivel: NivelAccionCentro;
  titulo: string;
  descripcion: string;
  empresa: {
    id: string;
    nombre: string;
  };
  aspecto: {
    id: number;
    nombre: string;
  };
  fechaLimite: string;
  accion: {
    etiqueta: string;
    ruta: string;
  };
}

const TIPOS_COMPROMISO = new Set([
  "REASIGNACION",
  "REVISION_CIERRE",
  "REVISION_AMPLIACION",
  "DEVOLUCION",
  "ACTIVIDAD",
  "RECALIFICACION",
  "SOLICITUD_CIERRE",
]);

export function clasificarCategoriaAccion(
  tipo: string
): CategoriaAccionCentro {
  if (TIPOS_COMPROMISO.has(tipo)) {
    return "COMPROMISOS";
  }

  if (tipo === "EVIDENCIA_PENDIENTE") {
    return "EVIDENCIAS";
  }

  if (tipo.startsWith("REVISION_TECNICA")) {
    return "REVISION_TECNICA";
  }

  if (
    tipo === "REVISION_NO_APLICA" ||
    tipo === "NO_APLICA_RECHAZADO"
  ) {
    return "NO_APLICA";
  }

  if (tipo.startsWith("APROBACION_GESTION")) {
    return "APROBACIONES";
  }

  if (tipo.startsWith("AUDITORIA_")) {
    return "AUDITORIAS";
  }

  return "OTROS";
}

export function normalizarAccionCentro(
  alerta: AlertaBaseCentro
): AccionCentro {
  const categoria = clasificarCategoriaAccion(alerta.tipo);

  return {
    id: alerta.id,
    categoria,
    tipo: alerta.tipo,
    nivel: alerta.nivel,
    titulo: alerta.titulo,
    descripcion: alerta.descripcion,
    empresa: alerta.empresa,
    aspecto: alerta.aspecto,
    referencia: {
      tipo: categoria,
      id: alerta.compromisoId,
    },
    fechaReferencia: alerta.fechaLimite,
    accion: alerta.accion,
  };
}
