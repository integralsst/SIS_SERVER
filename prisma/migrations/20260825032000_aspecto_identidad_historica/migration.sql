-- 5G-A: identidad histórica transversal de los aspectos.
ALTER TABLE `aspectos`
  ADD COLUMN `identidadHistorica` VARCHAR(36) NULL;

-- Para datos existentes se conserva el mejor linaje inferible antes de 5G-A.
-- La clave usa toda la jerarquía funcional para evitar colisiones entre
-- estándares/aspectos con nombres o códigos repetidos en categorías distintas.
CREATE TEMPORARY TABLE `_tmp_aspecto_identidad_historica` (
  `clave` VARCHAR(768) NOT NULL,
  `identidadHistorica` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`clave`)
);

INSERT INTO `_tmp_aspecto_identidad_historica` (`clave`, `identidadHistorica`)
SELECT DISTINCT
  CONCAT(
    TRIM(cp.`codigo`),
    '::',
    COALESCE(NULLIF(TRIM(ce.`codigo`), ''), TRIM(ce.`nombre`)),
    '::',
    COALESCE(NULLIF(TRIM(e.`codigo`), ''), TRIM(e.`nombre`)),
    '::',
    COALESCE(NULLIF(TRIM(a.`codigo`), ''), TRIM(a.`nombre`))
  ) AS `clave`,
  UUID() AS `identidadHistorica`
FROM `aspectos` a
INNER JOIN `estandares` e ON e.`id` = a.`estandarId`
INNER JOIN `categorias_estandar` ce ON ce.`id` = e.`categoriaEstandarId`
INNER JOIN `ciclos_phva` cp ON cp.`id` = ce.`cicloPhvaId`;

UPDATE `aspectos` a
INNER JOIN `estandares` e ON e.`id` = a.`estandarId`
INNER JOIN `categorias_estandar` ce ON ce.`id` = e.`categoriaEstandarId`
INNER JOIN `ciclos_phva` cp ON cp.`id` = ce.`cicloPhvaId`
INNER JOIN `_tmp_aspecto_identidad_historica` t
  ON t.`clave` = CONCAT(
    TRIM(cp.`codigo`),
    '::',
    COALESCE(NULLIF(TRIM(ce.`codigo`), ''), TRIM(ce.`nombre`)),
    '::',
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
