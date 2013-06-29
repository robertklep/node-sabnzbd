var SABnzbd = require('../lib/sabnzbd');
var sabnzbd = new SABnzbd(
	'http://192.168.23.12:9092/',
	'0d639867d1b8b3b9466d6712e521e6d5'
);
/*
var sabnzbd = new SABnzbd(
	'http://127.0.0.1:8080/',
	'3c83bf20ea9696ec49b99163e362620b',
  true);
*/

var Q = require('q');

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
