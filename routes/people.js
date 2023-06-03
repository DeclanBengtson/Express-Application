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
      .select("principals.movieName","principals.id as movieId","principals.category","principals.characters","names.primaryName","names.birthYear","names.deathYear")
      .then((data) => {
          const characters = [data.characters]
          const roles = [{movieName:data.movieName, movieId: data.id, category:data.category, characters:characters,imdbRating:''}]
          const mapped = {
            name: data[0].primaryName,
            birthYear: data[0].birthYear,
            deathYear: data[0].deathYear,
            roles: roles,
          }
          res.json(mapped);
      })
      .catch((err) => {
        if(res.status(400)){res.status(400).json({ error:true, message: err.message });}
        if(res.status(401)){res.status(401).json({ error:true, message: err.message });}
        if(res.status(404)){res.status(404).json({ error:true, message: err.message });}
    });
});

module.exports = router;
