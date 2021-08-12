const express = require("express");
const morgan = require("morgan");
const path = require("path");
// const exphbs = require('express-handlebars');
const session = require("express-session");
const validator = require("express-validator");
const passport = require("passport");
// const flash = require('connect-flash');
const MySQLStore = require("express-mysql-session")(session);
const bodyParser = require("body-parser");
const cors = require("cors");
const hbs = require("express-handlebars");
var HBS = require("hbs");
require("handlebars-form-helpers").register(HBS.handlebars);
const { database } = require("./keys");
require("dotenv").config();
// Intializations
const app = express();
// require('./lib/passport');

//views
app.engine(
  "hbs",
  hbs({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layouts",
  })
);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// Settings
app.set("port", process.env.PORT || 4000);
app.use(cors());
// app.set('views', path.join(__dirname, 'views'));
// app.engine('.hbs', exphbs({
//   defaultLayout: 'main',
//   layoutsDir: path.join(app.get('views'), 'layouts'),
//   partialsDir: path.join(app.get('views'), 'partials'),
//   extname: '.hbs',
//   helpers: require('./lib/handlebars')
// }))
// app.set('view engine', '.hbs');

// Middlewares
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
  session({
    secret: process.env.TOKEN_KEY,
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(database),
  })
);
// app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// app.use(validator());

// Global variables
app.use((req, res, next) => {
  // app.locals.message = req.flash('message');
  // app.locals.success = req.flash('success');
  app.locals.user = req.user;
  next();
});

// Routes
app.use(require("./routes/index"));
app.use("/api/login", require("./routes/login"));
app.use("/api/datos", require("./routes/datos"));
// app.use(require('./routes/authentication'));
// app.use('/links', require('./routes/links'));

// Public
app.use(express.static(path.join(__dirname, "public")));

// Starting
app.listen(app.get("port"), () => {
  console.log("Server en http://localhost:" + app.get("port"));
});
