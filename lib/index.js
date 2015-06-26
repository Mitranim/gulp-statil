'use strict';

/**
 * Algorithm.
 *
 * 1. Generate a new statil.
 *
 * 2. Buffer files until all of them have been read.
 *
 * 3. While buffering the files, register each of them with the statil,
 *    compiling its contents into a template function. File paths are rebased
 *    to process.cwd() (the directory whence you run gulp) and
 *    options.stripPrefix (if provided).
 *
 * 4. When all files have been buffered and compiled, render all templates,
 *    passing options.locals (if provided). Convert each rendered string into a
 *    Buffer and write it to a new virtual file. Pump them back into the stream.
 */

/******************************* Dependencies ********************************/

var _       = require('lodash');
var pt      = require('path');
var Statil  = require('statil');
var through = require('through2');
var File    = require('vinyl');

/********************************* Generator *********************************/

/**
 * Takes a hash of options and creates a stream that buffers the incoming
 * files while compiling the available files until the incoming stream dries up,
 * then renders all templates and pumps the results back into the stream,
 * producing a group of files with rendered contents.
 *
 * Most of the options are passed directly to the statil constructor used
 * internally, but there are additional options used by this generator:
 *
 * @name stripPrefix
 * @type String|Hash
 *
 * The name of the template directory relative to the current
 * process's working directory. Basically, this prefix will be stripped from
 * template paths for the purpose of $include calls inside templates. For
 * example, if templates are in ./src/templates and your gulpfile is in ./,
 * this value should be ./src/templates.
 *
 * `stripPrefix` can also be a hash table, mapping path patterns (keys) to path
 * prefixes (values). When a file path is rebased, it's checked against each
 * pattern until one matches, and it's rebased relatively to the value at
 * that path.
 *
 * @name locals
 * @type Hash
 *
 * A hash table of "locals" (values made available to a template
 * when it's rendered) that will be supplied to each template.
 */
module.exports = function(options) {
  // Make sure options is an object to avoid future checks.
  if (!_.isObject(options)) options = Object.create(null);

  /**
   * Directory relative to which we'll rebase file paths.
   * @type String
   */
  var templateDir = process.cwd();
  var stripPrefix = options.stripPrefix;
  if (typeof stripPrefix === 'string') {
    templateDir = pt.join(templateDir, options.stripPrefix);
  }
  // Remove this key from the options.
  delete options.stripPrefix;

  /**
   * Locals that will be made available to each template.
   * @type Hash
   */
  var locals
  if (_.isObject(options.locals)) {
    locals = options.locals;
  }
  // Remove this key from the options.
  delete options.locals;

  /**
   * Statil instance used for this stream.
   * @type Statil
   */
  var statil = new Statil(options);

  /**
   * Transform function. Registers the received file with the statil.
   * @type Function
   */
  function transform(file, e, done) {
    // Ignore an empty file.
    if (file.isNull()) {
      done();
      return;
    }

    // Ignore a directory.
    if (file.isDirectory()) {
      done();
      return;
    }

    // Statil can't process files in chunks.
    if (file.isStream()) {
      this.emit('error', new Error("statil can't process files in chunks"));
      done();
      return;
    }

    // Register the file with the statil.
    try {
      var path = pt.relative(templateDir, file.path);
      // Rebase each file individually.
      if (_.isObject(stripPrefix)) {
        _.each(stripPrefix, function(prefix, pattern) {
          if (path.match(pattern)) {
            path = pt.relative(prefix, path);
            return false;
          }
        });
      }
      statil.register(file.contents.toString(), path);
    } catch (err) {
      this.emit('error', err);
    }

    done();
  }

  /**
   * Flush function. Renders all templates and pumps the resulting files back
   * into the stream. The number of files may be different due to omitting
   * metadata files and creating new files via repetition.
   * @type Function
   */
  function flush(done) {
    // Render each template, passing the locals, if any.
    try {
      var rendered = statil.render(locals);
      // The returned value must be a hash.
      if (!_.isObject(rendered)) {
        throw new Error('unexpected return value from Statil#render: ' + rendered);
      }
    } catch (err) {
      this.emit('error', err);
      done();
      return;
    }

    // For each rendered file, create a new virtual file, write its contents,
    // and push it into the stream.
    _.each(rendered, function(result, path) {
      // Join the path back with process.cwd() (omitting options.stripPrefix, if
      // any).
      path = pt.join(process.cwd(), path);

      // Append .html to the path.
      path += '.html';

      // Create a new file and write the result to it.
      var file = new File({
        path: path,
        contents: new Buffer(result)
      });

      // Push it into the stream.
      this.push(file);
    }, this);

    // Signal the readiness.
    done();
  }

  // Create and return the stream that will buffer and process files.
  return through.obj(transform, flush);
}
