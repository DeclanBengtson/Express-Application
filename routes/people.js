var express = require('express');
var router = express.Router();
const authorization = require("../middleware/authorization");
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
  });

//character parser
const charactersParser = (str) => {
  if (str === "") {
    return [];
  }

  const replaced = str.replaceAll(`["`, "").replaceAll(`"]`, "");
  const split = replaced.split('","');

  return split;
};

// GET /people/{id}
router.get("/:nconst", function (req, res, next) {
  const nconst = req.params.nconst;
  const authorizationHeader = req.headers["authorization"];
  console.log(req.headers);

  // Check if nconst is invalid (e.g., empty or contains invalid characters)
  if (!nconst || !/^[a-zA-Z0-9]+$/.test(nconst)) {
    res.status(400).json({ error: true, message: "Invalid query parameters: nconst. Query parameters are not permitted." });
    return;
  }

  if (!("authorization" in req.headers)
  || !req.headers.authorization.match(/^Bearer /)){
    console.log(authorizationHeader);
    res.status(401).json({
      error: true,
      message: "Authorization header ('Bearer token') not found",
    });
    return;
  }
  //console.log(authorizationHeader);
  req.db
    .from("principals")
    .where("principals.nconst", "=", nconst)
    .join("names", "names.nconst", "=", "principals.nconst")
    .join("basics", "basics.tconst", "=", "principals.tconst")
    .select(
      "basics.primaryTitle as movieName",
      req.db.raw('CAST(basics.imdbRating AS DECIMAL(3,1)) as imdbRating'),
      "principals.tconst as movieId",
      "principals.category",
      "principals.characters",
      "names.primaryName",
      "names.birthYear",
      "names.deathYear"
    )
    .then((data) => {
      if (data.length === 0) {
        res.status(404).json({
          error: true,
          message: "Person not found in the database.",
        });
        return;
      }

      const roles = data.map((item) => ({
        movieName: item.movieName,
        movieId: item.movieId,
        category: item.category,
        characters: charactersParser(item.characters),
        imdbRating: parseFloat(item.imdbRating),
      }));

      const mapped = {
        name: data[0].primaryName,
        birthYear: data[0].birthYear,
        deathYear: data[0].deathYear,
        roles: roles,
      };
      res.status(200).json(mapped);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: true, message: "Internal server error" });
    });
});






module.exports = router;
