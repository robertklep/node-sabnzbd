node-sabnzbd
============

Node interface for [SABnzbd](http://www.sabnzbd.org/).

**NOT FULLY TESTED YET**

TL;DR
-----

    var SABnzbd = require('sabnzbd');
    var sabnzbd = new SABnzbd('http://localhost:8080/', API_KEY);

    console.log('Queue + History:');
    sabnzbd.all().then(function(queue) {
      queue.entries.forEach(function(slot) {
        console.log('-', slot.name, ',', slot.size / 1000 / 1000, 'MB');
      });
    });

Install
-------

* Install module first:
    - local installation: `npm install sabnzbd`
    - global installation: `npm install sabnzbd -g`
* Get the API key from your SABnzbd:
    - open SABnzbd web interface in your browser
		- go to `Config > General`
		- in the _SABnzbd Web Server_ settings, find the API key (or generate
			one)
		- note down the API key, you'll need it

API
---

For the most part, the API implements the commands found on [the SABnzbd
API page](http://wiki.sabnzbd.org/api), and returns their results pretty
much as-is.

However, because the SABnzbd API is horribly inconsistent at times, I've
added some normalization (see `queue` and `history` commands) to make
interfacing with it a bit easier.

SABnzbd has two main lists: the queue and the history. The queue contains
all active downloads (the ones that haven't finished yet), the history
contains all completed downloads.

`sabnzbd` uses [Kris Kowal's `q` library](https://github.com/kriskowal/q),
which means that most commands return a promise.

### `new SABnzbd(URL, API_KEY)`

Connects to SABnzbd. It will automatically perform a quick check to
determine the SABnzbd version and to see if your API key is valid.

Arguments:

* `URL`: url to web interface of the SABnzbd
* `API_KEY`: API key (required for most operations, see _Install_ on how to
	get it)

Returns:

* an `SABnzbd` instance

### `instance.queue()`

Get contents of the SABnzbd queue.

Returns the output of the [advanced queue command](http://wiki.sabnzbd.org/api#toc8),
with an extra property `entries` containing a normalized version of the `slots` property:

An entry contains the following properties:

    age         : age of NZB posting, in seconds
    size        : size of download in bytes
    size_left   : number of bytes still to download before completion
    nzbid       : internal SABnzbd id for this NZB
    category    : categories
    eta         : ETA for download, as Date object
    name        : NZB filename
    nzbname     : NZB filename
    percentage  : percentage downloaded
    index       : index into queue
    missing     : ?
    priority    : ?
    status      : download status ('Completed', 'Paused', 'Queued,
                  'Failed', 'Verifying', 'Downloading', 'Extracting')
    time_left   : time left before download should be complete, in seconds

### `instance.history()`

Get contents of the SABnzbd history. Returns the output of the [history
command](http://wiki.sabnzbd.org/api#toc11), with, again, an extra
`entries` property:

    action_line    : ?
    size           : size in bytes
    category       : categories
    completed      : completed timestamp, as Date object
    completeness   : ?
    download_time  : download time in seconds
    downloaded     : number of downloaded bytes
    fail_message   : message why download failed
    id             : internal id (not the same as `nzbid`)
    loaded         : ?
    meta           : ?
    name           : name of download
    nzbname        : NZB filename
    nzbid          : internal SABnzbd id for this NZB
    incomplete_path: path where SABnzbd stored incomplete download
    postproc_time  : time in seconds it took to postprocess this NZB
    pp             : ?
    report         : ?
    retry          : ?
    script         : ?
    script_line    : ?
    script_log     : ?
    show_details   : ?
    stage_log      : list of actions taken by SABnzbd to download/process
                     this NZB
    status         : status (see above)
    downloaded_to  : file/directory this NZB was downloaded to
    url            : ?
    url_info       : ?

### `instance.all()`

Returns the contents of both the `queue` and `history` commands combined
(**NB**: for now, only the `slots` and `entries` are actually merged, the
rest of the object returned is based object returned by the `queue` command).

### `instance.addurl(URL)`

Add an NZB to the queue by URL.

Arguments:

* `URL`: url pointing to an NZB file

### `instance.pause(ID)`

Pause downloading of an NZB.

Arguments:

* `ID`: id of NZB (the `nzbid` property of queue/history entries)

### `instance.stop(ID)`

Alias for `instance.pause(ID)`

### `instance.resume(ID)`

Resume/start downloading of an NZB.

Arguments:

* `ID`: id of NZB (the `nzbid` property of queue/history entries)

### `instance.start(ID)`

Alias for `instance.resume(ID)`

### `instance.queue_remove(ID)`

Remove an NZB from the queue.

Arguments:

* `ID`: id of NZB (the `nzbid` property of queue/history entries)

### `instance.history_remove(ID)`

Remove an NZB from the history.

Arguments:

* `ID`: id of NZB (the `nzbid` property of queue/history entries)

### `instance.remove(ID)`

Remove an NZB from both queue and/or history.

## Internal API

### `instance.cmd(CMD[, ARGS])`

Send a command to the SABnzbd.

Arguments:

* `CMD`: command to send
* `ARGS`: optional object of _key/value_ parameters

(for all commands and their arguments, check the [the SABnzbd
API page](http://wiki.sabnzbd.org/api))

For example, the `instance.addurl()` method is implemented as such:

    return this.cmd('addurl', { name : url });

TODO
----

* Queue:
    - Add by upload/file path/newzbin ID
    - Scripts/actions/priority
    - Shutdown
    - Move
    - Change item name
* History:
    - Retry
* Configuration:
    - Everything
