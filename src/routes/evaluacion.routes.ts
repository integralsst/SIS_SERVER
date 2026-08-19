import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorAprobacionesGestion } from "../controllers/evaluacion/aprobaciones-gestion.controller";
import { controladorContextoEvaluacion } from "../controllers/evaluacion/contexto-evaluacion.controller";
import { controladorDetalleAspecto } from "../controllers/evaluacion/detalle-aspecto.controller";
import { controladorFinalizacionGestion } from "../controllers/evaluacion/compromisos/finalizacion-gestion.controller";
import { controladorEvidenciasEvaluacion } from "../controllers/evaluacion/evidencias-evaluacion.controller";
import { controladorEvaluacionesAspecto } from "../controllers/evaluacion/evaluaciones-aspecto.controller";
import { controladorGestionesSgsst } from "../controllers/evaluacion/gestiones-sgsst.controller";
import { controladorInformesGlobales } from "../controllers/evaluacion/informes-globales.controller";
import { controladorInformesPeriodo } from "../controllers/evaluacion/informes-periodo.controller";
import { controladorNoAplica } from "../controllers/evaluacion/no-aplica.controller";
import { controladorParticipantesGestion } from "../controllers/evaluacion/participantes-gestion.controller";
import { controladorPeriodosEvaluacion } from "../controllers/evaluacion/periodos-evaluacion.controller";
import { controladorResultadosEvaluacion } from "../controllers/evaluacion/resultados-evaluacion.controller";
import { controladorRevisionesTecnicas } from "../controllers/evaluacion/revisiones-tecnicas.controller";
import {
  authenticate as autenticar,
  authorize as autorizar,
} from "../middlewares/auth.middleware";

const router = Router();

const rolesLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

const rolesEvaluacion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

const rolesControlEvaluacion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

const rolesAdministrador = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const rolesInvalidacion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

const rolesRevisionLectura = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
  RolUsuario.COORDINADOR,
];

const rolesRevisionResolucion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.COORDINADOR,
];

router.use(autenticar);

// ======================================================
// CONTEXTO, RESULTADOS, INFORMES Y DETALLE
// ======================================================

router.get(
  "/empresas/:empresaId/contexto",
  autorizar(...rolesLectura),
  controladorContextoEvaluacion.obtener
);

router.get(
  "/empresas/:empresaId/resultados",
  autorizar(...rolesLectura),
  controladorResultadosEvaluacion.obtener
);

router.get(
  "/informes-globales",
  autorizar(...rolesLectura),
  controladorInformesGlobales.listar
);

router.get(
  "/empresas/:empresaId/informes",
  autorizar(...rolesLectura),
  controladorInformesPeriodo.listar
);

router.post(
  "/empresas/:empresaId/informes",
  autorizar(...rolesEvaluacion),
  controladorInformesPeriodo.generar
);

router.get(
  "/informes/:informeId/pdf",
  autorizar(...rolesLectura),
  controladorInformesPeriodo.descargarPdf
);

router.get(
  "/informes/:informeId",
  autorizar(...rolesLectura),
  controladorInformesPeriodo.obtenerDetalle
);

// Endpoint anterior conservado para compatibilidad.
router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtener
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/resumen",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerResumen
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/resumen-rapido",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerResumenRapido
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/resumen-configuracion",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerConfiguracionResumen
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/historial",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerHistorial
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/historial-paginado",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerHistorialPaginado
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/evidencias",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtenerEvidencias
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle/revision-tecnica",
  autorizar(...rolesRevisionLectura),
  controladorDetalleAspecto.obtenerRevisionTecnica
);

// ======================================================
// PERIODOS Y GESTIONES
// ======================================================

router.post(
  "/empresas/:empresaId/periodos",
  autorizar(...rolesEvaluacion),
  controladorPeriodosEvaluacion.abrir
);

router.get(
  "/periodos/:periodoId/gestiones",
  autorizar(...rolesLectura),
  controladorGestionesSgsst.listar
);

router.post(
  "/periodos/:periodoId/gestiones",
  autorizar(...rolesEvaluacion),
  controladorGestionesSgsst.crear
);

router.get(
  "/gestiones/:gestionId/participantes",
  autorizar(...rolesEvaluacion),
  controladorParticipantesGestion.listar
);

router.get(
  "/gestiones/:gestionId/participantes-disponibles",
  autorizar(...rolesEvaluacion),
  controladorParticipantesGestion.listarDisponibles
);

router.post(
  "/gestiones/:gestionId/participantes",
  autorizar(...rolesEvaluacion),
  controladorParticipantesGestion.agregar
);

router.patch(
  "/gestiones/:gestionId/participantes/:participanteId",
  autorizar(...rolesEvaluacion),
  controladorParticipantesGestion.actualizar
);

router.post(
  "/gestiones/:gestionId/participantes/:participanteId/retirar",
  autorizar(...rolesEvaluacion),
  controladorParticipantesGestion.retirar
);

router.get(
  "/gestiones/:gestionId/preparacion-finalizacion",
  autorizar(...rolesEvaluacion),
  controladorFinalizacionGestion.preparar
);

router.post(
  "/gestiones/:gestionId/finalizar",
  autorizar(...rolesEvaluacion),
  controladorFinalizacionGestion.finalizar
);

router.post(
  "/gestiones/:gestionId/invalidar",
  autorizar(...rolesInvalidacion),
  controladorGestionesSgsst.invalidar
);

// ======================================================
// EVALUACIONES
// ======================================================

router.put(
  "/gestiones/:gestionId/evaluaciones",
  autorizar(...rolesEvaluacion),
  controladorEvaluacionesAspecto.guardarLote
);

router.delete(
  "/gestiones/:gestionId/evaluaciones/:aspectoId",
  autorizar(...rolesEvaluacion),
  controladorEvaluacionesAspecto.eliminarBorrador
);

// ======================================================
// NO APLICA Y APROBACIÓN DE GESTIONES
// ======================================================

router.get(
  "/periodos/:periodoId/no-aplica",
  autorizar(...rolesControlEvaluacion),
  controladorNoAplica.listarPeriodo
);

router.post(
  "/no-aplica/:decisionId/decision",
  autorizar(RolUsuario.COORDINADOR),
  controladorNoAplica.decidir
);

router.get(
  "/periodos/:periodoId/aprobaciones-gestion",
  autorizar(...rolesControlEvaluacion),
  controladorAprobacionesGestion.listarPeriodo
);

router.post(
  "/aprobaciones-gestion/:aprobacionId/decision",
  autorizar(...rolesAdministrador),
  controladorAprobacionesGestion.decidir
);

// ======================================================
// EVIDENCIAS
// ======================================================

router.post(
  "/evaluaciones/:evaluacionId/evidencias",
  autorizar(...rolesEvaluacion),
  controladorEvidenciasEvaluacion.crear
);

router.put(
  "/evidencias/:evidenciaId",
  autorizar(...rolesEvaluacion),
  controladorEvidenciasEvaluacion.actualizar
);

router.delete(
  "/evidencias/:evidenciaId",
  autorizar(...rolesEvaluacion),
  controladorEvidenciasEvaluacion.desactivar
);

// ======================================================
// REVISIONES TÉCNICAS
// ======================================================

router.get(
  "/periodos/:periodoId/revisiones-tecnicas",
  autorizar(...rolesRevisionLectura),
  controladorRevisionesTecnicas.listarPeriodo
);

router.post(
  "/revisiones-tecnicas/:revisionId/resolver",
  autorizar(...rolesRevisionResolucion),
  controladorRevisionesTecnicas.resolver
);

export default router;
