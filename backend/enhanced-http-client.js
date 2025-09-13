// Enhanced HTTP Client with Advanced Connection Management
const http = require('http');
const https = require('https');
const { URL } = require('url');

class EnhancedHTTPClient {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      retryDelay: options.retryDelay || 1000,
      keepAlive: options.keepAlive !== false,
      maxSockets: options.maxSockets || 50,
      maxFreeSockets: options.maxFreeSockets || 10,
      ...options
    };
    
    // Create HTTP agents with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: this.options.keepAlive,
      keepAliveMsecs: 30000,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
      scheduling: 'fifo' // First-in, first-out scheduling
    });
    
    this.httpsAgent = new https.Agent({
      keepAlive: this.options.keepAlive,
      keepAliveMsecs: 30000,
      maxSockets: this.options.maxSockets,
      maxFreeSockets: this.options.maxFreeSockets,
      timeout: this.options.timeout,
      scheduling: 'fifo'
    });
    
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }
  
  async request(url, options = {}) {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Enhanced-HTTP-Client/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...options.headers
      },
      agent: isHttps ? this.httpsAgent : this.httpAgent,
      timeout: options.timeout || this.options.timeout
    };
    
    // Add content headers if body is present
    if (options.body) {
      if (typeof options.body === 'object') {
        requestOptions.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
      }
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }
    
    this.stats.requests++;
    
    let lastError;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const response = await this._makeRequest(requestOptions, options.body, isHttps);
        
        // Update stats
        const responseTime = Date.now() - startTime;
        this.stats.successes++;
        this.stats.totalResponseTime += responseTime;
        this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.successes;
        
        if (attempt > 0) {
          this.stats.retries += attempt;
          console.log(`✅ Request succeeded after ${attempt} retries`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.options.retries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this._delay(delay);
        }
      }
    }
    
    this.stats.failures++;
    throw lastError;
  }
  
  _makeRequest(options, body, isHttps) {
    return new Promise((resolve, reject) => {
      const lib = isHttps ? https : http;
      
      const req = lib.request(options, (res) => {
        let data = '';
        
        // Handle different encodings
        if (res.headers['content-encoding'] === 'gzip') {
          const zlib = require('zlib');
          const gunzip = zlib.createGunzip();
          res.pipe(gunzip);
          
          gunzip.on('data', (chunk) => {
            data += chunk;
          });
          
          gunzip.on('end', () => {
            resolve(this._parseResponse(res, data));
          });
          
          gunzip.on('error', reject);
        } else {
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve(this._parseResponse(res, data));
          });
        }
        
        res.on('error', reject);
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (body) {
        req.write(body);
      }
      
      req.end();
    });
  }
  
  _parseResponse(res, data) {
    const response = {
      status: res.statusCode,
      statusText: res.statusMessage,
      headers: res.headers,
      data: data
    };
    
    // Try to parse JSON
    if (res.headers['content-type']?.includes('application/json')) {
      try {
        response.data = JSON.parse(data);
      } catch (e) {
        console.warn('Failed to parse JSON response');
      }
    }
    
    return response;
  }
  
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Convenience methods
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }
  
  async post(url, data, options = {}) {
    return this.request(url, { ...options, method: 'POST', body: data });
  }
  
  async put(url, data, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body: data });
  }
  
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
  
  // Get client statistics
  getStats() {
    return { ...this.stats };
  }
  
  // Reset statistics
  resetStats() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }
  
  // Destroy agents and clean up
  destroy() {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// Test function for the enhanced client
async function testEnhancedClient() {
  console.log('🧪 Testing Enhanced HTTP Client...');
  
  const client = new EnhancedHTTPClient({
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
  });
  
  try {
    console.log('Testing health endpoint...');
    const healthResponse = await client.get('http://localhost:5001/api/health');
    console.log('✅ Health check response:', {
      status: healthResponse.status,
      message: healthResponse.data.message
    });
    
    console.log('Testing network diagnostics...');
    const diagResponse = await client.get('http://localhost:5001/api/network/diagnostics');
    console.log('✅ Diagnostics response status:', diagResponse.status);
    
    console.log('Testing connection test...');
    const testResponse = await client.get(`http://localhost:5001/api/network/test?timestamp=${Date.now()}`);
    console.log('✅ Connection test response:', {
      status: testResponse.status,
      latency: testResponse.data.data.latency
    });
    
    console.log('Testing auth login...');
    const loginResponse = await client.post('http://localhost:5001/api/auth/login', {
      username: 'admin',
      password: 'admin'
    });
    console.log('✅ Login response:', {
      status: loginResponse.status,
      success: loginResponse.data.success
    });
    
    console.log('\n📊 Client Statistics:');
    console.log(client.getStats());
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.destroy();
  }
}

module.exports = { EnhancedHTTPClient, testEnhancedClient };

// Run test if this file is executed directly
if (require.main === module) {
  testEnhancedClient();
}