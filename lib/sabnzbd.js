var got     = require('got');
var debug   = require('debug')('sabnzbd');
var url     = require('url');
var qs      = require('querystring');
var Promise = require('bluebird');

// helper classes
var SABnzbdQueue   = require('./sabnzbd-queue');
var SABnzbdHistory = require('./sabnzbd-history');

// main SABnzbd class
var SABnzbd = function SABnzbd(url, apiKey) {
  if (! (this instanceof SABnzbd)) {
    return new SABnzbd(url, apiKey);
  }
  this.apiKey = apiKey;

  // instantiate queue/history classes
  this.queue   = new SABnzbdQueue(this);
  this.history = new SABnzbdHistory(this);

  // attach API endpoint to url
  if (url.indexOf('/sabnzbd/api') === -1) {
    url = url.replace(/\/?$/, '/sabnzbd/api');
  }
  this.url = url;

  // check for valid endpoint
  this.version().bind(this).done(function(version) {
    debug('SABnzbd version: ' + version);
  });

  // check for valid API key
  this.cmd('get_config').done(function(response) {
    if (response.status === false) {
      throw new Error('Supplied API key was niet accepted by server');
    }
    debug('SABnzbd accepted supplied API key.');
  });
};

// perform command request
SABnzbd.prototype.cmd = function(command, args) {
  return bluebird.resolve(got(this.url, {
    json: true,
    query: Object.assign({ apikey: this.apiKey, mode: command, output: 'json' }, args)
  }).then(response => response.body));
};

// get server version
SABnzbd.prototype.version = function() {
  return this.cmd('version').then(function(r) {
    return r.version;
  });
};

// get both queue and history status, merged
SABnzbd.prototype.status = function() {
  return Promise.join(this.queue.status(), this.history.status()).spread(function(queue, history) {
    // merge slots
    queue.slots = (queue.slots || []).concat(history.slots);

    // merge entries
    queue.entries = (queue.entries || []).concat(history.entries);

    return queue;
  });
};

// get both queue and history entries
SABnzbd.prototype.entries = function() {
  return this.status().then(function(r) {
    return r.entries;
  });
};

// delete (an) item(s) from both queue and history (or pass 'all' as
// single argument to remove everything)
SABnzbd.prototype.delete = function() {
  return Promise.join(
    this.queue.delete.apply(this.queue, arguments),
    this.history.delete.apply(this.history, arguments)
  ).spread(function(queue_status, history_status) {
    return { status : queue_status.status || history_status.status };
  });
};

// done
module.exports = SABnzbd;
