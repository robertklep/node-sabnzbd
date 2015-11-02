# node-sabnzbd

Node API client for [SABnzbd](http://www.sabnzbd.org/).

## TL;DR

```javascript
var SABnzbd = require('sabnzbd');
var sabnzbd = SABnzbd('http://localhost:8080/', API_KEY);

console.log('Queue + History:');
sabnzbd.entries().each(function(entry) {
  console.log('-', entry.name, ',', entry.size / 1000 / 1000, 'MB');
});
```

## Installation

```
$ npm install sabnzbd
```

You'll also need the API key for your SABnzbd installation:

- open the SABnzbd web interface in your browser
- go to `Config > General`
- in the _SABnzbd Web Server_ settings, find the API key (or generate one)
- note down the API key

## Client basics

This client consists of three parts:

- common commands
- commands related to the SABnzbd queue (the list of currently active downloads)
- commands related to the SABnzbd history (the list of completed downloads)

For the most part, the client implements the commands found on [the SABnzbd API page](http://wiki.sabnzbd.org/api), and returns their results pretty much as-is.

However, because the SABnzbd API is horribly inconsistent at times, I've added some normalization (see the `status` and `entries` commands) to make interfacing with it a bit easier. Another thing is that the SABnzbd API is not terribly informative on the status of some commands; for instance, the `remove` commands will always return a `true` status, even if you're using an nonexistent NZB id.

`sabnzbd` uses the [Bluebird promise library](https://github.com/petkaantonov/bluebird), which means that all commands return a promise.

## Commands

### Common commands

#### `new SABnzbd(URL, API_KEY)`

* Connects to SABnzbd. It will automatically perform a quick check to determine the SABnzbd version and to see if your API key is valid.
    
    _Arguments_:
    
    * `URL`
        - url to web interface of the SABnzbd
    * `API_KEY`
        - API key (required for most operations, see _Install_ on how to get it)
    
    _Returns_:
    
    * an `SABnzbd` instance

#### `instance.status()`

* The results of `queue.status()` and `history.status()` (see below), merged (**NB**: for now, only the `slots` and `entries` are actually merged, the rest of the object returned is based on the object returned by the `queue.status()` method).

#### `instance.entries()`

* The results of `queue.entries()` and `history.entries()` (see below), merged.

#### `instance.delete(ID[, ID, ...])`
 
* Delete an NZB from both queue and history.

    _Arguments_:

    * `ID`
        - id of NZB (the `nzbid` property of queue/history entries)

    Accepts multiple `ID` arguments, or one argument containing the string `all` to remove everything from both queue and history (so be careful!).

#### `instance.version()`

* Query the SABnzbd version.

    _Returns_:

    * the SABnzbd version as reported by the server

#### `instance.cmd(CMD[, ARGS])`

* Send a command to the SABnzbd.

    _Arguments_:

    * `CMD`
        - command to send
    * `ARGS`
        - optional object of _key/value_ parameters

    (for all commands and their arguments, check the [the SABnzbd API page](http://wiki.sabnzbd.org/api))

    For example, the `version()` method is implemented like this:

    ```javascript
    return this.cmd('version');
    ```

### Queue-related commands

#### `instance.queue.status()`

* Get status of the SABnzbd queue.

    _Returns_:

    * the output of the [advanced queue command](http://wiki.sabnzbd.org/api#toc8), with an extra property `entries` containing a normalized version of the `slots` property
    
    A normalized queue entry contains the following properties:
    
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
        _queue_slot : boolean (always true) to identify this as a queue entry

#### `instance.queue.entries()`

* Get just the `entries` property from the queue.

#### `instance.queue.delete(ID)`

* Delete an NZB from the queue. See `instance.delete()` for arguments.

#### `instance.queue.addurl(URL[, ARGS)`

* Add an NZB to the queue by URL. Or an ARGS object.
    
    _Arguments_:
    
    * `URL`
        - url pointing to an NZB file
    * `ARGS` [Sab API Docs](http://wiki.sabnzbd.org/api#toc28)
        - Optional object any of the following options `pp`=Post Process Level, `script`=Post Process Script, `cat`=Category, `priority`=Priority

#### `instance.queue.pause([ID])`

* Pause downloading. Without arguments, pauses the entire queue. Otherwise, just pauses downloading of a single NZB.
    
    _Arguments_:
    
    * `ID`
        - id of NZB (the `nzbid` property of queue/history entries)

#### `instance.queue.resume([ID])`

* Resume downloading. Without arguments, resumes the entire queue. Otherwise, just resumes downloading of a single NZB.
    
    _Arguments_:
    
    * `ID`
        - id of NZB (the `nzbid` property of queue/history entries)

### History-related commands

#### `instance.history.status()`

* Get status of the SABnzbd history.
    
    _Returns_:

    * the output of the [history command](http://wiki.sabnzbd.org/api#toc11), with, again, an extra `entries` property

    A normalized history entry contains the following properties:
    
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
        status         : status (see queue entry)
        downloaded_to  : file/directory this NZB was downloaded to
        url            : ?
        url_info       : ?
        _history_slot  : boolean (always true) to identify this as a history entry

#### `instance.history.entries()`

* Get just the `entries` property from the queue.

#### `instance.history.delete(ID)`

* Delete an NZB from the history. See `instance.delete()` for arguments.

Changelog
---------

* **1.0.0**
    * dropped Q in favor of Bluebird, tightened up code
* **0.2.0**
    * pretty much a rewrite of the API
* **0.1.1**
    * removed some left-over debugging code
* **0.1.0**
    * initial release

TODO
----

* README:
    - documentation formatting sucks
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
