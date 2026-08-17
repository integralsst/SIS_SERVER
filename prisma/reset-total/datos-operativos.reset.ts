import type {
  PrismaClient,
} from "@prisma/client";

import { eliminarRegistros } from "./registro-eliminacion";

export async function eliminarDatosOperativos(
  prisma: PrismaClient
): Promise<void> {
  console.log(
    "1/4 Eliminando compromisos, evidencias e historiales..."
  );

  await eliminarRegistros(
    "Aprobaciones de ampliación",
    () =>
      prisma.aprobacionAmpliacionCompromiso.deleteMany()
  );
  await eliminarRegistros(
    "Solicitudes de ampliación",
    () =>
      prisma.solicitudAmpliacionCompromiso.deleteMany()
  );
  await eliminarRegistros(
    "Solicitudes de cierre",
    () =>
      prisma.solicitudCierreCompromiso.deleteMany()
  );
  await eliminarRegistros(
    "Evidencias de compromisos",
    () =>
      prisma.compromisoEvidencia.deleteMany()
  );
  await eliminarRegistros(
    "Seguimientos de compromisos",
    () =>
      prisma.seguimientoCompromiso.deleteMany()
  );
  await eliminarRegistros(
    "Actividades de compromisos",
    () =>
      prisma.actividadCompromiso.deleteMany()
  );

  await prisma.compromisoResponsable.updateMany({
    where: {
      reemplazaAId: {
        not: null,
      },
    },
    data: {
      reemplazaAId: null,
    },
  });

  await eliminarRegistros(
    "Responsables de compromisos",
    () =>
      prisma.compromisoResponsable.deleteMany()
  );
  await eliminarRegistros(
    "Evaluaciones de seguimiento vinculadas",
    () =>
      prisma.compromisoEvaluacionSeguimiento.deleteMany()
  );
  await eliminarRegistros(
    "Historial de compromisos",
    () =>
      prisma.historialCompromiso.deleteMany()
  );
  await eliminarRegistros(
    "Compromisos",
    () => prisma.compromiso.deleteMany()
  );

  console.log("");
  console.log(
    "2/4 Eliminando auditorías, evaluaciones, gestiones y periodos..."
  );

  await eliminarRegistros(
    "Seguimientos de auditorías",
    () => prisma.seguimientoAuditoria.deleteMany()
  );
  await eliminarRegistros(
    "Recomendaciones de auditoría",
    () => prisma.recomendacionAuditoria.deleteMany()
  );
  await eliminarRegistros(
    "Hallazgos de auditoría",
    () => prisma.hallazgoAuditoria.deleteMany()
  );
  await eliminarRegistros(
    "Auditorías SG-SST",
    () => prisma.auditoriaSgsst.deleteMany()
  );
  await eliminarRegistros(
    "Evaluaciones sujetas a aprobación de gestión",
    () =>
      prisma.aprobacionGestionEvaluacion.deleteMany()
  );
  await eliminarRegistros(
    "Aprobaciones de gestión",
    () => prisma.aprobacionGestion.deleteMany()
  );
  await eliminarRegistros(
    "Decisiones de No aplica",
    () => prisma.decisionNoAplica.deleteMany()
  );
  await eliminarRegistros(
    "Revisiones técnicas",
    () =>
      prisma.revisionTecnicaEvaluacion.deleteMany()
  );
  await eliminarRegistros(
    "Evidencias de evaluación",
    () =>
      prisma.evidenciaEvaluacion.deleteMany()
  );
  await eliminarRegistros(
    "Historial de evaluaciones",
    () =>
      prisma.historialEvaluacion.deleteMany()
  );
  await eliminarRegistros(
    "Evaluaciones por aspecto",
    () =>
      prisma.evaluacionAspecto.deleteMany()
  );
  await eliminarRegistros(
    "Informes de periodos",
    () =>
      prisma.informePeriodoSgsst.deleteMany()
  );
  await eliminarRegistros(
    "Participantes de gestiones",
    () =>
      prisma.gestionParticipante.deleteMany()
  );
  await eliminarRegistros(
    "Gestiones SG-SST",
    () => prisma.gestionSgsst.deleteMany()
  );
  await eliminarRegistros(
    "Periodos de empresas",
    () => prisma.empresaPeriodo.deleteMany()
  );
}
