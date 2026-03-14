const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ENDPOINT = '/api/characters?limit=20';
const CONCURRENT_USERS = parseInt(process.env.USERS || '50', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION || '10', 10);

console.log(`Starting load test against ${BASE_URL}${ENDPOINT}`);
console.log(`Simulating ${CONCURRENT_USERS} concurrent users for ${DURATION_SECONDS} seconds...`);

const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  startTimes: [],
  durations: [],
  errors: {}
};

// Helper function to make a single request
function makeRequest() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(BASE_URL + ENDPOINT);
    const client = url.protocol === 'https:' ? https : http;

    stats.totalRequests++;

    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        stats.durations.push(duration);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
          const statusStr = `Status ${res.statusCode}`;
          stats.errors[statusStr] = (stats.errors[statusStr] || 0) + 1;
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      const duration = Date.now() - startTime;
      stats.durations.push(duration);
      stats.failedRequests++;
      const errMsg = e.message;
      stats.errors[errMsg] = (stats.errors[errMsg] || 0) + 1;
      resolve();
    });

    req.end();
  });
}

// Function to run a single user loop
async function runUserLoop(endTime) {
  while (Date.now() < endTime) {
    await makeRequest();
    // Optional: Add a small sleep here to simulate think time
    // await new Promise(r => setTimeout(r, 100));
  }
}

// Main execution
async function runTest() {
  const testStartTime = Date.now();
  const testEndTime = testStartTime + (DURATION_SECONDS * 1000);

  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(runUserLoop(testEndTime));
  }

  await Promise.all(userPromises);

  const testDurationMs = Date.now() - testStartTime;
  
  // Calculate statistics
  const reqPerSec = (stats.totalRequests / (testDurationMs / 1000)).toFixed(2);
  
  stats.durations.sort((a, b) => a - b);
  const minLatency = stats.durations[0] || 0;
  const maxLatency = stats.durations[stats.durations.length - 1] || 0;
  
  const avgLatency = stats.durations.length > 0 
    ? (stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length).toFixed(2) 
    : 0;
    
  let p95Latency = 0;
  if (stats.durations.length > 0) {
    const p95Index = Math.floor(stats.durations.length * 0.95);
    p95Latency = stats.durations[p95Index];
  }

  console.log('\n--- Load Test Results ---');
  console.log(`Duration          : ${(testDurationMs / 1000).toFixed(2)} seconds`);
  console.log(`Total Requests    : ${stats.totalRequests}`);
  console.log(`Requests/sec (RPS): ${reqPerSec}`);
  console.log(`Successful Req    : ${stats.successfulRequests}`);
  console.log(`Failed Req        : ${stats.failedRequests}`);
  console.log('\n--- Latency Metrics ---');
  console.log(`Min Latency       : ${minLatency} ms`);
  console.log(`Max Latency       : ${maxLatency} ms`);
  console.log(`Avg Latency       : ${avgLatency} ms`);
  console.log(`p95 Latency       : ${p95Latency} ms`);

  if (Object.keys(stats.errors).length > 0) {
    console.log('\n--- Errors Encountered ---');
    for (const [error, count] of Object.entries(stats.errors)) {
      console.log(`  ${error}: ${count} times`);
    }
  } else {
    console.log('\nNo errors encountered!');
  }
}

runTest().catch(console.error);
