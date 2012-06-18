(function() {
  var request   = require('request');
  var URL       = require('url');
  var util      = require('util');
  var QS        = require('querystring');
  var Q         = require('q');
  var dateutil  = require('dateutil');

  // dateutil parser for ETA's
  dateutil._parsers['sabnzbd'] = {
    test  : /^\s*[\d:]+\s+[a-zA-Z]{3}\s+\d+\s+[a-zA-Z]{3}\s*$/,
    parse : function(str) {
      var m = str.match(/^([\d:]+)\s+(.*)/);
      var t = [ m[2], (new Date()).getFullYear(), m[1] ].join(" ");
      return dateutil.parse(t);
    }
  };

//// SABnzbd queue class
  var SABnzbdQueue = function(delegate) {
    this.delegate = delegate;
  };

  // get queue status
  SABnzbdQueue.prototype.status = function() {
    var delegate = this.delegate;

    return delegate.cmd('queue').then(function(response) {
      var queue = response.queue || { slots: [] };

      // normalize queue slots
      var slots = queue.slots.map(function(slot) {
        return delegate.normalize_queue(slot);
      });
      queue.entries = slots;

      // done
      return queue;
    })
  };

  // get only a list of queue entries
  SABnzbdQueue.prototype.entries = function() {
    return this.status().then(function(queue) {
      return queue.entries;
    });
  };

  // add an NZB url to the queue
  SABnzbdQueue.prototype.addurl = function(url) {
    return this.delegate.cmd('addurl', { name : url });
  };

  // pause entire queue (with no argument) or a single download (with
  // a single 'id' argument)
  SABnzbdQueue.prototype.pause = function(id) {
    if (id === undefined)
      return this.delegate.cmd('pause');
    else
      return this.delegate.cmd('queue', { name : 'pause', value : id });
  };

  // resume entire queue (with no argument) or a single download (with
  // a single 'id' argument)
  SABnzbdQueue.prototype.resume = function(id) {
    if (id === undefined)
      return this.delegate.cmd('resume');
    else
      return this.delegate.cmd('queue', { name : 'resume', value : id });
  };

  // delete (an) item(s) from the queue (or pass 'all' as single argument
  // to remove everything from the queue)
  SABnzbdQueue.prototype.delete = function() {
    return this.delegate.cmd('queue', { 
      name  : 'delete', 
      value : arguments.join(",")
    });
  };

//// SABnzbd history class
  var SABnzbdHistory = function(delegate) {
    this.delegate = delegate;
  };

  // get history status
  SABnzbdHistory.prototype.status = function() {
    var delegate = this.delegate;

    return delegate.cmd('history').then(function(response) {
      var history = response.history || { slots: [] };

      // normalize history slots
      var slots = history.slots.map(function(slot) {
        return delegate.normalize_history(slot);
      });
      history.entries = slots;

      // done
      return history;
    });
  };

  // get only a list of history entries
  SABnzbdHistory.prototype.entries = function() {
    return this.status().then(function(history) {
      return history.entries;
    });
  };

  // delete (an) item(s) from the history (or pass 'all' as single
  // argument to remove everything from the history)
  SABnzbdHistory.prototype.delete = function() {
    return this.delegate.cmd('history', { 
      name  : 'delete', 
      value : arguments.join(",")
    });
  };

//// Main SABnzbd class
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
    return Q.all([ this.queue.delete(id), this.history.delete(id) ])
            .spread(function(queue_status, history_status) {
              return { status : queue_status.status || history_status.status };
            });
  };

  // normalize queue slot
  SABnzbd.prototype.normalize_queue = function(slot) {
    // parse timeleft
    var timeleft = slot.timeleft.replace(/^(\d+):(\d+):(\d+)/, function(all, H, M, S) {
      return parseInt(H) * 3600 + parseInt(M) * 60 + parseInt(S);
    });

    // parse ETA
    var eta = slot.eta == 'unknown' ? slot.eta : dateutil.parse(slot.eta);

    // parse age
    var age  = slot.avg_age.replace(/^\s*(\d+).*/, function(a, H) {
      return parseInt(H) * 3600;
    });

    // return a normalized object
    return {
      age         : parseInt(age),
      size        : slot.mb * 1000 * 1000,
      size_left   : slot.mbleft * 1000 * 1000,
      nzbid       : slot.nzo_id,
      category    : slot.cat,
      eta         : eta,
      name        : slot.filename,
      nzbname     : slot.filename,
      percentage  : parseInt(slot.percentage),
      index       : slot.index,
      missing     : slot.missing,
      priority    : slot.priority,
      status      : slot.status,
      time_left   : parseInt(timeleft)
    };
  };

  // normalize history slot
  SABnzbd.prototype.normalize_history = function(slot) {
    return {
      action_line     : slot.action_line,
      size            : slot.bytes,
      category        : slot.category,
      completed       : new Date(slot.completed * 1000.0),
      completeness    : slot.completeness,
      download_time   : slot.download_time,
      downloaded      : slot.downloaded,
      fail_message    : slot.fail_message,
      id              : slot.id,
      loaded          : slot.loaded,
      meta            : slot.meta,
      name            : slot.name,
      nzbname         : slot.nzb_name,
      nzbid           : slot.nzo_id,
      incomplete_path : slot.path,
      postproc_time   : slot.postproc_time,
      pp              : slot.pp,
      report          : slot.report,
      retry           : slot.retry,
      script          : slot.script,
      script_line     : slot.script_line,
      script_log      : slot.script_log,
      show_details    : slot.show_details == "True",
      stage_log       : slot.stage_log,
      status          : slot.status,
      downloaded_to   : slot.storage,
      url             : slot.url,
      url_info        : slot.url_info
    };
  };

  // done
  module.exports = SABnzbd;
})();
