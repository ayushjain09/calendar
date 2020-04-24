//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const passport = require("passport");
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const {google} = require('googleapis');
const findOrCreate = require("mongoose-findorcreate");
const nodemailer=require("nodemailer");
const ics=require("ics");
const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb+srv://admin-ayush:test123@cluster0-2lbxk.mongodb.net/calendarDB", {
  useNewUrlParser: true
});
mongoose.set('useCreateIndex', true);


//used to store the user's session
app.use(session({
  secret: "this is a secret string",
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: mongoose.connection })
}));


//passport is used as the authentication middleware
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  email: String,
  accessToken: String,
  refreshToken: String,
  googleId: String,
  username: String,
  name:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//here the google strategy is specified for the oauth2 authentication
//the authenticated user is returned as "user"
passport.use(new GoogleStrategy({
    clientID: "598565160678-lkatoqcrsrlumrug25i5oj7b0q6i7t0d.apps.googleusercontent.com",
    clientSecret: "fBFgKyP1AICVkMUOeqLJSA85",
    callbackURL: "https://fast-forest-04609.herokuapp.com/auth/google/events",
    userProfileUrl: "http://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, params, profile, cb) {
    User.findOrCreate({
      accessToken: accessToken,
      googleId: profile.id,
      username: profile.emails[0].value,
      name:profile.displayName
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//-------------------------------------------------------------------//
// when the login button is clicked the user is directed to the
// google's login screen where he login himself and is redirected
// to the events page

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile",'email',"https://www.googleapis.com/auth/calendar","https://www.googleapis.com/auth/gmail.send"]
  }));

app.get("/auth/google/events",
  passport.authenticate("google", {
    failureRedirect: "/auth/google",
  }),
  function(req, res) {
    res.redirect("/events");
  });

//-------------------------------------------------------------------//
//home route

app.get("/", function(req, res) {
  res.render("home");
});

//-------------------------------------------------------------------//
// when the user is authenticated using google , he is redirected
// to the events route where his upcoming events are listed

app.get("/events", function(req, res) {

  var oauth2Client = new google.auth.OAuth2(
    "598565160678-lkatoqcrsrlumrug25i5oj7b0q6i7t0d.apps.googleusercontent.com",
    "fBFgKyP1AICVkMUOeqLJSA85",
    "https://fast-forest-04609.herokuapp.com/auth/google/events"
  );

  oauth2Client.credentials = {
    access_token: req.user.accessToken
  };

  var calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
  });


  // the authenticated user's calendar is accessed here
  calendar.events.list({
    auth:oauth2Client,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, function(err, response) {
    if (err) return console.log('The API returned an error: ' + err);
    const events = response.data.items; //the upcoming events are stored in events

    //render the events page with events as passed parameter
    res.render("events", {
      events:events
    });
  });

 });

//-------------------------------------------------------------------//
// when the user clicks on event to send the invite he is directed
// to this route containing the event id as express parameter

app.get("/events/:eventId",function(req,res){
  res.render("details",{eventId:req.params.eventId});
});


//-------------------------------------------------------------------//
// when the user submits the details of the invite this route is called
//which sends an email to the entered attendee via gmail

app.post("/events/:eventId",function(req,res){

  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    auth:{
      user:'calendareventsproject@gmail.com',
      pass:process.env.PASSWORD
    }
  });

  console.log("transporter created");

  var oauth2Client = new google.auth.OAuth2(
    "598565160678-lkatoqcrsrlumrug25i5oj7b0q6i7t0d.apps.googleusercontent.com",
    "fBFgKyP1AICVkMUOeqLJSA85",
    "https://fast-forest-04609.herokuapp.com/auth/google/events"
  );

  oauth2Client.credentials = {
    access_token: req.user.accessToken
  };

  var calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
  });

 var eve;

  calendar.events.list({
    auth:oauth2Client,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, function(err, response) {
     const events = response.data.items;
     events.forEach(function(event){
       if(event.id===req.params.eventId){
         eve=event;
       }
     });

     ics.createEvent(eve,function(err,value){

       transporter.sendMail({
        from: req.user.name+' <'+req.user.username+'>',
        to: req.body.email, // list of receivers
        subject: req.body.title, // Subject line
        text: req.body.body, // plain text body
        alternatives: [{
             contentType: "text/calendar",
             content: value
         }]
      });
    });

  });


  // once the email is sent, the user is redirected back to the events page
  res.redirect("/events");
});

//-------------------------------------------------------------------//
// specifying the dynamic port

let port=process.env.PORT;
if(port==null || port=="")
    {
      port=3000;
    }

app.listen(port, function() {
  console.log("Server started successfully");
});
