var spawn = require('child_process').spawn
  , stream = require('stream')
  , Duplex = stream.Duplex
  , Readable = stream.Readable
  , util = require('util')
  , fs = require('fs');

// Node pre v0.10.0 comp.
if (!Duplex) Duplex = require('readable-stream').Duplex;
if (!Readable) Readable = require('readable-stream').Readable;

function wrapper(binary) {
  if (!(this instanceof wrapper)) 
    return new wrapper(binary);

  Duplex.call(this);

  this._binary=binary;
  this.args = [];
}

util.inherits(wrapper,Duplex);

/**
 * Implementing _read
 *
 * @api private
 */
  
wrapper.prototype._read = function (n) {
  return this.push('');
};

/**
 * Implementing _write
 *
 * @api private
 */
  
wrapper.prototype._write = function (chunk, encoding, callback) {
  if (this.dest) {
    this.dest.write(chunk, encoding, callback);
    return;
  }
  
  this.once('spawn', function () {
    this._write(chunk, encoding, callback);
  });
},

/**
 * Read data from path
 *
 * @param {String} path
 * @api public
 */
 
wrapper.prototype.from = function (path) {
  var read = fs.createReadStream(path);
  read.on('error', _onerror.bind(this));
  read.pipe(this);
  return this;
};

/**
 * Write data to path
 *
 * @param {String} path
 * @api public
 */
 
wrapper.prototype.to = function (path) {
  var write = fs.createWriteStream(path);
  write.on('error', _onerror.bind(this));
  this.pipe(write);
  return this;
};

/**
 * Add arguments
 *
 * @param {String} argument
 * @param {String} argument
 * @api public
 */
 
wrapper.prototype.addArgs = function (k,v) {
  this.args.push(k);
  if (v!==undefined) this.args.push(v);
  return this;
};

/**
 * Prepend arguments
 *
 * @param {String} argument
 * @param {String} argument
 * @api public
 */
 
wrapper.prototype.prependArgs = function (k,v) {
  if (v!==undefined) this.args.unshift(v);
  this.args.unshift(k);
  return this;
};

/**
 * Spawn process
 *
 * @api public
 */
 
wrapper.prototype.spawn = function () {
  process.nextTick(_spawn.bind(this));
  return this;
};

function _spawn () {
  var onerror = _onerror.bind(this);

console.log("spawning "+this._binary+" "+JSON.stringify(this.args));
  var proc = spawn(this._binary, this.args);
  
  var stdout = proc.stdout;
  if (!stdout.read) {
    stdout = new Readable();
    stdout.wrap(proc.stdout);
  }
  stdout.on('end', this.push.bind(this, null));
  stdout.on('data', this.push.bind(this));
  stdout.on('error', onerror);
    
  var stderr = proc.stderr;
  stderr.on('data', onerror);
  stderr.on('error', onerror);
  
  var stdin = proc.stdin;
  stdin.on('error', onerror);
  this.on('finish', stdin.end.bind(stdin));
  
  this.source = stdout;
  this.dest = stdin;
  this.emit('spawn', proc);
}      

function _onerror (err) {
  if (!util.isError(err)) err = new Error(err.toString());
  this.emit('error', err);
}

module.exports = exports = wrapper;
