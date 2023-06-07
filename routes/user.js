var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authorization = require('../middleware/authorization');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// POST /user/register
router.post('/register', function(req, res, next) { 
  // Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  // Determine if user already exists in table
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers.then(users => {
    if (users.length > 0) {
      return res.status(409);
    }

    // Insert user into DB
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    return req.db.from("users").insert({ email, hash });
  })
.then(() => {
   res.status(201).json({  message: "User created" });
})
  .catch(e => {
    if(res.status(400)){res.status(400).json({ success: false, message: e.message });}
    if(res.status(409)){res.status(409).json({ success: false, message: e.message });}
    if(res.status(429)){res.status(429).json({ success: false, message: e.message });}
  });
});

// POST /user/login
router.post('/login', function (req, res, next) {
  // 1. Retrieve email and password from req.body
  const email = req.body.email;
  const password = req.body.password;

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  const queryUsers = req.db.from("users").select("hash").where("email", "=", email);
  queryUsers
    .then(users => {
      if (users.length === 0) {
        return;
      }
      else{
        // Compare password hashes
        const user = users[0];
        return bcrypt.compare(password, user.hash);
      }
    })
    .then(match => {
      if (!match) {
        res.status(401).json({
          message: "Request body incomplete - email and password needed"
        });
        return;
      }
      else{
      // Create and return JWT token
      const refreshexpires_in = 60 * 10; // 24 hours
      const bearerxpires_in = 60 * 60* 24; // 24 hours

      const refreshexp = Math.floor(Date.now() / 1000) + refreshexpires_in;
      const bearerexp = Math.floor(Date.now() / 1000) + bearerxpires_in;

      const refreshToken = jwt.sign({ email, refreshexp }, process.env.JWT_SECRET);
      const bearerToken = jwt.sign({ email, bearerexp }, process.env.JWT_SECRET);

      res.status(200).json( {"bearerToken":{
        bearerToken,
        token_type: "Bearer",
        expires_in:refreshexpires_in },
        "refreshToken":{
          refreshToken,
          token_type: "Refresh",
          expires_in:bearerxpires_in
        }
      }
      );
      return req.db.from("users").where("email", "=", email).update({refreshToken });
    }
    })
  .catch(e => {
    console.log(e);
    res.status(401).json({ message: e.message });
    res.status(500).json({ message: "Error in mySQL query" });
  });
});



router.post('/refresh', function (req, res, next) {
  const email = req.body.email;
  const expires_in = 60 * 10; // 10 minutes
  const Rexpires_in = 60 * 60 * 24; // 10 hours

  const exp = Math.floor(Date.now() / 1000) + expires_in;
  const bearerToken = jwt.sign({ email, exp }, process.env.JWT_SECRET);
  const refreshToken = jwt.sign({ email, exp }, process.env.JWT_SECRET);
  
  res.status(200).json({
    bearerToken: {
      bearerToken,
      token_type: "Bearer",
      expires_in
    },
    refreshToken: {
      refreshToken,
      token_type: "Refresh",
      expires_in: Rexpires_in
    }
  })
  .catch(e => {
    console.log(e)
    if (res.status(400)) {
      res.status(400).json({ error: true, message: "Request body incomplete, refresh token required" });
    }
    if (res.status(401)) {
      res.status(401).json({ error: true, message: "JWT token has expired" });
    }
    if (res.status(429)) {
      res.status(429).json({ error: true, message: e.message });
    }
  });

  return req.db.from("users").where("email", "=", email).update({ refreshToken });
});


//POST /user/logout
router.post('/logout', function (req, res, next) {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    res.status(400).json({ error: true, message: "Request body incomplete, refresh token required" });
    return;
  }

  req.db
    .from("users")
    .select("refreshToken")
    .where("refreshToken", "=", refreshToken)
    .then((user) => {
      if (!user || user.length === 0) {
        res.status(401).json({ error: true, message: "Invalid JWT token" });
        return;
      }

      const bearerToken = jwt.sign({ refreshToken }, process.env.JWT_SECRET, { expiresIn: 600 });
      const newRefreshToken = jwt.sign({ refreshToken }, process.env.JWT_SECRET, { expiresIn: 86400 });

      // Proceed with token invalidation and refreshing
      req.db
        .from("users")
        .where("refreshToken", "=", refreshToken)
        .update({ refreshToken: newRefreshToken })
        .then(() => {
          res.status(200).json({
            bearerToken: {
              token: bearerToken,
              token_type: "Bearer",
              expires_in: 600
            },
            refreshToken: {
              token: newRefreshToken,
              token_type: "Refresh",
              expires_in: 86400
            }
          });
        })
        .catch((e) => {
          console.log(e);
          res.status(500).json({ error: true, message: "Internal server error" });
        });
    })
    .catch((e) => {
      console.log(e);
      res.status(500).json({ error: true, message: "Internal server error" });
    });
});



