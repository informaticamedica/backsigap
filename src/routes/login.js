const express = require("express");
const router = express.Router();

const helpers = require("../lib/helpers");
const { pool } = require("../database");

const jwt = require("jsonwebtoken");

router.get("/signin", async (req, res) => {
  res.send("signin");
  console.log("estoy aca");
});
router.get("/signin/a", helpers.verifyToken, async (req, res) => {
  res.send("signinSecret");
});

router.post("/signin", async (req, res) => {
  const { user, pass } = req.body;
  //  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiaWF0IjoxNjIwMTcyOTE0LCJleHAiOjE2MjAyNTkzMTR9.8UIUtQX4kHh2jcOsr6-U5fOPf1hFXgXR40ZO2Yxcoe4
  const usuarios = await pool.query(
    "SELECT * FROM usuariosAtlas WHERE usuario = ?",
    [user]
  );
  console.log("================pool.query(SELECT * FROM====================");
  // console.log(rows,rows[0]);
  console.log("===============pool.query(SELECT * FROM=====================");
  if (usuarios.length > 0) {
    const Usuario = usuarios[0];
    const validPassword = await helpers.matchPassword(
      pass,
      Usuario.contrasenia
    );
    if (validPassword && Usuario.activo) {
      const token = jwt.sign({ id: Usuario.id }, process.env.TOKEN_KEY, {
        expiresIn: 86400, // 24 hrs
      });
      res.status(200).json({ token, nombre: Usuario.nombre });
    } else if (!validPassword) {
      res.status(406).json({ error: "Contraseña incorrecta" });
    } else if (!Usuario.activo) {
      res.status(406).json({ error: "Usuario deshabilitado" });
    }
  } else {
    res.status(406).json({ error: "Usuario incorrecto" });
  }
});

router.put("/signup", async (req, res) => {
  const { user, pass } = req.body;
  contrasenia = await helpers.encryptPassword(pass);

  // Saving in the Database
  try {
    //UPDATE `usuarios` SET `activo` = '1' WHERE `usuarios`.`id` = 2
    const result = await pool.query(
      " UPDATE usuariosAtlas SET activo=0,contrasenia=? WHERE usuario=?",
      [contrasenia, user]
    );
    console.log(req.body, result);

    console.log({ contrasenia, user });

    // res.status(200).json({contrasenia,user})
    res.status(200).json(result);
  } catch (error) {
    console.log("============error========================");
    console.log(error);
    console.log("error.code", error.code);
    console.log("============error========================");

    if (error.code == "ER_DUP_ENTRY") res.status(406).json(error);
  }
});
router.post("/signup", async (req, res) => {
  const { user, pass, nombre } = req.body;
  contrasenia = await helpers.encryptPassword(pass);
  const newUser = {
    usuario: user,
    contrasenia,
    nombre,
    activo: false,
  };
  // Saving in the Database
  try {
    const result = await pool.query(
      "INSERT INTO usuariosAtlas SET ? ",
      newUser
    );
    console.log(req.body, result);
    res.status(200).json(result);
  } catch (error) {
    console.log("============error========================");
    console.log(error);
    console.log("error.code", error.code);
    console.log("============error========================");

    if (error.code == "ER_DUP_ENTRY") res.status(406).json(error);
  }
});

router.post("/signin/api", async (req, res) => {
  const { user, pass } = req.body;
  //  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiaWF0IjoxNjIwMTcyOTE0LCJleHAiOjE2MjAyNTkzMTR9.8UIUtQX4kHh2jcOsr6-U5fOPf1hFXgXR40ZO2Yxcoe4
  const usuarios = await pool.query(
    "SELECT * FROM usuariosAtlas WHERE usuario = ?",
    [user]
  );
  console.log("================pool.query(SELECT * FROM====================");
  // console.log(rows,rows[0]);
  console.log("===============pool.query(SELECT * FROM=====================");
  if (usuarios.length > 0) {
    const Usuario = usuarios[0];
    const validPassword = await helpers.matchPassword(
      pass,
      Usuario.contrasenia
    );
    if (validPassword && Usuario.activo) {
      const token = jwt.sign({ id: Usuario.id }, process.env.TOKEN_KEY, {
        expiresIn: 86400, // 24 hrs
      });
      // res.status(200);
      res.status(200).render("cargarTabla", { title: "Cargar tabla " });
      // res.header("authorization", "Bearer " + token);
      // res.redirect("../datos/cargarTabla/" + token);
      //   res.status(200).json({ token, nombre: Usuario.nombre });
    } else if (!validPassword) {
      res.status(406).json({ error: "Contraseña incorrecta" });
    } else if (!Usuario.activo) {
      res.status(406).json({ error: "Usuario deshabilitado" });
    }
  } else {
    res.status(406).json({ error: "Usuario incorrecto" });
  }
});

router.get("/", async (req, res) => {
  // const datos = extraerDatos();
  // res.json(datos)
  // let ñaña = [];
  res.render("index", {
    title: "Login API",
  });
  // console.log(ñaña);
});

// router.get("/cargarTabla/:token", async (req, res) => {
//   // console.log(req.body, req.headers);
//   token = req.params.token;
//   const TOKEN = await helpers.verifyTokenArgument(token);
//   if (TOKEN == "OK") {
//     res.status(200).render("cargarTabla", { title: "Cargar tabla " });
//   } else res.status(401).send(TOKEN);
// });

module.exports = router;
