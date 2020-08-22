const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(
  process.env.MONGO_URI || "mongodb://localhost/exercise-track",
  { useUnifiedTopology: true, useNewUrlParser: true }
);

// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true`
// by default, you need to set it to false.
// from mongoose docs
mongoose.set("useFindAndModify", false);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// making the schema and model
const Schema = mongoose.Schema;

// exercise schema
const exerciseSchema = new Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

// user schema
// IF YOU NAME LOG ANYTHING ELSE THE TEST WILL FAIL NO MATTER WHAT
// IF ANYONE FROM FREECODECAMP READS THIS FIX THIS PLEASE
const userSchema = new Schema({
  username: { type: String, required: true },
  log: [exerciseSchema]
});

// models of each schema
let Excercise = mongoose.model("Excercise", exerciseSchema);
let User = mongoose.model("User", userSchema);

//create a new user
app.post("/api/exercise/new-user", (req, res) => {
  let usernameInput = req.body.username;
  let newUser = new User({ username: usernameInput });
  newUser.save((err, data) => {
    if (!err) {
      res.json({ username: data.username, _id: data.id });
    } else {
      res.json({ error: "Something went wrong" });
    }
  });
});

//get all created users
app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    if (!err) {
      res.json(data);
    } else {
      res.json({ error: "Something went wrong" });
    }
  });
});

// adds an exercise to a user's log
app.post("/api/exercise/add", (req, res) => {
  let userDescr = req.body.description;
  let userDuration = parseInt(req.body.duration, 10);
  let userDate = new Date(req.body.date).toDateString();
  if (isNaN(new Date(userDate))) {
    userDate = new Date().toDateString();
  }
  let newExercise = {
    description: userDescr,
    duration: userDuration,
    date: userDate
  };
  User.findByIdAndUpdate(
    req.body.userId,
    { $push: { log: newExercise } },
    { new: true },
    (err, data) => {
      if (!err) {
        res.json({
          username: data.username,
          description: newExercise.description,
          duration: newExercise.duration,
          _id: data.id,
          date: new Date(newExercise.date).toDateString()
        });
      } else {
        res.json({ error: "The operation failed please try again" });
      }
    }
  );
});

// get path with queries
app.get("/api/exercise/log", (req, res) => {
  let limit = req.query.limit;

  User.findById(req.query.userId, (err, data) => {
    if (!err) {
      let output = data;
      output = output.toJSON();

      //from to queries and dealing with those
      if (req.query.from || req.query.to) {
        let from = new Date(0);
        let to = new Date();

        if (req.query.from) {
          from = new Date(req.query.from);
        }

        if (req.query.to) {
          to = new Date(req.query.to);
        }

        from = from.getTime();
        to = to.getTime();

        output.log = output.log.filter(session => {
          let sessionDate = new Date(session.date).getTime();
          if (sessionDate >= from && sessionDate <= to) {
            sessionDate = new Date(sessionDate).toDateString();
            return sessionDate;
          }
        });
      }

      //limit query
      if (limit) {
        output.log = output.log.slice(0, limit);
      }
      let num = output.log.length;
      res.json({
        _id: output.id,
        username: output.username,
        count: num,
        log: output.log
      });
    } else {
      res.json({ error: "Couldn't find the userId " + req.query.userId });
    }
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'});
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});