var express = require('express');
var router = express.Router();
const authorization = require("../middleware/authorization");
const { parse } = require('dotenv');



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET /movies/search
router.get("/search", function (req, res, next) {
  const { title, year, page } = req.query;

  if (typeof page !== "undefined" && !(/^\d+$/.test(page))) {
    res.status(400).json({ error: true, message: "Invalid page format. page must be a number." });
    return;
  }

  let query = req.db.from("basics").select(
    "basics.primaryTitle as title",
    "basics.year",
    "basics.tconst as imdbID",
    req.db.raw("CAST(basics.imdbRating AS DECIMAL(3,1)) as imdbRating"),
    req.db.raw("CAST(basics.rottenTomatoesRating AS DECIMAL(3,0)) as rottenTomatoesRating"),
    req.db.raw("CAST(basics.metacriticRating AS DECIMAL(3,0)) as metacriticRating"),
    "basics.rated as classification"
  );

  if (typeof title !== "undefined") {
    query = query.where("primaryTitle", "like", `%${title}%`);
  }

  if (typeof year !== "undefined") {
    if (!(/^\d{4}$/.test(year))) {
      res.status(400).json({ error: true, message: "Invalid year format. Format must be yyyy." });
      return;
    }
    query = query.where("year", "=", year);
  }

  query.paginate({ isLengthAware: true, perPage: 100, currentPage: page ? +page : 1 })
    .then((result) => {
      const data = result.data.map((item) => ({
        ...item,
        imdbRating: item.imdbRating ? parseFloat(item.imdbRating) : null,
        rottenTomatoesRating: item.rottenTomatoesRating ? parseFloat(item.rottenTomatoesRating) : null,
        metacriticRating: item.metacriticRating ? parseFloat(item.metacriticRating) : null,
      }));

      const response = {
        data: data,
        pagination: result.pagination,
      };

      res.status(200).json(response);
    })
    .catch(e => {
      if (res.status(400)) {
        res.status(400).json({ message: e.message });
      }
      if (res.status(429)) {
        res.status(429).json({ message: e.message });
      }
    });
});



const charactersParser = (str) => {
  if (str === "") {
    return [];
  }

  const replaced = str.replaceAll(`["`, "").replaceAll(`"]`, "");
  const split = replaced.split('","');

  return split;
};

router.get("/data/:tconst", function (req, res, next) {
  const queryUsers = req.db.from("basics").select("basics.tconst").where("basics.tconst", "=", req.params.tconst);
  queryUsers
    .then((basics) => {
      const tconstPattern = /^tt\d{7}$/; // Regular expression to match valid tconst format

      if (basics.length === 0 || !tconstPattern.test(req.params.tconst)) {
        res.status(404).json({
          error: true,
          message: "Invalid query parameters: tconst. Query parameter is not permitted or has an invalid format.",
        });
        return;
      } else {
        // Check if there are additional query parameters in the URL
        if (Object.keys(req.query).length > 0) {
          res.status(400).json({
            error: true,
            message: "Query parameters are not permitted.",
          });
          return;
        }

        req.db
          .from("basics")
          .where("basics.tconst", "=", req.params.tconst)
          .join("principals", "principals.tconst", "=", "basics.tconst")
          .select(
            "basics.primaryTitle as title",
            "basics.year",
            "basics.runtimeMinutes as runtime",
            "basics.genres",
            "basics.country",
            req.db.raw('CAST(basics.imdbRating AS DECIMAL(3,1)) as imdbRating'),
            req.db.raw('CAST(basics.rottentomatoesRating AS DECIMAL) as rottentomatoesRating'),
            req.db.raw('CAST(basics.metacriticRating AS DECIMAL) as metacriticRating'),
            "basics.rated as classification",
            "basics.boxoffice",
            "basics.poster",
            "basics.plot",
            "principals.nconst",
            "principals.category",
            "principals.name",
            "principals.characters"
          )
          .then((data) => {
            if (data.length === 0) {
              res.status(404).json({
                error: true,
                message: "No data found for the provided tconst.",
              });
              return;
            }

            let array = data[0].genres.split(",");
            const principals = data.map((item) => ({
              id: item.nconst,
              category: item.category,
              name: item.name,
              characters: charactersParser(item.characters), // Normalize characters using the character parser
            }));

            const ratings = [];
            if (data[0].imdbRating !== null) {
              ratings.push({
                source: "Internet Movie Database",
                value: parseFloat(data[0].imdbRating),
              });
            }
            if (data[0].rottentomatoesRating !== null) {
              ratings.push({
                source: "Rotten Tomatoes",
                value: parseFloat(data[0].rottentomatoesRating),
              });
            }
            if (data[0].metacriticRating !== null) {
              ratings.push({
                source: "Metacritic",
                value: parseFloat(data[0].metacriticRating),
              });
            }

            const mapped = {
              title: data[0].title,
              year: data[0].year,
              runtime: data[0].runtime,
              genres: array,
              country: data[0].country,
              principals: principals,
              ratings: ratings,
              boxoffice: data[0].boxoffice,
              poster: data[0].poster,
              plot: data[0].plot,
            };
            res.json(mapped);
          })
          .catch((e) => {
            if (res.status(400)) {
              res.status(400).json({ error: true, message: e.message });
            }
            if (res.status(404)) {
              res.status(404).json({ error: true, message: e.message });
            }
            if (res.status(429)) {
              res.status(429).json({ message: e.message });
            }
          });
      }
    });
});





module.exports = router;
