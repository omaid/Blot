var numCPUs = require("os").cpus().length;
var uuid = require("uuid/v4");
var exitHook = require("async-exit-hook");
var child_process = require("child_process");
var workers = [];
var jobs = {};

console.log("Master", process.pid, "is running");

// setTimeout(function(){
//   throw new Error('Error in master! This show is over folks.');
// }, Math.random() * 20000);

exitHook(function() {
  console.log("Shutting down master:", process.pid);
  workers.forEach(function(item) {
    item.worker.kill();
  });
});

exitHook.uncaughtExceptionHandler(function(err) {
  console.error(err);
  workers.forEach(function(item) {
    item.worker.kill();
  });
});

function triggerCallback(id) {
  return function(message) {
    jobs[message.id].callback(message.err, message.entry);
  };
}

function handleDeadWorker(id) {
  return function(code, signal) {

    // remove dead worker from list of workers
    workers = workers.filter(function(item) {
      return item.id !== id;
    });
   
    if (signal) {
      console.log("worker was killed by signal: ", signal);
    } else if (code !== 0) {
      console.log("worker exited with error code:", code);
      workers.push(new worker());
    } else {
      console.log("worker success!");
    }
  };
}

// Fork workers.
for (let i = 0; i < numCPUs; i++) {
  workers.push(new worker());
}

function worker() {
  var wrkr = child_process.fork(__dirname + "/main");
  var id = uuid();
  console.log("creating worker", id);
  wrkr.on("message", triggerCallback(id));
  wrkr.on("exit", handleDeadWorker(id));
  return { worker: wrkr, id: id };
}

module.exports = function(blog, path, options, callback) {
  var worker = workers[Math.floor(Math.random() * workers.length)].worker;
  var id = uuid();

  jobs[id] = {
    blog: blog,
    id: id,
    path: path,
    options: options,
    callback: callback
  };

  worker.send({ blog: blog, path: path, id: id, options: options });
};
