var dateutil = require('dateutil');

// dateutil parser for ETA's
dateutil._parsers['sabnzbd'] = {
  test  : /^\s*[\d:]+\s+[a-zA-Z]{3}\s+\d+\s+[a-zA-Z]{3}\s*$/,
  parse : function(str) {
    var m = str.match(/^([\d:]+)\s+(.*)/);
    var t = [ m[2], (new Date()).getFullYear(), m[1] ].join(' ');
    return dateutil.parse(t);
  }
};

// SABnzbd queue class
var SABnzbdQueue = function(delegate) {
  this.delegate = delegate;
};

// get queue status
SABnzbdQueue.prototype.status = function(limit) {
  return this.delegate.cmd('queue', { limit : limit || 10e6 }).bind(this).then(function(r) {
    var queue = r.queue || { slots: [] };

    // normalize queue slots
    queue.entries = queue.slots.map(function(slot) {
      return this.normalize(slot);
    }, this);

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
SABnzbdQueue.prototype.addurl = function(url, args) {
  var params  = args || {};
  params.name = url;
  return this.delegate.cmd('addurl', params);
};

// pause entire queue (with no argument) or a single download (with
// a single 'id' argument)
SABnzbdQueue.prototype.pause = function(id) {
  if (id === undefined) {
    return this.delegate.cmd('pause');
  } else {
    return this.delegate.cmd('queue', { name : 'pause', value : id });
  }
};

// resume entire queue (with no argument) or a single download (with
// a single 'id' argument)
SABnzbdQueue.prototype.resume = function(id) {
  if (id === undefined) {
    return this.delegate.cmd('resume');
  } else {
    return this.delegate.cmd('queue', { name : 'resume', value : id });
  }
};

// delete (an) item(s) from the queue (or pass 'all' as single argument
// to remove everything from the queue)
SABnzbdQueue.prototype.delete = function() {
  var values = Array.prototype.join.call(arguments, ',');

  return this.delegate.cmd('queue', {
    name  : 'delete',
    value : values,
  });
};

// normalize queue slot
SABnzbdQueue.prototype.normalize = function(slot) {
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
    _queue_slot : true,
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

// done
module.exports = SABnzbdQueue;
