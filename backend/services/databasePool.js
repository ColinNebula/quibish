// Advanced Database Connection Pool
const EventEmitter = require('events');

class DatabasePool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connections = [];
    this.available = [];
    this.pending = [];
    this.options = {
      min: options.min || 2,
      max: options.max || 10,
      acquireTimeoutMillis: options.acquireTimeoutMillis || 30000,
      createTimeoutMillis: options.createTimeoutMillis || 30000,
      idleTimeoutMillis: options.idleTimeoutMillis || 300000,
      reapIntervalMillis: options.reapIntervalMillis || 30000,
      createRetryIntervalMillis: options.createRetryIntervalMillis || 200,
      validateOnBorrow: options.validateOnBorrow !== false,
      ...options
    };
    
    this.destroyed = false;
    this.stats = {
      created: 0,
      destroyed: 0,
      borrowed: 0,
      returned: 0,
      pending: 0,
      errors: 0
    };
    
    this.initialize();
  }

  async initialize() {
    // Create minimum connections
    for (let i = 0; i < this.options.min; i++) {
      try {
        await this.createConnection();
      } catch (error) {
        console.error('Failed to create initial connection:', error);
      }
    }
    
    // Start reaper for idle connections
    this.startReaper();
    
    console.log(`✅ Database pool initialized with ${this.available.length} connections`);
  }

  async createConnection() {
    if (this.connections.length >= this.options.max) {
      throw new Error('Maximum connections reached');
    }

    const connection = {
      id: Date.now() + Math.random(),
      created: Date.now(),
      lastUsed: Date.now(),
      borrowed: false,
      valid: true,
      queries: 0
    };

    // Simulate database connection creation
    await new Promise(resolve => setTimeout(resolve, 50));

    this.connections.push(connection);
    this.available.push(connection);
    this.stats.created++;

    this.emit('connectionCreated', connection);
    return connection;
  }

  async acquire() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.resolve === resolve);
        if (index >= 0) {
          this.pending.splice(index, 1);
          this.stats.pending--;
        }
        reject(new Error('Acquire timeout'));
      }, this.options.acquireTimeoutMillis);

      const request = {
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: Date.now()
      };

      if (this.available.length > 0) {
        this.borrowConnection(request);
      } else if (this.connections.length < this.options.max) {
        this.createConnection()
          .then(() => this.borrowConnection(request))
          .catch(error => request.reject(error));
      } else {
        this.pending.push(request);
        this.stats.pending++;
      }
    });
  }

  async borrowConnection(request) {
    const connection = this.available.shift();
    if (!connection) {
      return request.reject(new Error('No connections available'));
    }

    if (this.options.validateOnBorrow && !await this.validateConnection(connection)) {
      await this.destroyConnection(connection);
      if (this.available.length > 0 || this.connections.length < this.options.max) {
        if (this.connections.length < this.options.max) {
          try {
            await this.createConnection();
          } catch (error) {
            return request.reject(error);
          }
        }
        return this.borrowConnection(request);
      } else {
        return request.reject(new Error('Connection validation failed'));
      }
    }

    connection.borrowed = true;
    connection.lastUsed = Date.now();
    connection.queries++;
    this.stats.borrowed++;

    request.resolve(connection);
  }

  async release(connection) {
    if (!connection || !connection.borrowed) {
      return;
    }

    connection.borrowed = false;
    connection.lastUsed = Date.now();
    this.stats.returned++;

    // Check if connection is still valid
    if (!await this.validateConnection(connection)) {
      await this.destroyConnection(connection);
      
      // Create replacement if below minimum
      if (this.connections.length < this.options.min) {
        try {
          await this.createConnection();
        } catch (error) {
          console.error('Failed to create replacement connection:', error);
        }
      }
    } else {
      this.available.push(connection);
    }

    // Process pending requests
    if (this.pending.length > 0 && this.available.length > 0) {
      const request = this.pending.shift();
      this.stats.pending--;
      this.borrowConnection(request);
    }

    this.emit('connectionReleased', connection);
  }

  async validateConnection(connection) {
    try {
      // Simulate connection validation
      await new Promise(resolve => setTimeout(resolve, 10));
      return connection.valid && (Date.now() - connection.created < 3600000); // 1 hour max age
    } catch (error) {
      return false;
    }
  }

  async destroyConnection(connection) {
    const index = this.connections.indexOf(connection);
    if (index >= 0) {
      this.connections.splice(index, 1);
    }

    const availableIndex = this.available.indexOf(connection);
    if (availableIndex >= 0) {
      this.available.splice(availableIndex, 1);
    }

    connection.valid = false;
    this.stats.destroyed++;

    this.emit('connectionDestroyed', connection);
  }

  startReaper() {
    this.reaperInterval = setInterval(() => {
      const now = Date.now();
      const toDestroy = this.available.filter(conn => 
        now - conn.lastUsed > this.options.idleTimeoutMillis &&
        this.connections.length > this.options.min
      );

      toDestroy.forEach(conn => this.destroyConnection(conn));

      if (toDestroy.length > 0) {
        console.log(`🗑️  Reaped ${toDestroy.length} idle connections`);
      }
    }, this.options.reapIntervalMillis);
  }

  getStats() {
    return {
      ...this.stats,
      total: this.connections.length,
      available: this.available.length,
      borrowed: this.connections.length - this.available.length,
      pending: this.pending.length,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  async drain() {
    // Wait for all borrowed connections to be returned
    while (this.connections.some(conn => conn.borrowed)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Destroy all connections
    for (const connection of [...this.connections]) {
      await this.destroyConnection(connection);
    }

    // Clear reaper
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
    }

    this.destroyed = true;
    console.log('📊 Database pool drained');
  }

  // Transaction support
  async transaction(callback) {
    const connection = await this.acquire();
    
    try {
      // Begin transaction (simulated)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await callback(connection);
      
      // Commit transaction (simulated)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return result;
    } catch (error) {
      // Rollback transaction (simulated)
      await new Promise(resolve => setTimeout(resolve, 10));
      throw error;
    } finally {
      await this.release(connection);
    }
  }
}

// Query builder for optimized queries
class QueryBuilder {
  constructor() {
    this.query = {
      select: [],
      from: '',
      joins: [],
      where: [],
      groupBy: [],
      having: [],
      orderBy: [],
      limit: null,
      offset: null
    };
  }

  select(fields) {
    this.query.select = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  from(table) {
    this.query.from = table;
    return this;
  }

  where(condition, value) {
    this.query.where.push({ condition, value });
    return this;
  }

  join(table, on) {
    this.query.joins.push({ type: 'JOIN', table, on });
    return this;
  }

  leftJoin(table, on) {
    this.query.joins.push({ type: 'LEFT JOIN', table, on });
    return this;
  }

  orderBy(field, direction = 'ASC') {
    this.query.orderBy.push({ field, direction });
    return this;
  }

  limit(count) {
    this.query.limit = count;
    return this;
  }

  offset(count) {
    this.query.offset = count;
    return this;
  }

  build() {
    let sql = `SELECT ${this.query.select.join(', ')} FROM ${this.query.from}`;
    
    this.query.joins.forEach(join => {
      sql += ` ${join.type} ${join.table} ON ${join.on}`;
    });

    if (this.query.where.length > 0) {
      sql += ' WHERE ' + this.query.where.map(w => w.condition).join(' AND ');
    }

    if (this.query.orderBy.length > 0) {
      sql += ' ORDER BY ' + this.query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ');
    }

    if (this.query.limit) {
      sql += ` LIMIT ${this.query.limit}`;
    }

    if (this.query.offset) {
      sql += ` OFFSET ${this.query.offset}`;
    }

    return sql;
  }

  // Execute with connection pool
  async execute(pool) {
    const connection = await pool.acquire();
    try {
      const sql = this.build();
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      // Return mock results
      return {
        rows: [],
        rowCount: 0,
        sql,
        executionTime: Math.random() * 100
      };
    } finally {
      await pool.release(connection);
    }
  }
}

module.exports = { DatabasePool, QueryBuilder };