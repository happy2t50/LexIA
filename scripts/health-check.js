const http = require('http');

const services = [
  { name: 'OLAP Cube', port: 3001 },
  { name: 'Clustering ML', port: 3002 },
  { name: 'Auth', port: 3003 },
  { name: 'NLP', port: 3004 },
  { name: 'Search', port: 3005 },
  { name: 'Recommendations', port: 3006 },
  { name: 'Explanation', port: 3007 },
  { name: 'Geo Assistance', port: 3008 }
];

function checkHealth(service) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: service.port,
      path: '/health',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            name: service.name,
            port: service.port,
            status: response.status || 'OK',
            healthy: res.statusCode === 200
          });
        } catch (error) {
          resolve({
            name: service.name,
            port: service.port,
            status: 'ERROR',
            healthy: false,
            error: 'Invalid response'
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        name: service.name,
        port: service.port,
        status: 'DOWN',
        healthy: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        port: service.port,
        status: 'TIMEOUT',
        healthy: false,
        error: 'Connection timeout'
      });
    });

    req.end();
  });
}

async function checkAllServices() {
  console.log('🔍 Checking health of all microservices...\n');

  const results = await Promise.all(services.map(checkHealth));

  console.log('━'.repeat(60));
  console.log('SERVICE HEALTH CHECK RESULTS');
  console.log('━'.repeat(60));

  results.forEach((result) => {
    const icon = result.healthy ? '✅' : '❌';
    const status = result.healthy ? 'HEALTHY' : result.status;

    console.log(`${icon} ${result.name.padEnd(20)} [Port ${result.port}] - ${status}`);

    if (!result.healthy && result.error) {
      console.log(`   └─ Error: ${result.error}`);
    }
  });

  console.log('━'.repeat(60));

  const healthyCount = results.filter(r => r.healthy).length;
  const totalCount = results.length;

  console.log(`\n📊 Summary: ${healthyCount}/${totalCount} services are healthy`);

  if (healthyCount === totalCount) {
    console.log('🎉 All services are running!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some services are down. Please check the errors above.\n');
    process.exit(1);
  }
}

checkAllServices();
