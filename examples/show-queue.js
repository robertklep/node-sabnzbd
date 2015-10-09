var SABnzbd = require('../lib/sabnzbd');

// Check command line.
if (process.argv.length != 4) {
  console.error('Use: %s API_URL API_KEY', process.argv[1].replace(/^.*\//, ''));
  process.exit(1);
}

// Instantiate handler.
var sabnzbd = SABnzbd(process.argv[2], process.argv[3]);

// Load a list of history and queued items.
console.log('Queue + History:');
sabnzbd.entries().each(function(entry) {
  console.log('-', 
    entry.name, 
    entry.size / 1000 / 1000, 'MB', 
    entry.status,
    entry._history_slot ? 'H' : 'Q'
  );
});
