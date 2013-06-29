(function() {
  var request         = require('request');
  var URL             = require('url');
  var util            = require('util');
  var QS              = require('querystring');
  var Q               = require('q');

  // helper classes
  var SABnzbdQueue    = require('./sabnzbd-queue');
  var SABnzbdHistory  = require('./sabnzbd-history');

  // main SABnzbd class
  var SABnzbd = function(url, apikey, verbose) {
    this.apikey   = apikey;
    this.verbose  = verbose === true;
    this.invalid  = false;

    // instantiate queue/history classes
    this.queue    = new SABnzbdQueue(this);
    this.history  = new SABnzbdHistory(this);

    // attach API endpoint to url
    if (url.indexOf('/sabnzbd/api') == -1)
      url = url.replace(/\/?$/, '/sabnzbd/api');
    this.url = url;

    // check for valid endpoint
    var _this = this;
    this.version().then(function(version) {
      if (_this.verbose)
        util.log('SABnzbd version: ' + version);
    }).fail(function(error) {
      util.log('Version check failed: ' + error);
      _this.invalid = true;
    });

    // check for valid API key
    this.cmd('get_config')
      .then(function(response) {
        if (response.status === false)
        {
          util.log("Supplied API key was not accepted by the server");
          _this.invalid = true;
        }
        else
        if (_this.verbose)
          util.log('SABnzbd accepted supplied API key.');
      });
  };

  // perform command request
  SABnzbd.prototype.cmd = function(command, args) {
    if (this.invalid)
    {
      util.log('SABnzbd API invalid because of connection/API key issues');
      return false;
    }

    // build url for request
    var url = this.url + '?' + QS.stringify({
      mode    : command,
      apikey  : this.apikey,
      output  : 'json'
    });

    // tack on any passed arguments
    if (args)
      url += '&' + QS.stringify(args);

    if (this.verbose)
      util.log("Retrieving url `" + url + "'");

    // perform request
    var defer = Q.defer();
    request.get(url, function(error, response, body) {
      if (error)
        defer.reject(error);
      else
      {
        // JSON response?
        if (response.headers['content-type'].indexOf('application/json') != -1)
          body = JSON.parse(body);
        defer.resolve(body);
      }
    });

    // return deferred object
    return defer.promise;
  };

  // get server version
  SABnzbd.prototype.version = function() {
    return this.cmd('version').then(function(r) {
      return r.version;
    });
  };

  // get both queue and history status, merged
  SABnzbd.prototype.status = function() {
    return Q.all([ this.queue.status(), this.history.status() ]).spread(function(queue, history) {
      // merge slots
      if (! queue.slots) 
        queue.slots = [];
      history.slots.forEach(function(slot) { queue.slots.push(slot) });

      // merge entries
      if (! queue.entries)
        queue.entries = [];
      history.entries.forEach(function(entry) { queue.entries.push(entry) });

      return queue;
    });
  };
  
  // get both queue and history entries
  SABnzbd.prototype.entries = function() {
    return this.status().then(function(response) {
      return response.entries;
    });
  };

  // delete (an) item(s) from both queue and history (or pass 'all' as
  // single argument to remove everything)
  SABnzbd.prototype.delete = function() {
    return Q.all([ 
      this.queue.delete.apply(this.queue, arguments),
      this.history.delete.apply(this.history, arguments)
    ])
    .spread(function(queue_status, history_status) {
      return { status : queue_status.status || history_status.status };
    });
  };

  // done
  module.exports = SABnzbd;
})();
