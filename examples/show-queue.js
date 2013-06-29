var SABnzbd = require('../lib/sabnzbd');

// Check command line.
if (process.argv.length != 4) {
  console.error('Use: %s API_URL API_KEY', process.argv[1].replace(/^.*\//, ''));
  process.exit(1);
}

// Instantiate handler.
var sabnzbd = new SABnzbd(process.argv[2], process.argv[3]);

// Load a list of history and queued items.
console.log('Queue + History:');
sabnzbd.entries().then(function(entries) {
  entries.forEach(function(entry) {
    console.log('-', 
      entry.name, 
      entry.size / 1000 / 1000, 'MB', 
      entry.status,
      entry._history_slot ? 'H' : 'Q'
    );
  });
});

/*
sabnzbd.queue.status()
.then(function(status) {
  if (status.paused)
  {
    console.log('queue paused, resuming...');
    return sabnzbd.queue.resume();
  }
  else
  {
    console.log('queue active, pausing...');
    return sabnzbd.queue.pause();
  }
})
.then(function() {
  console.log('waiting a bit');
  return Q.delay(5000);
})
.then(function() {
  return sabnzbd.queue.status();
})
.then(function(status) {
  if (status.paused)
  {
    console.log('queue paused, resuming...');
    return sabnzbd.queue.resume();
  }
  else
  {
    console.log('queue active, pausing...');
    return sabnzbd.queue.pause();
  }
})
.then(function() {
  console.log('done playing...');
});
*/
