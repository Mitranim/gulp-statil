'use strict'

/******************************* Dependencies ********************************/

var _       = require('lodash')
var Statil  = require('statil')

/**
 * Mock require('statil') before requiring gulp-statil.
 */
var cached = _.find(require.cache, {exports: Statil})
var statilSpy = jasmine.createSpy('spy for Statil')
statilSpy.plan = Statil
cached.exports = statilSpy

var gst     = require('../index')
var through = require('through2')
var Stream  = require('stream')

/*********************************** Specs ***********************************/

// Testing a part of the test.
describe('statil spy', function() {

  beforeEach(function() {
    statilSpy.reset()
  })

  it('it returned from a `require` call', function() {
    expect(require('statil')).toBe(statilSpy)
  })

  it('calls through to the Statil constructor', function() {
    expect(require('statil')()).toEqual(jasmine.any(Statil))
  })

  it('properly responds to toHaveBeenCalled and not.toHaveBeenCalled', function() {
    expect(require('statil')).not.toHaveBeenCalled()
    require('statil')()
    expect(require('statil')).toHaveBeenCalled()
  })

})

describe('gulp-statil', function() {

  beforeEach(function() {
    statilSpy.reset()
  })

  it('is a function', function() {
    expect(typeof gst).toBe('function')
  })

  it('survives any input', function() {
    expect(_.wrap(gst, callWithDifferentInputs)).not.toThrow()
  })

  it('returns a stream', function() {
    expect(gst()).toEqual(jasmine.any(Stream))
  })

  it('creates a Statil instance during initialisation', function() {
    gst()
    expect(statilSpy).toHaveBeenCalled()
  })

  it('passes options to Statil', function() {
    var options = {secret: 'something special'}
    gst(options)
    expect(statilSpy).toHaveBeenCalledWith(options)
  })

  describe('transform function', function() {

    // Get hold of the function.
    beforeEach(function() {
      this.stream = gst()
      this.transform = this.stream._transform
      this.spy = jasmine.createSpy('callback spy')
    })

    it('ignores an empty file', function() {
      expect(this.transform.bind(this.stream, fileNull(), null, this.spy)).not.toThrow()
      expect(this.spy).toHaveBeenCalled()
    })

    it('ignores a directory', function() {
      expect(this.transform.bind(this.stream, fileDir(), null, this.spy)).not.toThrow()
      expect(this.spy).toHaveBeenCalled()
    })

    it('emits an error when given a stream', function() {
      spyOn(this.stream, 'emit')
      expect(this.transform.bind(this.stream, fileStream(), null, this.spy)).not.toThrow()
      expect(this.stream.emit).toHaveBeenCalledWith('error', jasmine.any(Error))
      expect(this.spy).toHaveBeenCalled()
    })

    it('passes files to Statil#register, including path and cwd', function() {
      spyOn(Statil.prototype, 'register').andCallThrough()
      expect(this.transform.bind(this.stream, file(), null, this.spy)).not.toThrow()
      expect(Statil.prototype.register).toHaveBeenCalledWith(
        file().contents.toString(), file().path, process.cwd()
      )
    })

    it("adds 'relativeDir' to the cwd", function() {
      spyOn(Statil.prototype, 'register').andCallThrough()

      var stream = gst({relativeDir: 'src/templates'})
      var transform = stream._transform

      expect(transform.bind(stream, file(), null, this.spy)).not.toThrow()
      expect(Statil.prototype.register).toHaveBeenCalledWith(
        file().contents.toString(), file().path, process.cwd() + '/src/templates'
      )
    })

    it('emits an error if #register fails', function() {
      spyOn(this.stream, 'emit')
      expect(this.transform.bind(this.stream, badFile(), null, this.spy)).not.toThrow()
      expect(this.stream.emit).toHaveBeenCalledWith('error', jasmine.any(Error))
      expect(this.spy).toHaveBeenCalled()
    })

  })

  describe('flush function', function() {

    // Get hold of the function.
    beforeEach(function() {
      this.locals = {secret: 'something special'}
      this.stream = gst({locals: this.locals})
      this.flush = this.stream._flush
      this.spy = jasmine.createSpy('callback spy')
    })

    // Create and register mock files.
    beforeEach(function() {
      // Mock template files.
      this.first = _.assign(file(), {
        contents: new Buffer('first <%= secret %> with <%= $meta.metaSecret %> and <%= firstSecret %>'),
        path:     'templates/first.html'
      })
      this.second = _.assign(file(), {
        contents: new Buffer('second <%= secret %> with <%= $meta.metaSecret %> and <%= secondSecret %>'),
        path:     'templates/second.html'
      })

      // Mock meta files.
      this.meta = _.assign(file(), {
        contents: new Buffer(JSON.stringify({
          metaSecret: 'something wild',
          files: {
            first: {firstSecret: 'rare pokemon'},
            second: {secondSecret: 'flying carpet'}
          }
        })),
        path: 'templates/meta.yaml'
      })

      // Register them.
      this.stream._transform(this.first,  null, _.noop)
      this.stream._transform(this.second, null, _.noop)
      this.stream._transform(this.meta,   null, _.noop)
    })

    it("calls Statil#renderAll, passing 'options.locals'", function() {
      spyOn(Statil.prototype, 'renderAll').andCallThrough()

      expect(this.flush.bind(this.stream, this.spy)).not.toThrow()

      expect(Statil.prototype.renderAll).toHaveBeenCalledWith(this.locals)
      expect(this.spy).toHaveBeenCalled()
    })

    it('pushes rendered files (without the meta files, if any) back into the stream', function() {
      this.stream._flush(this.spy)

      var buffer   = this.stream._readableState.buffer
      var paths    = _.sortBy(_.map(buffer, 'path'))
      var contents = _.sortBy(_.map(buffer, 'contents'))

      expect(paths).toEqual(['templates/first.html', 'templates/second.html'])
      expect(contents).toEqual([
        new Buffer('first something special with something wild and rare pokemon'),
        new Buffer('second something special with something wild and flying carpet')
      ])

      expect(this.spy).toHaveBeenCalled()
    })

    it('emits an error if rendering fails', function() {
      spyOn(Statil.prototype, 'renderAll').andThrow()
      spyOn(this.stream, 'emit')
      expect(this.flush.bind(this.stream, this.spy)).not.toThrow()
      expect(this.stream.emit).toHaveBeenCalledWith('error', undefined)
      expect(this.spy).toHaveBeenCalled()
    })

  })

})

/********************************* Constants *********************************/

function fileNull() {
  return {
    isNull: _.constant(true),
    isStream: _.constant(false),
    isDirectory: _.constant(false)
  }
}

function fileDir() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(true)
  }
}

function fileStream() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(true),
    isDirectory: _.constant(false)
  }
}

function file() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(false),
    contents: new Buffer('secret contents'),
    path: 'secret/path',
    clone: function() {return _.clone(this)}
  }
}

function badFile() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(false),
    contents: new Buffer('secret contents'),
    path: null
  }
}

/********************************* Utilities *********************************/

/**
 * Calls the given function without arguments and with lots of different
 * arguments.
 * @param Function
 */
function callWithDifferentInputs(fn) {
  fn()
  fn(123)
  fn('')
  fn("what's up honeybunch")
  fn(undefined)
  fn(null)
  fn(NaN)
  fn(true)
  fn(/reg/)
  fn(function() {})
  fn([])
  fn({})
  fn(Object.create(null))
}
