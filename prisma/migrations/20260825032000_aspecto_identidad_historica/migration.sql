-- 5G-A: identidad histórica transversal de los aspectos.
ALTER TABLE `aspectos`
  ADD COLUMN `identidadHistorica` VARCHAR(36) NULL;

-- Para datos existentes se conserva el mejor linaje inferible antes de 5G-A:
-- estándar (código/nombre) + aspecto (código/nombre). Las nuevas clonaciones
-- conservarán la identidad explícita y ya no dependerán de esta heurística.
CREATE TEMPORARY TABLE `_tmp_aspecto_identidad_historica` (
  `clave` VARCHAR(512) NOT NULL,
  `identidadHistorica` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`clave`)
);

INSERT INTO `_tmp_aspecto_identidad_historica` (`clave`, `identidadHistorica`)
SELECT DISTINCT
  CONCAT(
    COALESCE(NULLIF(TRIM(e.`codigo`), ''), TRIM(e.`nombre`)),
    '::',
    COALESCE(NULLIF(TRIM(a.`codigo`), ''), TRIM(a.`nombre`))
  ) AS `clave`,
  UUID() AS `identidadHistorica`
FROM `aspectos` a
INNER JOIN `estandares` e ON e.`id` = a.`estandarId`;

UPDATE `aspectos` a
INNER JOIN `estandares` e ON e.`id` = a.`estandarId`
INNER JOIN `_tmp_aspecto_identidad_historica` t
  ON t.`clave` = CONCAT(
    COALESCE(NULLIF(TRIM(e.`codigo`), ''), TRIM(e.`nombre`)),
    '::',
    COALESCE(NULLIF(TRIM(a.`codigo`), ''), TRIM(a.`nombre`))
  )
SET a.`identidadHistorica` = t.`identidadHistorica`
WHERE a.`identidadHistorica` IS NULL;

DROP TEMPORARY TABLE `_tmp_aspecto_identidad_historica`;

ALTER TABLE `aspectos`
  MODIFY `identidadHistorica` VARCHAR(36) NOT NULL;

CREATE INDEX `Aspecto_identidadHistorica_idx`
  ON `aspectos`(`identidadHistorica`);

CREATE UNIQUE INDEX `uq_aspecto_version_identidad_historica`
  ON `aspectos`(`versionSupermatrizId`, `identidadHistorica`);
