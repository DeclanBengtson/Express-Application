var express = require('express');
var router = express.Router();
const authorization = require("../middleware/authorization");



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET /movies/search
router.get("/search", function (req, res, next) {
  let title = req.query.title;
  console.log(title);
  let year = req.query.year;
  console.log(year);
  let page = req.query.page;
  if(typeof(title) == "undefined" && typeof(year) == "undefined")
  {req.db
    .from("basics")
    .select("primaryTitle as title","year","tconst as imdbID",  'imdbRating',  "rottenTomatoesRating", "metacriticRating", "rated as classification")
    .paginate({isLengthAware: true, perPage: 100, currentPage: page ? +page:1 })
    .then((data) => {
      res.json(data);
    })
    .catch(e => {
      if(res.status(400)){res.status(400).json({ message: e.message });}
      if(res.status(429)){res.status(429).json({ message: e.message });}
    });
  }
  if(typeof(title) != "undefined"&& typeof(year) != "undefined")
  {req.db
    .from("basics")
    .where("primaryTitle","like","%"+req.query.title+"%")
    .where("year","=",req.query.year)
    .select("primaryTitle as title","year","tconst as imdbID", "imdbRating", "rottenTomatoesRating", "metacriticRating", "rated as classification")
    .paginate({isLengthAware: true, perPage: 100, currentPage: page ? +page:1 })
    .then((data) => {
      res.json(data);
    })
    .catch(e => {
      if(res.status(400)){res.status(400).json({ message: e.message });}
      if(res.status(429)){res.status(429).json({ message: e.message });}
    });}
  if(typeof(title) == "undefined" && typeof(year) != "undefined")
  {req.db
    .from("basics")
    .where("year","=",req.query.year)
    .select("primaryTitle as title","year","tconst as imdbID", "imdbRating", "rottenTomatoesRating", "metacriticRating", "rated as classification")
    .paginate({isLengthAware: true, perPage: 100, currentPage: page ? +page:1 })
    .then((data) => {
      res.json(data);
    })
    .catch(e => {
      if(res.status(400)){res.status(400).json({ message: e.message });}
      if(res.status(429)){res.status(429).json({ message: e.message });}
    });}
  if(typeof(title) != "undefined"&& typeof(year) == "undefined" )
  {req.db
    .from("basics")
    .where("primaryTitle","like","%"+req.query.title+"%")
    .select("primaryTitle as title","year","tconst as imdbID", "imdbRating", "rottenTomatoesRating", "metacriticRating", "rated as classification")
    .paginate({isLengthAware: true, perPage: 100, currentPage: page ? +page:1 })
    .then((data) => {
      res.json(data);
    })
    .catch(e => {
      if(res.status(400)){res.status(400).json({ message: e.message });}
      if(res.status(429)){res.status(429).json({ message: e.message });}
    });}
});


// GET /movies/data/{imdbID}
router.get("/data/:tconst", function (req, res, next) {
  const queryUsers = req.db.from("basics").select("basics.tconst").where("basics.tconst", "=", req.params.tconst);
  queryUsers
    .then(basics => {
      if (basics.length === 0) {
        res.status(404).json({
          error: true,
          message: "Invalid query parameters: year. Query parameters are not permitted."
        });
        return;
      }
      else{
        req.db
    .from("basics")
    .where("basics.tconst", "=", req.params.tconst)
    .join("principals", "basics.tconst", "=", "principals.tconst")
    .select("basics.primaryTitle as title", "basics.year","basics.runtimeMinutes as runtime","basics.genres","basics.country",
    'basics.imdbRating', 
    'basics.rottentomatoesRating',
    'basics.metacriticRating',
    'basics.rated as classification', "basics.boxoffice","basics.poster","basics.plot",
    'principals.id','principals.category','principals.name','principals.characters')
    .then((data) => {
      let array = data[0].genres.split(',');
      const principals ={id: data.id,category: data.category,name: data.name,characters:[data.characters]}
      const rating = {source:"Internet Movie Database", value: data[0].imdbRating,
                      source:"Rotten Tomatoe", valueY: data[0].rottentomatoesRating,
                      source:"Metacritic", value: data[0].metacriticRating
                    }
      const mapped = {
        title: data[0].title,
        year: data[0].year,
        runtime: data[0].runtime,
        genres: array,
        country: data[0].country,
        principals: [principals],
        ratings: [rating],
        boxoffice: data[0].boxoffice,
        poster: data[0].poster,
        plot: data[0].plot
      }
      res.json(mapped);
    })
    .catch(e => {
      if(res.status(400)){res.status(400).json({ error: true, message: e.message });}
      if(res.status(404)){res.status(404).json({ error: true, message: e.message });}
      if(res.status(429)){res.status(429).json({ message: e.message });}
    });
      }
    })
  
});

module.exports = router;
