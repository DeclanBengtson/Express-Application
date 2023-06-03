var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");


const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');
require("dotenv").config();
const options = require("./knexfile.js");
const knex = require('knex')(options);
const cors = require('cors');

const { attachPaginate } = require('knex-paginate');
attachPaginate();


var moviesRouter = require("./routes/movies");
var peopleRouter = require("./routes/people");
var usersRouter = require("./routes/user");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
req.db = knex;
next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument))
app.use("/movies", moviesRouter);
app.use("/people", peopleRouter);
app.use("/user", usersRouter);
app.use('/', swaggerUI.serve, swaggerUI.setup(swaggerDocument, options))

app.get("/knex", function (req, res, next) {
  req.db.raw("SELECT VERSION()")
    .then((version) => console.log(version[0][0]))
    .catch((err) => {
      console.log(err);
      throw err;
    });

  res.send("Version Logged successfully");
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});


module.exports = app;
