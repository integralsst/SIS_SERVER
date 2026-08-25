from pathlib import Path
import re

path = Path("src/services/evaluacion/detalle-aspecto.service.ts")
text = path.read_text(encoding="utf-8")

if "servicioPeriodosEvaluacion" in text:
    print("Legacy detail already patched")
    raise SystemExit(0)

old = 'import { asegurarAccesoEmpresa } from "./acceso-evaluacion.service";\n'
new = old + 'import {\n  construirCorteAnual,\n  servicioPeriodosEvaluacion,\n} from "./periodos-evaluacion.service";\n'
if text.count(old) != 1:
    raise SystemExit("import acceso no encontrado de forma única")
text = text.replace(old, new, 1)

marker = """    const tarea =
      await prisma.supermatrizTarea.findFirst({"""
if text.count(marker) != 1:
    raise SystemExit(f"marcador tarea no encontrado de forma única: {text.count(marker)}")

insertion = """    const gestionActivaContexto =
      await prisma.gestionSgsst.findFirst({
        where: {
          empresaPeriodoId: periodo.id,
          usuarioCreadorId: usuario.usuarioId,
          estado: EstadoGestionSgsst.BORRADOR,
          valida: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          fechaGestion: true,
          tipoActividad: true,
          estado: true,
        },
      });
    const fechaCorte =
      gestionActivaContexto?.fechaGestion ??
      construirCorteAnual(anio);
    const versionAplicable =
      await servicioPeriodosEvaluacion.resolverVersionParaFecha(
        fechaCorte
      );

"""
text = text.replace(marker, insertion + marker, 1)

text, count = re.subn(
    r"versionSupermatrizId:\s*periodo\.versionSupermatrizId,",
    "versionSupermatrizId:\n            versionAplicable.id,",
    text,
    count=1,
)
if count != 1:
    raise SystemExit(f"versión anual legacy no reemplazada: {count}")

pattern = r"    const gestionActiva =\s*await prisma\.gestionSgsst\.findFirst\(\{[\s\S]*?\n    \}\);\n\n    const evaluacionBorrador = gestionActiva"
replacement = """    const gestionActiva = gestionActivaContexto;

    const evaluacionBorrador = gestionActiva"""
text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit(f"bloque gestionActiva legacy no reemplazado: {count}")

pattern = r"    const filtroAspectoHistorico: Prisma\.EvaluacionAspectoWhereInput = tarea\.aspecto\.codigo[\s\S]*?\n    };\n"
replacement = """    const filtroAspectoHistorico: Prisma.EvaluacionAspectoWhereInput = {
      aspecto: {
        identidadHistorica:
          tarea.aspecto.identidadHistorica,
      },
    };
"""
text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit(f"filtro histórico legacy no reemplazado: {count}")

pattern = r"(gestion:\s*\{\s*empresaPeriodo:\s*\{\s*empresaId,\s*\},)(\s*\.\.\.\(esCliente)"
replacement = r"\1\n            fechaGestion: {\n              lte: fechaCorte,\n            },\2"
text, count = re.subn(pattern, replacement, text, count=1)
if count != 1:
    raise SystemExit(f"corte historial legacy no reemplazado: {count}")

text, count = re.subn(
    r"(periodo:\s*\{[\s\S]*?versionSupermatriz:)\s*periodo\.versionSupermatriz,",
    r"\1\n          versionAplicable,",
    text,
    count=1,
)
if count != 1:
    raise SystemExit(f"respuesta versión legacy no reemplazada: {count}")

path.write_text(text, encoding="utf-8")
print("Legacy detail 5G patch applied")
