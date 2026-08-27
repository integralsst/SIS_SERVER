import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  servicioAlertasAuditorias,
  type AlertaAuditoria,
} from "../auditorias/alertas-auditorias.service";
import {
  asegurarEmpresaAccesible,
  listarEmpresasAccesibles,
} from "../empresas/acceso-empresas.service";
import {
  servicioAlertasControlEvaluacion,
  type AlertaControlEvaluacion,
} from "../evaluacion/alertas-control-evaluacion.service";
import { servicioAlertasEvidenciasPendientes } from "../evaluacion/alertas-evidencias-pendientes.service";
import { servicioAlertasRevisionesTecnicas } from "../evaluacion/revisiones/alertas-revisiones-tecnicas.service";

type NivelAlerta = "ALTA" | "MEDIA" | "BAJA";
type AlertaCentro = AlertaControlEvaluacion | AlertaAuditoria;

interface OpcionesCentroAcciones {
  empresaId?: string;
  completa?: boolean;
}

function prioridad(nivel: NivelAlerta): number {
  if (nivel === "ALTA") return 1;
  if (nivel === "MEDIA") return 2;
  return 3;
}

function ordenar(alertas: AlertaCentro[]): AlertaCentro[] {
  return alertas.sort((a, b) => {
    const nivel = prioridad(a.nivel) - prioridad(b.nivel);

    if (nivel !== 0) return nivel;

    return a.fechaLimite.localeCompare(b.fechaLimite);
  });
}

async function cargar(
  usuario: UsuarioSesionEvaluacion,
  opciones: OpcionesCentroAcciones
) {
  const limiteConsulta = opciones.completa ? null : undefined;

  const empresas = opciones.empresaId
    ? [await asegurarEmpresaAccesible(usuario, opciones.empresaId)]
    : await listarEmpresasAccesibles(usuario);
  const empresasPermitidas = new Set(empresas.map((empresa) => empresa.id));

  const [
    controlesEvaluacion,
    evidenciasPendientes,
    revisionesTecnicas,
    auditorias,
  ] = await Promise.all([
    servicioAlertasControlEvaluacion.listar(usuario, {
      empresaId: opciones.empresaId,
      limiteConsulta,
    }),
    servicioAlertasEvidenciasPendientes.listar(usuario, {
      empresaId: opciones.empresaId,
      limiteConsulta,
    }),
    servicioAlertasRevisionesTecnicas.listar(usuario, {
      empresaId: opciones.empresaId,
      limiteConsulta,
    }),
    servicioAlertasAuditorias.listar(usuario, {
      empresaId: opciones.empresaId,
      limiteConsulta,
    }),
  ]);

  const alertasControl = [
    ...controlesEvaluacion,
    ...evidenciasPendientes,
    ...revisionesTecnicas,
  ].filter((alerta) => empresasPermitidas.has(alerta.empresa.id));
  const alertasAuditorias = auditorias.filter((alerta) =>
    empresasPermitidas.has(alerta.empresa.id)
  );

  // Las alertas de "gestión asignada" pertenecen al flujo colaborativo
  // legado. El modelo vigente trabaja directamente sobre la matriz.
  return ordenar([
    ...alertasControl,
    ...alertasAuditorias,
  ]);
}

export const servicioCentroAcciones = {
  listar: async (usuario: UsuarioSesionEvaluacion) => {
    const alertas = await cargar(usuario, { completa: false });

    return {
      resumen: {
        total: alertas.length,
        urgentes: alertas.filter((alerta) => alerta.nivel === "ALTA").length,
      },
      alertas: alertas.slice(0, 12),
      generadasEn: new Date().toISOString(),
    };
  },

  listarTodas: async (
    usuario: UsuarioSesionEvaluacion,
    empresaId?: string
  ): Promise<AlertaCentro[]> =>
    cargar(usuario, {
      completa: true,
      empresaId,
    }),
};
