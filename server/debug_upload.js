const fs = require('fs');
const http = require('http');

// Create a dummy file
fs.writeFileSync('test_image.txt', 'This is a test image content');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

const fileContent = fs.readFileSync('test_image.txt');
const preCrlf = '\r\n';
const postCrlf = '\r\n';

const delimiter = `--${boundary}`;
const closeDelimiter = `--${boundary}--`;

const body = Buffer.concat([
    Buffer.from(`${delimiter}\r\nContent-Disposition: form-data; name="image"; filename="test_image.txt"\r\nContent-Type: text/plain\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n${closeDelimiter}`)
]);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/upload',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY LENGTH:', data.length);
        fs.writeFileSync('error.html', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(body);
req.end();
