const bcrypt = require("bcryptjs");

const helpers = {};

helpers.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return hash;
};

helpers.matchPassword = async (password, savedPassword) => {
  try {
    return await bcrypt.compare(password, savedPassword);
  } catch (e) {
    console.log(e);
  }
};

const jwt = require("jsonwebtoken");
helpers.verifyToken = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      console.log("!req.headers.authorization");
      return res.status(401).send("Unauhtorized Request");
    }
    let token = req.headers.authorization.split(" ")[1];
    // console.log(token);
    if (token === "null") {
      console.log("token === 'null'");
      return res.status(401).send("Unauhtorized Request");
    }

    const payload = await jwt.verify(token, process.env.TOKEN_KEY);
    console.log("=================payload===================");
    console.table(payload);
    console.log("==================payload==================");
    if (!payload) {
      console.log("!payload", payload);
      return res.status(401).send("Unauhtorized Request");
    }

    if (req.userId != undefined) {
      console.log("===================a=================");
      console.log(req.userId);
      console.log("===================a=================");
    }
    req.userId = payload._id;
    next();
  } catch (e) {
    console.log(e);
    return res.status(401).send("Unauhtorized Request");
  }
};

helpers.verifyTokenArgument = async (token) => {
  try {
    // console.log(token);
    if (token == undefined) {
      return "Unauhtorized Request";
    }
    // token = req.headers.authorization.split(" ")[1];
    if (token === "null") {
      return "Unauhtorized Request";
    }

    const payload = await jwt.verify(token, process.env.TOKEN_KEY);
    // console.log('=================payload===================');
    // console.log(payload);
    // console.log('==================payload==================');
    if (!payload) {
      return "Unauhtorized Request";
    }

    return "OK";
  } catch (e) {
    //console.log(e)
    return "Unauhtorized Request";
  }
};
module.exports = helpers;
