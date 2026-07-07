const http = require('http');

async function sendMoistureData() {
  const moisture = Math.floor(Math.random() * 100); // Random 0-100
  const data = JSON.stringify({ moisture });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/sensor',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
      process.stdout.write(d);
    });
  });

  req.on('error', (e) => {
    console.error(e);
  });

  req.write(data);
  req.end();
}

// Send data every 5 seconds
setInterval(sendMoistureData, 5000);
console.log('Sending test data every 5 seconds...');
