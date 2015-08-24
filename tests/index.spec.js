'use strict';

/******************************* Dependencies ********************************/

var _      = require('lodash');
var pt     = require('path');
var Statil = require('statil').Statil;

/**
 * Mock require('statil') before requiring gulp-statil.
 */
var cached = _.find(require.cache, {exports: {Statil: Statil}});
var statilSpy = jasmine.createSpy('spy for Statil');
statilSpy.plan = function(options) {
  return new Statil(options);
}
cached.exports = {Statil: statilSpy};

var gst     = require('../lib/index');
var through = require('through2');
var Stream  = require('stream');

/*********************************** Specs ***********************************/

// Testing a part of the test.
describe('statil spy', function() {

  beforeEach(function() {
    statilSpy.reset();
  });

  it('it returned from a `require` call', function() {
    expect(require('statil')).toEqual({Statil: statilSpy});
  });

  it('calls through to the Statil constructor', function() {
    var statilSpy = require('statil').Statil;
    expect(new statilSpy()).toEqual(jasmine.any(Statil));
  });

  it('properly responds to toHaveBeenCalled and not.toHaveBeenCalled', function() {
    expect(require('statil').Statil).not.toHaveBeenCalled();
    require('statil').Statil();
    expect(require('statil').Statil).toHaveBeenCalled();
  });

});

describe('gulp-statil', function() {

  beforeEach(function() {
    statilSpy.reset();
  });

  it('is a function', function() {
    expect(typeof gst).toBe('function');
  });

  it('survives any input', function() {
    expect(_.wrap(gst, callWithDifferentInputs)).not.toThrow();
  });

  it('returns a stream', function() {
    expect(gst()).toEqual(jasmine.any(Stream));
  });

  it('creates a Statil instance during initialisation', function() {
    gst();
    expect(statilSpy).toHaveBeenCalled();
  });

  it('passes options to Statil', function() {
    var options = {secret: 'something special'};
    gst(options);
    expect(statilSpy).toHaveBeenCalledWith(options);
  });

  describe('transform function', function() {

    // Get hold of the function.
    beforeEach(function() {
      this.stream = gst();
      this.transform = this.stream._transform;
      this.spy = jasmine.createSpy('callback spy');
    });

    it('ignores an empty file, directory, or stream', function() {
      expect(this.transform.bind(this.stream, mockNull(), null, this.spy)).not.toThrow();
      expect(this.transform.bind(this.stream, mockDir(), null, this.spy)).not.toThrow();
      expect(this.transform.bind(this.stream, mockStream(), null, this.spy)).not.toThrow();
      expect(this.spy).toHaveBeenCalledWith(null);
    });

    it('passes files to Statil#register under relative paths', function() {
      spyOn(Statil.prototype, 'register').andCallThrough();

      expect(this.transform.bind(this.stream, mockFile(), null, this.spy)).not.toThrow();

      expect(Statil.prototype.register).toHaveBeenCalledWith(
        mockFile().contents.toString(), mockFile().relative
      );
    });

    it('calls back with an error if #register fails', function() {
      expect(this.transform.bind(this.stream, mockBadFile(), null, this.spy)).not.toThrow();
      expect(this.spy).toHaveBeenCalledWith(jasmine.any(Error));
    });

  });

  describe('flush function', function() {

    // Get hold of the function.
    beforeEach(function() {
      this.locals = {secret: 'something special'};
      this.stream = gst({locals: this.locals});
      this.flush = this.stream._flush;
      this.spy = jasmine.createSpy('callback spy');
    });

    // Create and register mock files.
    beforeEach(function() {
      this.stream._transform(mockTemplates().first,  null, _.noop);
      this.stream._transform(mockTemplates().second, null, _.noop);
      this.stream._transform(mockMeta(),             null, _.noop);
    });

    it("calls Statil#render, passing 'options.locals'", function() {
      spyOn(Statil.prototype, 'render').andCallThrough();

      expect(this.flush.bind(this.stream, this.spy)).not.toThrow();

      expect(Statil.prototype.render).toHaveBeenCalledWith(this.locals);
      expect(this.spy).toHaveBeenCalledWith(null);
    });

    it('pushes rendered files (without the meta files, if any) back into the stream', function() {
      this.stream._flush(this.spy);

      var buffer   = this.stream._readableState.buffer;
      var paths    = _.sortBy(_.map(buffer, 'relative'));
      var contents = _.sortBy(_.map(buffer, 'contents'));

      expect(paths).toEqual([
        'templates/first.html',
        'templates/second.html'
      ]);
      expect(contents).toEqual([
        new Buffer('first something special with something wild and rare pokemon'),
        new Buffer('second something special with something wild and flying carpet')
      ]);

      expect(this.spy).toHaveBeenCalledWith(null);
    });

    it('calls back with an error if rendering fails', function() {
      spyOn(Statil.prototype, 'render').andThrow(new Error());
      expect(this.flush.bind(this.stream, this.spy)).not.toThrow();
      expect(this.spy).toHaveBeenCalledWith(jasmine.any(Error));
    });

  });

});

/********************************* Constants *********************************/

function mockNull() {
  return {
    isNull: _.constant(true),
    isStream: _.constant(false),
    isDirectory: _.constant(false),
    isBuffer: _.constant(false)
  };
}

function mockDir() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(true),
    isBuffer: _.constant(false)
  };
}

function mockStream() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(true),
    isDirectory: _.constant(false),
    isBuffer: _.constant(false)
  };
}

function mockFile() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(false),
    isBuffer: _.constant(true),
    contents: new Buffer('secret contents'),
    path: pt.join(process.cwd(), 'templates/page.html'),
    relative: 'templates/page.html',
    clone: function() {return _.clone(this)}
  };
}

function mockBadFile() {
  return {
    isNull: _.constant(false),
    isStream: _.constant(false),
    isDirectory: _.constant(false),
    isBuffer: _.constant(true),
    contents: new Buffer('secret contents'),
    path: null,
    relative: null
  };
}

// Mock template files.
function mockTemplates() {
  return {
    first: _.assign(mockFile(), {
      contents: new Buffer('first <%= secret %> with <%= $meta.metaSecret %> and <%= firstSecret %>'),
      path:     pt.join(process.cwd(), 'templates/first.html'),
      relative: 'templates/first.html'
    }),
    second: _.assign(mockFile(), {
      contents: new Buffer('second <%= secret %> with <%= $meta.metaSecret %> and <%= secondSecret %>'),
      path:     pt.join(process.cwd(), 'templates/second.html'),
      relative: 'templates/second.html'
    })
  };
}

// Mock meta file.
function mockMeta() {
  return _.assign(mockFile(), {
    contents: new Buffer(JSON.stringify({
      metaSecret: 'something wild',
      files: [
        {name: 'first',  firstSecret:  'rare pokemon'},
        {name: 'second', secondSecret: 'flying carpet'}
      ]
    })),
    path: pt.join(process.cwd(), 'templates/meta.yaml'),
    relative: 'templates/meta.yaml',
  });
}

/********************************* Utilities *********************************/

/**
 * Calls the given function without arguments and with lots of different
 * arguments.
 * @param Function
 */
function callWithDifferentInputs(fn) {
  fn();
  fn(123);
  fn('');
  fn("what's up honeybunch");
  fn(undefined);
  fn(null);
  fn(NaN);
  fn(true);
  fn(/reg/);
  fn(function() {});
  fn([]);
  fn({});
  fn(Object.create(null));
}
