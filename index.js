'use strict'

/**
 * Algorithm.
 *
 * 1. Generate a new statil.
 *
 * 2. Buffer files until all of them have been read.
 *
 * 3. While buffering the files, for each file, register its source with the
 *    statil, rebasing relative to the current process's working directory and
 *    options.relativeDir (if any), then compile its template and register the
 *    compiled template with the statil.
 *
 * 4. When all files have been buffered, render all of them. Each rendered
 *    string is converted into a Buffer and written as the contents of the
 *    corresponding file stream.
 */

/******************************* Dependencies ********************************/

var _       = require('lodash')
var pt      = require('path')
var Statil  = require('statil')
var through = require('through2')

/********************************* Generator *********************************/

/**
 * Takes a hash of options and creates a stream that buffers the incoming
 * files while compiling the available complete files until the incoming
 * stream dries up, then renders all templates and pumps the results back into
 * the stream, producing a group of files with rendered template contents.
 *
 * Most of the options are passed directly to the statil constructor used
 * internally, but there are two additional options used by this generator:
 *
 * @name relativeDir
 * @type String
 * @description The name of the template directory relative to the current
 * process's working directory. Basically, this prefix will be stripped from
 * template paths for the purpose of $include calls inside templates. For
 * example, if templates are in ./src/templates and your gulpfile is in ./,
 * this value should be ./src/templates.
 *
 * @name locals
 * @type Hash
 * @description A hash table of "locals" (values made available to a template
 * when it's rendered) that will be supplied to each template.
 */
module.exports = function(options) {
  // Make sure options is an object to avoid future checks.
  if (!_.isObject(options)) options = Object.create(null)

  /**
   * Hash table to store each file object for reuse in the flush function.
   * @type Hash
   */
  var files = Object.create(null)

  /**
   * Directory relative to which we'll rebase file paths.
   * @type String
   */
  var templateDir = process.cwd();
  if (typeof options.relativeDir === 'string') {
    templateDir = pt.join(templateDir, options.relativeDir)
  }
  // Remove this key from the options.
  delete options.relativeDir

  /**
   * Locals that will be made available to each template.
   * @type Hash
   */
  var locals
  if (_.isObject(options.locals)) {
    locals = options.locals
  }
  // Remove this key from the options.
  delete options.locals

  /**
   * Statil instance used for this stream.
   * @type Statil
   */
  var statil = new Statil(options)

  /**
   * Transform function. Buffers the files and compiles their templates.
   * @type Function
   */
  function transform(file, e, callback) {
    // Ignore an empty file.
    if (file.isNull()) {
      callback()
      return
    }

    // Ignore a directory.
    if (file.isDirectory()) {
      callback()
      return
    }

    // I don't know how to deal with a stream.
    if (file.isStream()) {
      this.emit('error', new Error("I don't know how to deal with a stream"))
      callback()
      return
    }

    // Register the file under its path.
    files[file.path] = file

    // Register the file source and compile the template.
    try {
      statil.register(file.contents.toString(), file.path, templateDir)
    } catch (err) {
      this.emit('error', err)
      callback()
      return
    }

    callback()
  }

  /**
   * Flush function. Renders all templates and pumps the files back into the
   * stream.
   * @type Function
   */
  function flush(callback) {
    // Render each template, passing the locals, if any.
    try {
      var rendered = statil.renderAll(locals)
      // The returned value must be a hash.
      if (!_.isObject(rendered)) {
        throw new Error('unexpected return value from Statil#renderAll: ' + rendered)
      }
    } catch (err) {
      this.emit('error', err)
      callback()
      return
    }

    // For each file in the stream, find a matching rendered template under a
    // similar path, write back its contents, and push the file back into the
    // stream.
    _.each(files, function(file) {
      // Strip the file extension from the file path.
      var path = pt.join(pt.parse(file.path).dir, pt.parse(file.path).name)

      // Rebase the file path.
      path = pt.relative(templateDir, path)

      // Look for a matching rendered template. Emit an error if not found.
      if (!rendered[path]) {
        this.emit('error', new Error("couldn't render template at path: " + file.path))
        callback()
        return
      }

      // Write the rendered content to a clone and push the file into the stream.
      file = file.clone({contents: false})
      file.contents = new Buffer(rendered[path])
      this.push(file)
    }, this)

    // Signal the readiness.
    callback()
  }

  // Create and return the stream that will buffer and process files.
  return through.obj(transform, flush)

}
