import { RolUsuario } from "@prisma/client";
import { Router } from "express";

import { controladorContextoEvaluacion } from "../controllers/evaluacion/contexto-evaluacion.controller";
import { controladorDetalleAspecto } from "../controllers/evaluacion/detalle-aspecto.controller";
import { controladorEvidenciasEvaluacion } from "../controllers/evaluacion/evidencias-evaluacion.controller";
import { controladorEvaluacionesAspecto } from "../controllers/evaluacion/evaluaciones-aspecto.controller";
import { controladorGestionesSgsst } from "../controllers/evaluacion/gestiones-sgsst.controller";
import { controladorPeriodosEvaluacion } from "../controllers/evaluacion/periodos-evaluacion.controller";
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
  RolUsuario.ADMIN_CLIENTE,
  RolUsuario.USUARIO_CLIENTE,
];

const rolesEvaluacion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
  RolUsuario.PROFESIONAL,
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
];

const rolesRevisionResolucion = [
  RolUsuario.SUPERADMIN,
  RolUsuario.PROPIETARIO,
  RolUsuario.ADMIN,
];

router.use(autenticar);

// ======================================================
// CONTEXTO Y DETALLE
// ======================================================

router.get(
  "/empresas/:empresaId/contexto",
  autorizar(...rolesLectura),
  controladorContextoEvaluacion.obtener
);

router.get(
  "/empresas/:empresaId/tareas/:tareaId/detalle",
  autorizar(...rolesLectura),
  controladorDetalleAspecto.obtener
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

router.post(
  "/gestiones/:gestionId/finalizar",
  autorizar(...rolesEvaluacion),
  controladorGestionesSgsst.finalizar
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
