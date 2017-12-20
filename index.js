const got      = require('got');
const debug    = require('debug')('sabnzbd');
const url      = require('url');
const qs       = require('querystring');
const dateutil = require('dateutil');

// dateutil parser for ETA's
dateutil._parsers['sabnzbd'] = {
  test  : /^\s*[\d:]+\s+[a-zA-Z]{3}\s+\d+\s+[a-zA-Z]{3}\s*$/,
  parse : str => {
    let m = str.match(/^([\d:]+)\s+(.*)/);
    let t = [ m[2], (new Date()).getFullYear(), m[1] ].join(' ');
    return dateutil.parse(t);
  }
};

class Base {
  constructor(delegate, type) {
    this.delegate = delegate;
    this.type     = type;
  }

  status(limit) {
    return this.delegate.cmd(this.type, { limit : limit || 10e6 }).then(response => {
      response = response[this.type] || { slots : [] }

      // normalize slots
      response.entries = response.slots.map(slot => this.normalize(slot));

      // done
      return response;
    });
  }

  entries() {
    return this.status().then(response => response.entries);
  }

  // Delete (an) item(s) (pass 'all' as single argument to remove everything)
  delete(...args) {
    return this.delegate.cmd(this.type, {
      name  : 'delete',
      value : args.join(','),
    });
  };
}

class Queue extends Base {
  constructor(delegate) {
    super(delegate, 'queue');
  }

  // Add an NZB url to the queue.
  addurl(url, args) {
    let params  = args || {};
    params.name = url;
    return this.delegate.cmd('addurl', params);
  }

  // Pause entire queue (with no argument) or a
  // single download (with a single 'id' argument)
  pause(id) {
    if (id === undefined) {
      return this.delegate.cmd('pause');
    } else {
      return this.delegate.cmd('queue', { name : 'pause', value : id });
    }
  }

  // Resume entire queue (with no argument) or a
  // single download (with a single 'id' argument)
  resume(id) {
    if (id === undefined) {
      return this.delegate.cmd('resume');
    } else {
      return this.delegate.cmd('queue', { name : 'resume', value : id });
    }
  }

  // Normalize queue slot
  normalize(slot) {
    // parse timeleft
    let timeleft = slot.timeleft.replace(/^(\d+):(\d+):(\d+)/, (all, H, M, S) => {
      return Number(H) * 3600 + Number(M) * 60 + Number(S);
    });

    // parse ETA
    let eta = slot.eta == 'unknown' ? slot.eta : dateutil.parse(slot.eta);

    // parse age
    let age = slot.avg_age.replace(/^\s*(\d+).*/, (a, H) => Number(H) * 3600);

    // return a normalized object
    return {
      _queue_slot : true,
      age         : Number(age),
      size        : slot.mb * 1000 * 1000,
      size_left   : slot.mbleft * 1000 * 1000,
      nzbid       : slot.nzo_id,
      category    : slot.cat,
      eta         : eta,
      name        : slot.filename,
      nzbname     : slot.filename,
      percentage  : Number(slot.percentage),
      index       : slot.index,
      missing     : slot.missing,
      priority    : slot.priority,
      status      : slot.status,
      time_left   : Number(timeleft)
    };
  }
}

class History extends Base {
  constructor(delegate) {
    super(delegate, 'history');
  }

  // Normalize history slot
  normalize(slot) {
    return {
      _history_slot   : true,
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
  }
}

class SABnzbd {
  constructor(url, apiKey) {
    this.apiKey  = apiKey;
    this.queue   = new Queue(this);
    this.history = new History(this);

    // Attach API endpoint to url.
    if (! url.includes('/sabnzbd/api')) {
      url = url.replace(/\/?$/, '/sabnzbd/api');
    }
    this.url = url;

    // Check for valid endpoint.
    //this.version().then(version => debug('SABnzbd version: ' + version));

    // Check for valid API key.
    /*
    this.cmd('get_config').then(response => {
      if (response.status === false) {
        throw Error('Supplied API key was niet accepted by server');
      }
      debug('SABnzbd accepted supplied API key.');
    });
    */
  }

  // Get server version.
  version() {
    return this.cmd('version').then(r => r.version);
  }

  // Get both queue and history status, merged.
  status() {
    return Promise.all([ this.queue.status(), this.history.status() ]).then( ([ queue, history ]) => {
      // Merge slots
      queue.slots = (queue.slots || []).concat(history.slots);

      // Merge entries
      queue.entries = (queue.entries || []).concat(history.entries);

      return queue;
    });
  }

  // Get both queue and history entries.
  entries() {
    return this.status().then(r => r.entries);
  }

  // Delete (an) item(s) from both queue and history (or pass 'all' as
  // single argument to remove everything)
  delete(...args) {
    return Promise.all([
      this.queue  .delete(...args),
      this.history.delete(...args),
    ]).then( ([ queueStatus, historyStatus ]) => {
      return { status : queueStatus.status || historyStatus.status };
    });
  }

  // Perform command request.
  cmd(command, args) {
    // Build url for request.
    let url = this.url + '?' + qs.stringify({
      mode   : command,
      apikey : this.apiKey,
      output : 'json'
    });

    // Tack on any passed arguments
    if (args) {
      url += '&' + qs.stringify(args);
    }

    debug('Retrieving url `' + url + '`');

    // Perform request.
    return got(url, { json : true }).then(res => res.body);
  }

}

module.exports = SABnzbd;