// GET /user/{email}/profile
router.get("/:email/profile", function (req, res, next) {
  const authorizationHeader = req.headers["authorization"];

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    req.db
      .from("users")
      .select("email", "firstName", "lastName")
      .where("email", "=", req.params.email)
      .then((rows) => {
        if (rows.length === 0) {
          res.status(404).json({ error: true, message: "User not found" });
          return;
        }

        const profile = {
          email: rows[0].email,
          firstName: rows[0].firstName,
          lastName: rows[0].lastName,
        };

        res.status(200).json({ profile });
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({ error: true, message: "Internal server error" });
      });
  } else {
    const token = authorizationHeader.substring(7);

    // Verify the JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const email = decoded.email;

      if (email !== req.params.email) {
        res.status(403).json({ error: true, message: "Access denied. You are not authorized to access this resource." });
        return;
      }

      req.db
        .from("users")
        .select("email", "firstName", "lastName", "dob", "address")
        .where("email", "=", req.params.email)
        .then((rows) => {
          if (rows.length === 0) {
            res.status(404).json({ error: true, message: "User not found" });
            return;
          }

          const profile = {
            email: rows[0].email,
            firstName: rows[0].firstName,
            lastName: rows[0].lastName,
            dob: rows[0].dob || null,
            address: rows[0].address || null,
          };

          res.status(200).json({ profile });
        })
        .catch((e) => {
          console.log(e);
          res.status(500).json({ error: true, message: "Internal server error" });
        });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ error: true, message: "JWT token has expired" });
      } else {
        res.status(404).json({ error: true, message: "Invalid JWT token" });
      }
    }
  }
});



// PUT /user/{email}/profile
router.put("/:email/profile", function (req, res, next) {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const dob = req.body.dob;
  const address = req.body.address;

  const authorizationHeader = req.headers["authorization"];
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: true, message: "Authorization header ('Bearer token') not found" });
    return;
  }

  const token = authorizationHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const authorizedEmail = decoded.email;

    if (authorizedEmail !== req.params.email) {
      res.status(403).json({ error: true, message: "Forbidden" });
      return;
    }

    const queryUsers = req.db.from("users").select("email", "firstName", "lastName", "dob", "address").where("email", "=", req.params.email);
    queryUsers
      .then((users) => {
        if (users.length === 0) {
          res.status(404).json({ error: true, message: "User not found" });
          return;
        }

        if (!firstName || !lastName || !dob || !address) {
          res.status(400).json({ error: true, message: "Request body incomplete: firstName, lastName, dob, and address are required" });
          return;
        }

        if (typeof firstName !== "string" || typeof lastName !== "string" || typeof dob !== "string" || typeof address !== "string") {
          res.status(400).json({ error: true, message: "Request body invalid: firstName, lastName, dob, and address must be strings only" });
          return;
        }

        if (!isValidDate(dob)) {
          res.status(400).json({ error: true, message: "Invalid input: dob must be a real date in format YYYY-MM-DD" });
          return;
        }

        return req.db
          .from("users")
          .update({ email: req.params.email, firstName: firstName, lastName: lastName, dob: dob, address: address })
          .where("email", "=", req.params.email);
      })
      .then(() => {
        res.status(200).json({
          email: req.params.email,
          firstName: firstName,
          lastName: lastName,
          dob: dob,
          address: address,
        });
      })
      .catch((e) => {
        console.log(e);
        res.status(500).json({ error: true, message: "Internal server error" });
      });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ error: true, message: "JWT token has expired" });
    } else {
      res.status(401).json({ error: true, message: "Invalid JWT token" });
    }
  }
});

// Helper function to validate date format
function isValidDate(dateString) {
  const pattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (!pattern.test(dateString)) return false;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return (
    year.toString() === dateString.substring(0, 4) &&
    month.toString() === dateString.substring(5, 7) &&
    day.toString() === dateString.substring(8, 10)
  );
}




module.exports = router;
