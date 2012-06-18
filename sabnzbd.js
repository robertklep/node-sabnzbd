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

  // SABnzbd class
  var SABnzbd = function(url, apikey, nzbkey) {
    this.apikey = apikey;
    this.nzbkey = nzbkey || apikey;

    // attach API endpoint to url
    if (url.indexOf('/sabnzbd/api') == -1)
      url = url.replace(/\/?$/, '/sabnzbd/api');
    this.url = url;

    // check for valid endpoint
    this.version().then(function(version) {
      util.log('SABnzbd version: ' + version);
    });

    // check for valid API key
    this.cmd('').then(function(response) {
      if (response.indexOf('API Key Incorrect') != -1)
        util.log("Supplied API key is invalid, things will probably start failing.");
      else
        util.log('SABnzbd accepted supplied API key.');
    });
  };

  // perform command request
  SABnzbd.prototype.cmd = function(command, args) {
    // build url for request
    var url = this.url + '?' + QS.stringify({
      mode    : command,
      apikey  : this.apikey,
      output  : 'json'
    });

    // tack on any passed arguments
    if (args)
      url += '&' + QS.stringify(args);

    //console.log('RETR', url);

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
    return this.cmd('version').then(function(version) {
      return version.replace(/^\s+|\s+$/, '');
    });
  };

  // get queue contents
  SABnzbd.prototype.queue = function() {
    var _this = this;
    return this.cmd('queue').then(function(response) {
      var queue = response.queue || { slots: [] };

      // normalize queue slots
      var slots = queue.slots.map(function(slot) {
        return _this.normalize_queue(slot);
      });
      queue.entries = slots;

      // done
      return queue;
    });
  };

  // get history contents
  SABnzbd.prototype.history = function() {
    var _this = this;

    return this.cmd('history').then(function(response) {
      var history = response.history || { slots: [] };

      // normalize history slots
      var slots = history.slots.map(function(slot) {
        return _this.normalize_history(slot);
      });
      history.entries = slots;

      // done
      return history;
    });
  };

  // get both queue and history contents, merged
  SABnzbd.prototype.all = function() {
    return Q.all([ this.queue(), this.history() ]).spread(function(queue, history) {
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

  // add an NZB url to the queue
  SABnzbd.prototype.addurl = function(url) {
    return this.cmd('addurl', { name : url });
  };

  // pause/stop download of item
  SABnzbd.prototype.pause = function(id) {
    return this.cmd('queue', { name : 'pause', value : id });
  };
  SABnzbd.prototype.stop = SABnzbd.prototype.pause;

  // resume/start download of item
  SABnzbd.prototype.resume = function(id) {
    return this.cmd('queue', { name : 'resume', value : id });
  };
  SABnzbd.prototype.start = SABnzbd.prototype.resume;

  // remove an item from the queue
  SABnzbd.prototype.queue_remove = function(id) {
    return this.cmd('queue', { name : 'delete', value : id });
  };

  // remove an item from the history
  SABnzbd.prototype.history_remove = function(id) {
    return this.cmd('history', { name : 'delete', value : id });
  };

  // remove an item all together
  SABnzbd.prototype.remove = function(id) {
    return Q.all([ 
      this.queue_remove(id), 
      this.history_remove(id)
    ]).spread(function(queue_status, history_status) {
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
