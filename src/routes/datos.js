const express = require("express");
const router = express.Router();
const helpers = require("../lib/helpers");
const XLSX = require("xlsx");

const { pool, con, mysql2 } = require("../database");
const { database } = require("../../src/keys");
const extraerDatos = () => {
  const nombreArchivo = "Dashboard Final.xlsx";
  const nombreHoja = "Datos (2)";
  const rutaArchivo = __dirname + "/" + nombreArchivo;
  const workbook = XLSX.readFile(rutaArchivo);
  const sheet_name_list = workbook.SheetNames;
  const sheet = workbook.Sheets[sheet_name_list.constructor(nombreHoja)[0]];
  const xlData = XLSX.utils.sheet_to_json(sheet);

  const Data = xlData.map((b) => {
    let aux = {};
    key = Object.keys(b).map((d) => d.replace("\n", "").replace("\r", " "));
    let i = 0;
    for (clave in b) {
      aux[key[i]] = b[clave];
      i++;
    }

    return aux;
  });
  // console.table(Data);
  return Data;
};

router.get("/auditorias", helpers.verifyToken, async (req, res) => {
  try {
    const Auditorias = await pool.query(`
      select 
        A.idauditoria, 
        P.descripcion as Prestador, 
        DATE_FORMAT(A.fechainicio, "%d/%m/%Y") as 'Fecha de Auditoría', 
        P.CUIT, 
        P.SAP, 
        U.descripcion as UGL, 
        E.descripcion as Estado 
      from Auditorias A, Prestadores P, UGL U, EstadosAuditoria E 
      where 
        A.idprestador = P.idprestador and 
        U.idugl = P.idugl and 
        E.idestadoauditoria = A.idestadoauditoria
      order by A.fechainicio DESC
    `);
    // console.log(Auditorias);
    res.status(200).json(Auditorias);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

router.get(
  "/auditorias/flujo-estados",
  helpers.verifyToken,
  async (req, res) => {
    try {
      const flujoDeEstados = await pool.query(`
      select 
        FE.* 
      from FlujoEstadosAuditoria FE 
      order by FE.idestadoauditoriadesde, FE.idestadoauditoriahasta ASC
    `);
      res.status(200).json(flujoDeEstados);
    } catch (error) {
      console.error(error);
      res.status(400).json(error);
    }
  }
);
router.get("/auditorias/estados", helpers.verifyToken, async (req, res) => {
  try {
    const estados = await pool.query(`
      select 
        E.* 
      from EstadosAuditoria E 
      order by E.idestadoauditoria ASC
    `);
    res.status(200).json(estados);
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});

router.get("/prestadores", helpers.verifyToken, async (req, res) => {
  try {
    const Prestadores = await pool.query("select * from Prestadores");
    res.json(Prestadores);
  } catch (error) {
    console.error(error);
    res.json({});
  }
});

router.put(
  "/auditorias/:idAuditoria/estado/:idEstado",
  helpers.verifyToken,
  async (req, res) => {
    const connection = await mysql2.createConnection(database);
    const idAuditoria = req.params.idAuditoria;
    const idEstado = req.params.idEstado;
    try {
      const actualizarEstadoAuditoria = `
    UPDATE Auditorias 
    set idestadoauditoria=${idEstado} 
    where idauditoria = ${idAuditoria}
  `;

      await connection.execute(
        "SET TRANSACTION ISOLATION LEVEL READ COMMITTED"
      );
      // console.log("Finished setting the isolation level to read committed");

      await connection.beginTransaction();

      await connection.execute(actualizarEstadoAuditoria);
      await connection.commit();
      res.status(200).json({});
    } catch (error) {
      await connection.rollback();
      console.error(error);
      res.json({});
    } finally {
      await connection.destroy();
    }
  }
);

router.get("/planificarauditoria", helpers.verifyToken, async (req, res) => {
  try {
    const Prestadores = await pool.query(`
      SELECT P.idprestador,
        P.descripcion as Prestador, 
        P.SAP, 
        P.CUIT, 
        CONCAT(RIGHT(CONCAT('00', P.idugl),2), ' - ', U.descripcion) as UGL
      FROM Prestadores P INNER JOIN UGL U ON P.idugl = U.idugl
      where P.activo=1
    `);

    const TipoInforme = await pool.query(`
      Select 
        idinforme, 
        descripcion, 
        versionactual 
      from Informes 
      where activo=1
    `);

    const idsTipoInformeAux = new Set(TipoInforme.map((inf) => inf.idinforme));
    const idsTipoInforme = [...idsTipoInformeAux].join(",");
    const verActTipoInformeAux = new Set(
      TipoInforme.map((inf) => inf.versionactual)
    );
    const verActTipoInforme = [...verActTipoInformeAux].join(",");

    // console.log("TipoInforme",TipoInforme);
    // console.log("idsTipoInforme",`${idsTipoInforme}`);
    // console.log("verActTipoInforme",`${verActTipoInforme}`);

    const Usuarios = await pool.query(`
      select 
        U.legajo, 
        U.apellido, 
        U.nombre , 
        U.idusuario,  
        P.descripcion as Profesion     
      from Usuarios U 
        INNER JOIN UsuarioProfesion UP ON U.idusuario = UP.idusuario     
        INNER JOIN Profesiones P ON P.idprofesion = UP.idprofesion    
      where U.activo=1 and UP.activo=1 and P.activo = 1    
      order by U.apellido,U.nombre
    `);

    const Areas = await pool.query(`
      select SI.idinforme, SI.versioninforme, S.idseccion, S.descripcion
      from SeccionInforme SI 
        INNER JOIN Secciones S ON SI.idseccion = S.idseccion
      where SI.activo = 1 and S.activo=1
      order by SI.idinforme, SI.versioninforme, S.descripcion
    `);

    const Secciones = await pool.query(`
      SELECT 
        S.idseccion, 
        S.descripcion,
        (SELECT count(*) FROM Secciones I WHERE I.idseccionmadre=S.idseccion AND (I.guia=1 OR I.informe=1)) as SubSecciones,
        (
          SELECT COUNT(*) 
          FROM ComponenteSeccion CS 
            INNER JOIN Componentes C ON CS.idcomponente = C.idcomponente 
          WHERE 
            CS.idseccion=S.idseccion and 
            C.activo=1 and C.editable=1
        ) as Editables,
        SI.idinforme, 
        SI.versioninforme
      FROM SeccionInforme SI 
        INNER JOIN Secciones S ON SI.idseccion = S.idseccion
      WHERE 
        SI.idinforme in (${idsTipoInforme}) AND 
        SI.versioninforme in (${verActTipoInforme}) AND 
        SI.activo=1 AND
        (S.guia = 1 or S.informe=1) AND
        S.activo=1
      ORDER BY SI.orden
    `);

    // console.log("Secciones",Secciones);
    // console.log("-------------------------------");
    // console.log("-------------------------------");
    // console.log("-------------------------------");
    // console.log("Secciones con SubSecciones",Secciones.filter(s => s.SubSecciones));

    const idSubSecciones = Secciones.filter((s) => s.SubSecciones).map(
      (s) => s.idseccion
    );

    const subSecciones = await pool.query(`
      SELECT 
        S.idseccionmadre,
        S.idseccion, 
        S.descripcion,
        (SELECT count(*) FROM Secciones I WHERE I.idseccionmadre=S.idseccion AND (I.guia=1 OR I.informe=1)) as SubSecciones,
        (
          SELECT COUNT(*) 
          FROM ComponenteSeccion CS 
            INNER JOIN Componentes C ON CS.idcomponente = C.idcomponente 
          WHERE 
            CS.idseccion=S.idseccion and 
            C.activo=1 and C.editable=1
        ) as Editables
      FROM Secciones S 
      WHERE 
        S.idseccionmadre in (${idSubSecciones}) AND
        (S.guia = 1 or S.informe=1) AND
        S.activo=1
      ORDER BY S.orden
    `);

    // console.log("*************************");
    // console.log("*************************");
    // console.log("*************************");
    // console.log("subSecciones",subSecciones);

    const arbolSecciones = Secciones.map((s) => {
      return {
        ...s,
        SubSecciones: subSecciones.filter(
          (subs) => subs.idseccionmadre == s.idseccion
        ),
      };
    });
    console.log("****-------------------------***********");
    // console.log("arbolSecciones",JSON.parse(JSON.stringify(arbolSecciones)));
    // const Areas = await pool.query(`
    //   select distinct GV.idguia, GV.versionguia, S.idareaauditoria, A.descripcion
    //   FROM GuiaVersion GV
    //     INNER JOIN SeccionesGuia SG ON GV.idguia = SG.idguia AND GV.versionguia = SG.versionguia
    //     INNER JOIN Secciones S ON SG.idseccion = S.idseccion
    //     INNER JOIN AreasAuditoria A ON S.idareaauditoria = A.idareaauditoria
    //   WHERE GV.activo =1 and SG.activo = 1 and S.activo = 1 and A.activo = 1
    //   ORDER BY GV.idguia, GV.versionguia, A.descripcion
    // `);

    // const Areas = await pool.query(`
    //   select
    //     idareaauditoria,
    //     descripcion
    //   from AreasAuditoria
    //   where activo=1
    //   order by descripcion
    // `);

    res
      .status(200)
      .json({ Prestadores, TipoInforme, Usuarios, Areas, arbolSecciones });
  } catch (error) {
    console.error(error);
    res.status(400).json(error);
  }
});
function formatDate(date) {
  var d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + (d.getDate() + 1),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [year, month, day].join("-");
}
router.post("/planificarauditoria", helpers.verifyToken, async (req, res) => {
  const {
    prestadores,
    fechainicio,
    TipoInforme,
    VERSIONGUIA,
    observaciones,
    integrantes,
  } = req.body;
  // console.log(req.body);

  const connection = await mysql2.createConnection(database);

  await connection.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  // console.log("Finished setting the isolation level to read committed");

  await connection.beginTransaction();
  try {
    const Qauditoria = `
      INSERT INTO Auditorias (
        idprestador, 
        fechainicio, 
        fechafin, 
        idestadoauditoria, 
        idinforme, 
        versioninforme,
        observaciones,
        activo
        )
      VALUES (
          ${prestadores}, 
          ${fechainicio !== "" ? "'" + formatDate(fechainicio) + "'" : "NULL"},
          NULL, 
          1, 
          ${TipoInforme}, 
          ${VERSIONGUIA},
          '${observaciones}',
          1
        )
    `;
    // console.log("Qauditoria", Qauditoria);
    const [auditoria] = await connection.execute(Qauditoria);

    const guardarArbolSecciones = `
    INSERT INTO EquipoAuditoria (idusuario, idauditoria, idseccion, activo) 
    VALUES (#idusuario1#, #idauditoria1#, #idseccion1#, 1), 
     (#idusuario2#, #idauditoria2#, #idseccion2#, 1),
     (#idusuario3#, #idauditoria3#, #idseccion3#, 1);
    `;
    const Integrantes = integrantes.filter(
      (a) => a.areas != "" && a.areas != ""
    );
    if (Integrantes.length === 0) {
      res.status(200).json({ auditoria, Integrantes: [] });
    } else {
      const QIntegrantes = `
      INSERT INTO EquipoAuditoria 
        (idusuario, idauditoria, idareaauditoria,activo)
      VALUES
      ${Integrantes.map(
        (i) => `
          (
            ${i.usuarios},
            ${auditoria.insertId},
            ${i.areas},
            1
          )
        `
      )}
    `;

      // console.log("auditoria", auditoria);
      // console.log("*********************QIntegrantes*****************");
      // console.log(QIntegrantes);
      // console.log("**************************************");
      const IntegrantesInsertados = await connection.execute(QIntegrantes);
      // console.log("******************Integrantes********************");
      // console.log(IntegrantesInsertados);
      // console.log("**************************************");
      res.status(200).json({ auditoria, Integrantes: IntegrantesInsertados });
    }

    await connection.commit();

    // res.status(200).json({});
  } catch (error) {
    connection.rollback();
    console.error(error);
    res.status(400).json(error);
  } finally {
    await connection.destroy();
  }
});

router.get("/auditoria/:idauditoria", helpers.verifyToken, async (req, res) => {
  const { idauditoria } = req.params;

  const connection = await mysql2.createConnection(database);

  await connection.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");

  await connection.beginTransaction();

  try {
    const [[Auditoria]] = await connection.execute(`
      select 
        A.idauditoria,
        A.fechainicio,
        A.idestadoauditoria,
        A.idinforme, 
        A.versioninforme,
        P.descripcion as Prestador,
        P.domicilio,
        P.localidad,
        P.idprovincia,
        P.telefono,
        P.email,
        P.idugl,
        P.CUIT,
        EA.descripcion as EstadoAuditoria,
        Prov.descripcion as ProvinciaPrestador,
        CONCAT(RIGHT(CONCAT('00', P.idugl),2), ' - ', U.descripcion) as UGL
      from Auditorias A
        INNER JOIN Prestadores P ON P.idprestador = A.idprestador
        INNER JOIN EstadosAuditoria EA ON EA.idestadoauditoria = A.idestadoauditoria
        INNER JOIN Provincias Prov ON Prov.idprovincia = P.idprovincia
        INNER JOIN UGL U ON U.idugl = P.idugl
      where A.idauditoria = ${idauditoria}
    `);

    const [seccionesGuia] = await connection.execute(`
      select 
        S.idseccion,
        S.descripcion,
        (select count(I.idseccion) from Secciones I where I.idseccionmadre = S.idseccion) as Secciones,
        (select O.orden from Secciones O where O.idseccion=S.idseccion) as Orden 
          from Secciones S
        where S.activo = 1 AND
      S.idseccionmadre in (select SI.idseccion from SeccionInforme SI where SI.idinforme=${Auditoria?.idinforme} and SI.versioninforme=${Auditoria.versioninforme} and SI.activo=1)
      order by 4
    `);

    const [componente] = await connection.execute(`
      SELECT 
        CS.idseccion, 
        C.idcomponente, 
        C.texto,
        C.idfuente, 
        CR.descripcion, 
        O.descripcion as Observacion,
        R.descripcion as Recomendacion, 
        IFNULL(Q.descripcion,'') as Requisito, 
        I.idtipoeval,
        I.iditem,
        TE.componente,
        N.descripcion as Normativa
      FROM ComponenteSeccion CS 
        INNER JOIN Componentes C ON CS.idcomponente=C.idcomponente
        LEFT JOIN Items I ON C.iditem=I.iditem
        LEFT JOIN Criterios CR ON CR.idcriterio=I.idcriterio
        LEFT JOIN Observaciones O ON O.idobservacion=I.idobservacion and O.activo=1
        LEFT JOIN Recomendaciones R ON R.idrecomendacion = I.idrecomendacion and R.activo=1
        LEFT JOIN Requisitos Q ON Q.idrequisito=I.idrequisito and Q.activo=1
        LEFT JOIN TipoEvaluacion TE ON I.idtipoeval = TE.idtipoeval
        LEFT JOIN CriterioNormativas CN ON CR.idcriterio=CN.idcriterio and CN.activo=1
        LEFT JOIN Normativas N ON CN.idnormativa = N.idnormativa and N.activo=1
      WHERE CS.idseccion in (${seccionesGuia.map(
        (s) => s.idseccion
      )}) AND C.guia=1 
      order by CS.orden
    `);

    const [tipoEval] = await connection.execute(`
      select 
        TE.idtipoeval, 
        TEV.idvalor, 
        V.descripcion, 
        TEV.principal
      from TipoEvaluacion TE 
        INNER JOIN TipoEvaluacionValores TEV ON TE.idtipoeval = TEV.idtipoeval
        INNER JOIN Valores V ON TEV.idvalor = V.idvalor
      where TE.activo = 1 and TEV.activo=1 and V.activo=1
    `);

    // idfuente==3   -> item
    // idfuente==1   -> input
    const auxInforme = seccionesGuia.map((s) => {
      return {
        ...s,
        items: componente
          .filter((c) => c.idseccion == s.idseccion)
          .map((c) => {
            return {
              ...c,
              tipoEval: tipoEval.filter((t) => t.idtipoeval == c.idtipoeval),
            };
          }),
      };
    });

    console.log("Auditoria", Auditoria);
    console.log("seccionesGuia", auxInforme);
    console.log("1componente", componente[12]);
    console.log("tipoEval", tipoEval);
    await connection.commit();
    res.json({ Auditoria, Informe: auxInforme, items: componente });
  } catch (error) {
    connection.rollback();
  } finally {
    await connection.destroy();
  }

  try {
    // console.log("idauditoria", idauditoria);
    // const [Auditoria] = await pool.query(`
    //   select
    //     A.idauditoria,
    //     A.fechainicio,
    //     A.idestadoauditoria,
    //     A.idinforme,
    //     A.versioninforme,
    //     P.descripcion as Prestador,
    //     P.domicilio,
    //     P.localidad,
    //     P.idprovincia,
    //     P.telefono,
    //     P.email,
    //     P.idugl,
    //     P.CUIT,
    //     EA.descripcion as EstadoAuditoria,
    //     Prov.descripcion as ProvinciaPrestador,
    //     CONCAT(RIGHT(CONCAT('00', P.idugl),2), ' - ', U.descripcion) as UGL
    //   from Auditorias A
    //     INNER JOIN Prestadores P ON P.idprestador = A.idprestador
    //     INNER JOIN EstadosAuditoria EA ON EA.idestadoauditoria = A.idestadoauditoria
    //     INNER JOIN Provincias Prov ON Prov.idprovincia = P.idprovincia
    //     INNER JOIN UGL U ON U.idugl = P.idugl
    //   where A.idauditoria = ${idauditoria}
    // `);
    // console.log("Auditoria", Auditoria);
    // const Informe = await pool.query(`
    //   select S.idseccion, S.descripcion,
    //   (select count(I.idseccion) from Secciones I where I.idseccionmadre = S.idseccion) as Secciones,
    //   (select O.orden from Secciones O where O.idseccion=S.idseccion) as Orden from Secciones S
    //   where S.activo = 1 AND
    //   S.idseccionmadre in (select SI.idseccion from SeccionInforme SI where SI.idinforme=${Auditoria?.idinforme} and SI.versioninforme=${Auditoria.versioninforme} and SI.activo=1)
    //   order by 4
    // `);
    // console.log("Informe", Informe);
    // // const EstadoObservaciones = await pool.query(`
    // //   select idestadoobs, descripcion
    // //   from EstadoObservaciones
    // //   where activo=1
    // // `);
    // // console.log("*************************");
    // // console.log("Informe", Informe);
    // // console.log("*************************");
    // // console.log("lalalla", lalalla);
    // const idsecciones = Informe.filter((a) => a.Secciones != 0).map(
    //   (a) => a.idseccion
    // );
    // // console.log("idsecciones", idsecciones);
    // const queryString = (idsecciones) => `
    //   select
    //     S.idseccionmadre,
    //     S.idseccion,
    //     S.descripcion,
    //     (
    //       select count(I.idseccion)
    //       from Secciones I
    //       where I.idseccionmadre = S.idseccion
    //     ) as Secciones
    //   from Secciones S
    //   where S.activo = 1 AND
    //   S.idseccionmadre in (${idsecciones})
    //   ORDER BY S.idseccionmadre;
    // `;
    // if (idsecciones.length === 0) {
    //   const idsecciones = Informe.map((a) => a.idseccion);
    //   const Items = await pool.query(`
    //   select
    //     I.iditem,
    //     C.descripcion,
    //     TE.idtipoeval,
    //     TE.componente,
    //     ITS.idseccion,
    //     IFNULL(A.valor, '') as Valor,
    //     TE.descripcion as descripcionTipoEval
    //   from ItemSeccion ITS
    //     INNER JOIN Items I ON ITS.iditem = I.iditem
    //     INNER JOIN TipoEvaluacion TE ON I.idtipoeval = TE.idtipoeval
    //     INNER JOIN Criterios C ON C.idcriterio = I.idcriterio
    //     LEFT JOIN ItemsAuditoria A ON A.iditem = I.iditem and A.idauditoria=${idauditoria}
    //   where
    //     ITS.activo = 1 AND
    //     I.activo=1 AND
    //     TE.activo=1 AND
    //     ITS.idseccion in (${idsecciones})
    //   ORDER BY ITS.orden
    // `);
    //   const tipoEval = await pool.query(`
    //   SELECT TEV.idtipoeval, V.idvalor, V.descripcion
    //   FROM Valores V
    //     INNER JOIN TipoEvaluacionValores TEV ON V.idvalor = TEV.idvalor
    //   WHERE V.activo=1 and TEV.activo=1
    // `);
    //   // console.log("tipoEval", tipoEval);
    //   const items = Items.map((i) => {
    //     return {
    //       ...i,
    //       tipoEval: tipoEval.filter((t) => t.idtipoeval == i.idtipoeval),
    //     };
    //   });
    //   const informe = Informe.map((sec) => {
    //     return {
    //       ...sec,
    //       items: items.filter((item) => item.idseccion == sec.idseccion),
    //     };
    //   });
    //   res.status(200).json({ Auditoria, Informe: informe, items });
    // } else
    //   pool
    //     .query(queryString(idsecciones))
    //     .then((aa) => {
    //       const informeSecciones = Informe.map((i) => {
    //         // if (condition) {
    //         // console.log("///////////secciones///////////////", aa);
    //         // }
    //         const auxSecciones = aa.filter(
    //           (s) => s.idseccionmadre == i.idseccion
    //         );
    //         return {
    //           ...i,
    //           subSecciones: auxSecciones,
    //         };
    //       });
    //       console.table(Informe);
    //       return informeSecciones;
    //     })
    //     .then(async (Secciones) => {
    //       // console.log("*************informe**************");
    //       // console.log("Secciones", Secciones);
    //       // console.log("*************informe**************");
    //       const idsecciones = [];
    //       Secciones.map((i) => {
    //         idsecciones.push(i.idseccion);
    //         i.subSecciones.map((ii) => {
    //           idsecciones.push(ii.idseccion);
    //         });
    //       });
    //       const Items = await pool.query(`
    //       select CS.idseccion, C.idcomponente, I.iditem, CR.descripcion, TE.idtipoeval, TE.componente, IFNULL(CA.valor, '') as Valor
    //       from ComponenteSeccion CS
    //         INNER JOIN Componentes C ON CS.idcomponente = C.idcomponente
    //         INNER JOIN Items I ON I.iditem = C.iditem
    //         INNER JOIN TipoEvaluacion TE ON TE.idtipoeval = I.idtipoeval
    //         INNER JOIN Criterios CR ON CR.idcriterio = I.idcriterio
    //         LEFT JOIN ComponenteAuditoria CA ON CA.idauditoria=${Auditoria.idauditoria} and CA.idcomponente=C.idcomponente
    //       WHERE CS.activo=1 and I.activo=1 and CR.activo=1 and CS.idseccion in (${idsecciones})
    //       order by CS.idseccion,CS.orden`);
    //       const idItems = Items.map((item, i) => item.iditem);
    //       const observacionesyRecomendaciones = await pool.query(`
    //         SELECT
    //           C.idcomponente,
    //           C.iditem,
    //           I.idobservacion,
    //           O.descripcion as observacion,
    //           I.idrecomendacion,
    //           R.descripcion as recomendacion,
    //           N.idnormativa,
    //           N.descripcion as normativa
    //         FROM Componentes C
    //           INNER JOIN Items I ON C.iditem = I.iditem
    //           LEFT JOIN Observaciones O ON I.idobservacion = O.idobservacion
    //           LEFT JOIN Recomendaciones R ON I.idrecomendacion = R.idrecomendacion
    //           INNER JOIN Criterios E ON I.idcriterio = E.idcriterio
    //           LEFT JOIN CriterioNormativas CN ON E.idcriterio = CN.idcriterio
    //           INNER JOIN Normativas N ON CN.idnormativa = N.idnormativa
    //         WHERE
    //           I.iditem IN (${idItems}) and
    //           C.activo=1 and
    //           O.activo=1 and
    //           R.activo=1 and
    //           E.activo=1 and
    //           CN.activo=1 and
    //           N.activo=1
    //     `);
    //       // console.log(
    //       //   "observacionesyRecomendaciones",
    //       //   observacionesyRecomendaciones
    //       // );
    //       const tipoEval = await pool.query(`
    //         SELECT TEV.idtipoeval, V.idvalor, V.descripcion
    //         FROM Valores V
    //           INNER JOIN TipoEvaluacionValores TEV ON V.idvalor = TEV.idvalor
    //         WHERE V.activo=1 and TEV.activo=1
    //       `);
    //       // console.log("tipoEval", tipoEval);
    //       const items = Items.map((a) => {
    //         return {
    //           ...a,
    //           tipoEval: tipoEval.filter((b) => b.idtipoeval == a.idtipoeval),
    //           observaciones: observacionesyRecomendaciones.find(
    //             (o) => o.iditem == a.iditem
    //           ),
    //         };
    //       });
    //       // console.log("-------------------------->items", items);
    //       const Informe = Secciones.map((sec) => {
    //         return {
    //           ...sec,
    //           items: items.filter((item) => item.idseccion == sec.idseccion),
    //           subSecciones: sec.subSecciones.map((subsec) => {
    //             return {
    //               ...subsec,
    //               items: items.filter(
    //                 (item) => item.idseccion == subsec.idseccion
    //               ),
    //             };
    //           }),
    //         };
    //       });
    //       return { Informe, items };
    //     })
    //     .then(({ Informe, items }) => res.json({ Auditoria, Informe, items }));
    // console.log("*************secciones**************");
    // console.table(secciones);
  } catch (error) {
    console.error(error);
    res.json({});
  }
});

// async function doStuff(items) {
//   try {
//     const connection = await pool.getConnection();
//     try {
//       for (const item of items) {
//         await connection?.query(item);
//       }
//     } finally {
//       await connection?.release();
//     }
//   } catch (error) {
//     console.error(error);
//   }
// }

router.post("/auditoria/:idauditoria", async (req, res) => {
  const { idauditoria } = req.params;
  const { items } = req.body;
  // console.log("items", items);
  const preguntarEstado = `
  SELECT idestadoauditoria 
  from Auditorias 
  where idauditoria = ${idauditoria}
`;
  const guardarItems = `
    INSERT INTO ItemsAuditoria
      (idauditoria, iditem, valor)
    VALUES 
      ${items.map((item) => `(${idauditoria},${item.iditem},'${item.Valor}')`)}
  `;
  // console.log(guardarItems);

  const actualizarEstadoAuditoria = `
    UPDATE Auditorias 
    set idestadoauditoria=2 
    where idauditoria = ${idauditoria}
  `;

  const tipoValores = `
    SELECT 
      V.idvalor, 
      V.descripcion 
    FROM Valores V 
      INNER JOIN TipoEvaluacionValores TEV ON V.idvalor = TEV.idvalor 
    WHERE TEV.idtipoeval= ${4}`; // el 4 SI o NO

  const connection = await mysql2.createConnection(database);

  await connection.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
  // console.log("Finished setting the isolation level to read committed");

  await connection.beginTransaction();

  try {
    const [estado] = await connection.execute(preguntarEstado);
    // console.log("estado", estado);
    // console.log("estado[0].idestadoauditoria", estado[0].idestadoauditoria);
    let Items;
    // console.log(estado[0].idestadoauditoria);
    const Estado = estado[0].idestadoauditoria;

    switch (Estado) {
      case 1:
        // console.log("guardarItems", guardarItems);
        Items = await connection.execute(guardarItems);
        await connection.execute(actualizarEstadoAuditoria);
        await connection.commit();
        res.status(200).json({ Items });
        break;
      case 2:
        const itemsActuales = await connection.execute(`
        select iditem, valor 
        from ItemsAuditoria
        where idauditoria = ${idauditoria}
        `);
        // console.log("itemsActuales", itemsActuales);
        // console.log("items", items);
        Items = items.map(async (item) => {
          const itemActual = itemsActuales[0].find(
            (a) => a.iditem == item.iditem
          );
          // console.log(
          //   "itemActual.valor != item.Valor",
          //   itemActual.valor != item.Valor
          // );
          if (itemActual.valor != item.Valor) {
            // console.log("itemActual", itemActual);
            // console.log("item", item);

            const aux = await connection.execute(`
              UPDATE ItemsAuditoria
              SET valor = '${item.Valor}'
              WHERE idauditoria= ${idauditoria} AND iditem=${item.iditem};
            `);
            // console.log(" UPDATE ItemsAuditoria", aux);
          }
          // console.log(`
          //     UPDATE ItemsAuditoria
          //     SET valor = '${item.Valor}'
          //     WHERE idauditoria= ${idauditoria} AND iditem=${item.iditem}
          //   `);
        });
        await connection.commit();
        res.status(200).json({ Items });
        break;
      default:
        res.status(400).json({ error: "Esta auditoria no puede ser editada" });
        connection.rollback();
        break;
    }

    // if (estado[0].idestadoauditoria == 1) {
    // } else if (estado[0].idestadoauditoria == 2) {
    // // console.log("");

    // // console.log("estado.idestadoauditoria != 1", estado);
    // } else {
    // }

    // console.log("connection.commit");
  } catch (error) {
    connection.rollback();
    console.error(error);
    res.json({ error });
  } finally {
    await connection.destroy();
  }
});
router.get("/lala", async (req, res) => {
  // await mysql2.createConnection(database)
  const connection = await mysql2.createConnection(database);

  await connection.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");

  await connection.beginTransaction();

  try {
    const algo = await connection.execute("select * from Auditorias");
    await connection.commit();
    res.json({ algo });
  } catch (error) {
    connection.rollback();
  } finally {
    await connection.destroy();
  }
});
// router.get("/cargarTabla/:token", async (req, res) => {
// // console.log(req.body, req.headers);
// token = req.params.token;
// const TOKEN = await helpers.verifyTokenArgument(token);
// if (TOKEN == "OK") {
//     res.status(200).render("cargarTabla", { title: "Cargar tabla " });
// } else res.status(401).send(TOKEN);
// });

module.exports = router;
