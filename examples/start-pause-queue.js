const SABnzbd = require('..');

// Check command line.
if (process.argv.length != 4) {
  console.error('Use: %s API_URL API_KEY', process.argv[1].replace(/^.*\//, ''));
  process.exit(1);
}

// Instantiate handler.
const sabnzbd = SABnzbd(process.argv[2], process.argv[3]);

// Toggle queue status
sabnzbd.queue.status().then(function(status) {
  if (status.paused) {
    console.log('queue paused, resuming...');
    return sabnzbd.queue.resume();
  } else {
    console.log('queue active, pausing...');
    return sabnzbd.queue.pause();
  }
}).then(function() {
  console.log('waiting a bit');
  return new Promise(resolve => setTimeout(resolve, 2000));
}).then(function() {
  return sabnzbd.queue.status();
}).then(function(status) {
  if (status.paused) {
    console.log('queue paused, resuming...');
    return sabnzbd.queue.resume();
  } else {
    console.log('queue active, pausing...');
    return sabnzbd.queue.pause();
  }
}).then(function() {
  console.log('done playing...');
});
