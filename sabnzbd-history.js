(function() {

  // SABnzbd history class
  var SABnzbdHistory = function(delegate) {
    this.delegate = delegate;
  };

  // get history status
  SABnzbdHistory.prototype.status = function() {
    var delegate  = this.delegate;
    var this_     = this;

    return delegate.cmd('history').then(function(response) {
      var history = response.history || { slots: [] };

      // normalize history slots
      history.entries = history.slots.map(function(slot) {
        return this_.normalize(slot);
      });

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
    var args = Array.prototype.slice.call(arguments);

    return this.delegate.cmd('history', { 
      name  : 'delete', 
      value : args.join(",")
    });
  };

  // normalize history slot
  SABnzbdHistory.prototype.normalize = function(slot) {
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
  module.exports = SABnzbdHistory;
})();
