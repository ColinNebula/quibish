#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

class ServerMonitor {
    constructor() {
        this.servers = [
            { name: 'Backend', url: 'http://localhost:5001/api/ping', port: 5001 },
            { name: 'Frontend', url: 'http://localhost:3000', port: 3000 }
        ];
        this.checkInterval = 30000; // 30 seconds
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
    }

    async checkServer(server) {
        return new Promise((resolve) => {
            const options = {
                timeout: 5000,
                headers: { 'User-Agent': 'Server-Monitor' }
            };

            const req = http.get(server.url, options, (res) => {
                if (res.statusCode === 200) {
                    resolve({ success: true, server: server.name });
                } else {
                    resolve({ success: false, server: server.name, error: `Status: ${res.statusCode}` });
                }
            });

            req.on('error', (error) => {
                resolve({ success: false, server: server.name, error: error.message });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({ success: false, server: server.name, error: 'Timeout' });
            });
        });
    }

    async restartServer(serverName) {
        console.log(`🔄 Attempting to restart ${serverName}...`);
        
        try {
            if (serverName === 'Backend') {
                // Kill existing backend process
                spawn('taskkill', ['/F', '/IM', 'node.exe'], { stdio: 'ignore' });
                await this.sleep(2000);
                
                // Start backend
                const backend = spawn('node', ['server.js'], { 
                    cwd: './backend',
                    detached: true,
                    stdio: 'ignore'
                });
                backend.unref();
                
            } else if (serverName === 'Frontend') {
                // Frontend restart via PM2 or manual process
                console.log(`Frontend restart requires manual intervention`);
            }
            
            console.log(`✅ ${serverName} restart initiated`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to restart ${serverName}:`, error.message);
            return false;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async monitorServers() {
        console.log(`🔍 Starting server monitoring... (Check interval: ${this.checkInterval}ms)`);
        
        setInterval(async () => {
            const timestamp = new Date().toISOString();
            console.log(`\n[${timestamp}] Health Check`);
            
            for (const server of this.servers) {
                const result = await this.checkServer(server);
                
                if (result.success) {
                    console.log(`✅ ${result.server}: OK`);
                } else {
                    console.log(`❌ ${result.server}: ${result.error}`);
                    
                    // Attempt restart
                    let retryCount = 0;
                    while (retryCount < this.maxRetries) {
                        console.log(`🔄 Retry ${retryCount + 1}/${this.maxRetries} for ${result.server}`);
                        
                        const restarted = await this.restartServer(result.server);
                        if (restarted) {
                            await this.sleep(this.retryDelay);
                            const recheckResult = await this.checkServer(server);
                            
                            if (recheckResult.success) {
                                console.log(`✅ ${result.server}: Recovered successfully`);
                                break;
                            }
                        }
                        
                        retryCount++;
                        if (retryCount < this.maxRetries) {
                            await this.sleep(this.retryDelay);
                        }
                    }
                    
                    if (retryCount === this.maxRetries) {
                        console.log(`🚨 ${result.server}: Failed to recover after ${this.maxRetries} attempts`);
                        // Could send alert/notification here
                    }
                }
            }
        }, this.checkInterval);
    }
}

// Start monitoring
const monitor = new ServerMonitor();
monitor.monitorServers();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server monitor...');
    process.exit(0);
});