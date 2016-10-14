'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
/* eslint no-use-before-define: ["error", { "classes": false }]*/

var _nodeUuid = require('node-uuid');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _neo4jDriver = require('neo4j-driver');

var _errorTypes = require('./errorTypes');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NodeType = function () {
  function NodeType(input) {
    return input != null && typeof input.UUID === 'string' && Array.isArray(input.tags) && input.tags.length >= 1 && typeof input.tags[0] === 'string' && typeof input.updateTime === 'number' && typeof input.createTime === 'number';
  }

  ;
  Object.defineProperty(NodeType, Symbol.hasInstance, {
    value: function value(input) {
      return NodeType(input);
    }
  });
  return NodeType;
}();

var HyperType = function () {
  function HyperType(input) {
    return input != null && typeof input.addHyperEdge === 'function';
  }

  ;
  Object.defineProperty(HyperType, Symbol.hasInstance, {
    value: function value(input) {
      return HyperType(input);
    }
  });
  return HyperType;
}();

var hyper = {
  addHyperEdge: addHyperEdge
};

if (!HyperType(hyper)) {
  throw new TypeError('Value of variable "hyper" violates contract.\n\nExpected:\nHyperType\n\nGot:\n' + _inspect(hyper));
}

exports.default = hyper;

function _inspect(input, depth) {
  var maxDepth = 4;
  var maxKeys = 15;

  if (depth === undefined) {
    depth = 0;
  }

  depth += 1;

  if (input === null) {
    return 'null';
  } else if (input === undefined) {
    return 'void';
  } else if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
    return typeof input === 'undefined' ? 'undefined' : _typeof(input);
  } else if (Array.isArray(input)) {
    if (input.length > 0) {
      var _ret = function () {
        if (depth > maxDepth) return {
            v: '[...]'
          };

        var first = _inspect(input[0], depth);

        if (input.every(function (item) {
          return _inspect(item, depth) === first;
        })) {
          return {
            v: first.trim() + '[]'
          };
        } else {
          return {
            v: '[' + input.slice(0, maxKeys).map(function (item) {
              return _inspect(item, depth);
            }).join(', ') + (input.length >= maxKeys ? ', ...' : '') + ']'
          };
        }
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    } else {
      return 'Array';
    }
  } else {
    var keys = Object.keys(input);

    if (!keys.length) {
      if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
        return input.constructor.name;
      } else {
        return 'Object';
      }
    }

    if (depth > maxDepth) return '{...}';
    var indent = '  '.repeat(depth - 1);
    var entries = keys.slice(0, maxKeys).map(function (key) {
      return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect(input[key], depth) + ';';
    }).join('\n  ' + indent);

    if (keys.length >= maxKeys) {
      entries += '\n  ' + indent + '...';
    }

    if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
      return input.constructor.name + ' {\n  ' + indent + entries + '\n' + indent + '}';
    } else {
      return '{\n  ' + indent + entries + '\n' + indent + '}';
    }
  }
}