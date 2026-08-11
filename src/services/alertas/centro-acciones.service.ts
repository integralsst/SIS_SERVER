import type { UsuarioSesionEvaluacion } from "../../types/evaluacion.types";
import {
  servicioAlertasAuditorias,
  type AlertaAuditoria,
} from "../auditorias/alertas-auditorias.service";
import {
  servicioAlertasCompromisos,
  type AlertaCompromiso,
} from "../compromisos/alertas-compromisos.service";
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
type AlertaCentro =
  | AlertaControlEvaluacion
  | AlertaCompromiso
  | AlertaAuditoria;

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
    compromisos,
    controlesEvaluacion,
    evidenciasPendientes,
    revisionesTecnicas,
    auditorias,
  ] = await Promise.all([
    servicioAlertasCompromisos.listar(usuario, {
      empresaId: opciones.empresaId,
      limiteConsulta,
      limiteRespuesta: null,
    }),
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

  const alertasCompromisos = compromisos.alertas.filter((alerta) =>
    empresasPermitidas.has(alerta.empresa.id)
  );
  const alertasControl = [
    ...controlesEvaluacion,
    ...evidenciasPendientes,
    ...revisionesTecnicas,
  ].filter((alerta) => empresasPermitidas.has(alerta.empresa.id));
  const alertasAuditorias = auditorias.filter((alerta) =>
    empresasPermitidas.has(alerta.empresa.id)
  );

  return ordenar([
    ...alertasCompromisos,
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
