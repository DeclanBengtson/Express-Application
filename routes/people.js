var express = require('express');
var router = express.Router();
const authorization = require("../middleware/authorization");
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
  });

// GET /people/{id}
router.get("/:nconst", authorization, (req, res) => {
  req.db
    .from("principals")
    .where("principals.nconst", "=", req.params.nconst)
    .join("names", "names.nconst", "=", "principals.nconst")
    .join("basics", "basics.tconst", "=", "principals.tconst")
    .select(
      "basics.primaryTitle as movieName",
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
        characters: [item.characters],
        imdbRating: "",
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
      if (res.status(400)) {
        res.status(400).json({ error: true, message: err.message });
      }
      if (res.status(401)) {
        console.log(err)
        res.status(401).json({ error: true, message: err.message });
      }
      if (res.status(404)) {
        res.status(404).json({ error: true, message: err.message });
      }
    });
});




module.exports = router;
