const dns = require('dns');
console.log('Attempting to resolve SRV record for: _mongodb._tcp.cluster0.swxktqf.mongodb.net');
dns.resolveSrv('_mongodb._tcp.cluster0.swxktqf.mongodb.net', (err, addresses) => {
    if (err) {
        console.error('DNS Resolution Error:', err);
    } else {
        console.log('Resolved Addresses:', JSON.stringify(addresses, null, 2));
    }
});
