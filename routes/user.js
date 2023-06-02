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

      const rtoken = jwt.sign({ email, refreshexp }, process.env.JWT_SECRET);
      const btoken = jwt.sign({ email, bearerexp }, process.env.JWT_SECRET);

      res.status(200).json( {"bearerToken":{
        btoken,
        token_type: "Bearer",
        expires_in:refreshexpires_in },
        "refreshToken":{
          rtoken,
          token_type: "Refresh",
          expires_in:bearerxpires_in
        }
      }
      );
    }
    })
  .catch(e => {
    console.log(e);
    res.status(401).json({ message: e.message });
    res.status(500).json({ message: "Error in mySQL query" });
  });
});



//POST /user/refresh
router.post('/refresh',  authorization, (req, res) => {
  const email = req.body.email;
  const expires_in = 60 * 10; // 24 hours
  const exp = Math.floor(Date.now() / 1000) + expires_in;
  const bearerhtoken = jwt.sign({ email, exp }, process.env.JWT_SECRET);
  const refreshtoken = jwt.sign({ email, exp }, process.env.JWT_SECRET);
  res.status(200).json( {"bearerToken":{
    bearerhtoken,
    token_type: "Bearer",
    expires_in},
    "refreshToken":{
      refreshtoken,
      token_type: "Refresh",
      expires_in 
    }}
  )
  .catch(e => {
    console.log(e)
    if(res.status(400)){res.status(400).json({ error: true, message: "Request body incomplete, refresh token required" });}
    if(res.status(401)){res.status(401).json({ error: true, message: "JWT token has expired" });}
    if(res.status(429)){res.status(429).json({ error: true, message: e.message });}
  });
});

//POST /user/logout
router.post('/logout',  authorization, (req, res) => {
  req.db
  .from("users")
  .delete("refreshToken")
  .where("email", "=", req.body.email)
  .catch(e => {
    console.log(e)
    if(res.status(400)){res.status(400).json({ error: true, message: "Request body incomplete, refresh token required" });}
    if(res.status(401)){res.status(401).json({ error: true, message: "JWT token has expired" });}
    if(res.status(429)){res.status(429).json({ error: true, message: e.message });}
  });
});

// GET /user/{email}/profile
router.get("/:email/profile", function (req, res, next) {
      req.db
      .from("users")
      .select("email","firstName","lastName","dob","address")
      .where("email", "=", req.params.email)
      .then((rows) => {
        res.json({  Profile: rows });
      })
      .catch(e => {
        console.log(e)
        if(res.status(400)){res.status(400).json({ success: false, message: e.message });}
        if(res.status(404)){res.status(404).json({ success: false, message: e.message });}
        if(res.status(403)){res.status(403).json({ success: false, message: e.message });}
        if(res.status(401)){res.status(401).json({ success: false, message: e.message });}
      });
});

// PUT /user/{email}/profile
router.put("/:email/profile", function (req, res, next) {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const dob = req.body.dob;
  const address = req.body.address;
  console.log(req.params.email);

  const queryUsers = req.db.from("users").select("email","firstName","lastName","dob","address").where("email", "=", req.params.email);
  queryUsers.then(users => {
    if (users.length === 0) {
      if(res.status(404)){res.status(404).json({ success: false, message: e.message });}
    }
    else{return req.db.from("users").update({ email:req.params.email,firstName: firstName, lastName: lastName, dob: dob, address: address })
    .where("email", "=", req.params.email);}
  })
  
.then(() => {
   res.status(201).json({  message: "User created" });
})
  .catch(e => {
    console.log(e)
    if(res.status(400)){res.status(400).json({ success: false, message: e.message });}
    if(res.status(401)){res.status(401).json({ success: false, message: e.message });}
    if(res.status(403)){res.status(403).json({ success: false, message: e.message });}
    if(res.status(409)){res.status(409).json({ success: false, message: e.message });}
    if(res.status(429)){res.status(429).json({ success: false, message: e.message });}
  });
  

});



module.exports = router;
