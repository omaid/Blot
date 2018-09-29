var authenticate = require("./authenticate");
var create = require("./create");
var database = require("./database");
var disconnect = require("./disconnect");
var pushover = require("pushover");
var sync = require("./sync");
var dataDir = require('./dataDir');
var repos = pushover(dataDir, { autoCreate: true });
var Express = require("express");
var dashboard = Express.Router();
var site = Express.Router();
var debug = require("debug")("clients:git:routes");

dashboard.get("/", function(req, res, next) {
  repos.exists(req.blog.handle + ".git", function(exists) {
    if (exists) return next();

    create(req.blog, next);
  });
});

dashboard.get("/", function(req, res) {
  database.getToken(req.blog.id, function(err, token) {
    res.render(__dirname + "/views/index.html", {
      title: "Git",
      token: token,
      host: process.env.BLOT_HOST
    });
  });
});

dashboard.get("/disconnect", function(req, res) {
  res.render(__dirname + "/views/disconnect.html", {
    title: "Git"
  });
});

dashboard.post("/refresh-token", function(req, res, next) {
  database.refreshToken(req.blog.id, function(err) {
    if (err) return next(err);

    res.redirect(req.baseUrl);
  });
});

dashboard.post("/disconnect", function(req, res, next) {
  disconnect(req.blog.id, next);
});

site.use("/end/:gitHandle.git", authenticate);

repos.on("push", function(push) {
  push.accept();

  // This might cause an interesting race condition. It happened for me during
  // testing. If we invoke Blog.Sync right now, it should be fine but previously
  // I had an additional asynchronous database lookup to fetch the full blog. I
  // believe this triggered issues in testing, because the test checked to see
  // if a sync had finished that had not actually yet begun. Perhaps we should
  // begin the sync on the "send" event instead of the "finish" event? That
  // might give us a firmer guarantee that the order of events is correct. This
  // seems to be purely a problem for automated use of the git client, humans
  // are unlikely to fire off multiple pushes immediately after the other.
  push.response.on("finish", function() {

    // Used for testing purposes

    if (syncing[push.request.blog.id] === undefined) {
      syncing[push.request.blog.id] = 0;
    }

    syncing[push.request.blog.id]++;

    sync(push.request.blog.id, function(err) {

      // Used for testing purposes
      syncing[push.request.blog.id]--;

      if (err) {
        debug(err);
      } else {
        debug("Sync completed successfully!");
      }
    });
  });
});


// Used for testing purposes
var syncing = {};

// Used for testing to determine end of sync
site.get("/syncing/:blogID", function(req, res){

  if (syncing[req.params.blogID] === 0) {
    res.sendStatus(200);    
  } else {
    res.sendStatus(404);    
  }
});


// We need to pause then resume for some
// strange reason. Read pushover's issue #30
// For another strange reason, this doesn't work
// when I try and mount it at the same path as
// the authentication middleware, e.g:
// site.use("/end/:gitHandle.git", function(req, res) {
// I would feel more comfortable if I could.
site.use("/end", function(req, res) {
  req.pause();
  repos.handle(req, res);
  req.resume();
});

module.exports = { dashboard: dashboard, site: site };
