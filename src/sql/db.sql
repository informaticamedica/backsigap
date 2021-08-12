CREATE DATABASE db_ATLAS;

USE db_ATLAS;

-- TABLE USER
-- all pasword wil be encrypted using SHA1
CREATE TABLE usuariosAtlas (
  id INT(11) NOT NULL PRIMARY KEY,
  usuario VARCHAR(32) NOT NULL,
  contrasenia VARCHAR(60) NOT NULL,
  nombre VARCHAR(100) NOT NULL
);

ALTER TABLE
  usuariosAtlas
ADD
  PRIMARY KEY (id);

ALTER TABLE
  usuariosAtlas
MODIFY
  id INT(11) NOT NULL AUTO_INCREMENT,
  AUTO_INCREMENT = 1;

DESCRIBE usuariosAtlas;

INSERT INTO
  users (id, username, password, fullname)
VALUES
  (1, 'john', 'password1', 'John Carter');

SELECT
  *
FROM
  users;

CREATE TABLE bht0cyqr3dadboamg5bv.indicadores (
  id INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  D_UGL VARCHAR(200) NULL,
  N_Prestador INT NULL,
  D_Prestador VARCHAR(200) NULL,
  N_SAP INT NULL,
  Prom_Capitas FLOAT NULL,
  Egresos_totales INT NULL,
  Prom_estadias FLOAT NULL,
  Dec_Prom_estadias FLOAT NULL,
  Reingresos_72hs FLOAT NULL,
  Dec_Reingresos_72hs FLOAT NULL,
  Por_Mortalidad FLOAT NULL,
  Dec_Por_Mortalidad FLOAT NULL,
  Por_Ocupacion FLOAT NULL,
  Dec_Por_Ocupacion FLOAT NULL,
  Quejas_Reclamos INT NULL,
  Dec_Quejas_Reclamos FLOAT NULL,
  Camas_operativas_1000CAP FLOAT NULL,
  Dec_Camas_operativas_1000CAP FLOAT NULL,
  Dec_Asistencial  FLOAT NULL,
  Fac_Inter_Rel_Capita  FLOAT NULL,
  Dec_Fac_Inter_Rel_Capita  FLOAT NULL,
  Inter_1000_Capita FLOAT NULL,
  Dec_Inter_1000_Capita FLOAT NULL,
  Fact_OP FLOAT NULL,
  Dec_Fact_OP FLOAT NULL,
  Por_OP_Egresos FLOAT NULL,
  Dec_Por_OP_Egresos FLOAT NULL,
  Cant_Rech_Capita_1000 FLOAT NULL,
  Dec_Cant_Rech_Capita_1000 FLOAT NULL,
  Dec_Fact FLOAT NULL,
  Dec_Global FLOAT NULL
) ENGINE = InnoDB;


