'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };
/* eslint no-use-before-define: ["error", { "classes": false }]*/

var _nodeUuid = require('node-uuid');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _neo4jDriver = require('neo4j-driver');

var _lodash = require('lodash');

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _errorTypes = require('./errorTypes');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
    return input != null && typeof input.createHyperEdge === 'function';
  }

  ;
  Object.defineProperty(HyperType, Symbol.hasInstance, {
    value: function value(input) {
      return HyperType(input);
    }
  });
  return HyperType;
}();

function tagArrayToString(tags) {
  if (!(Array.isArray(tags) && tags.every(function (item) {
    return typeof item === 'string';
  }))) {
    throw new TypeError('Value of argument "tags" violates contract.\n\nExpected:\nArray<string>\n\nGot:\n' + _inspect(tags));
  }

  // 首先把 ['A', 'B'] 类型的 tags 数组拆成 :A:B 的形式
  var tagsString = '';
  if (tags && typeof tags === 'string') {
    tagsString = ':' + tags.join(':');
  }
  return tagsString;
}

function propsObjectToString(properties) {
  if (!(properties instanceof Object)) {
    throw new TypeError('Value of argument "properties" violates contract.\n\nExpected:\nObject\n\nGot:\n' + _inspect(properties));
  }

  var propertiesString = '';
  var sizeOfProps = (0, _lodash.size)(properties);
  if (sizeOfProps !== 0 && (typeof properties === 'undefined' ? 'undefined' : _typeof(properties)) === 'object') {
    propertiesString = '{';
    (0, _lodash.forEach)(properties, function (value, key) {
      propertiesString = propertiesString + ' ' + key + ': "' + JSON.stringify(value).replace(/"/g, '\'') + '"';
    });
    propertiesString += ' }';
  }
  return propertiesString;
}

function hyper(_ref5) {
  var host = _ref5.host;
  var boltPort = _ref5.boltPort;
  var userName = _ref5.userName;
  var passWord = _ref5.passWord;

  // 先登录一下 Neo4J 控制器
  var driver = _neo4jDriver.v1.driver(_url2.default.format({ protocol: 'bolt', slashes: true, hostname: host, port: boltPort }), _neo4jDriver.v1.auth.basic(userName, passWord), { encrypted: true, trust: 'TRUST_ON_FIRST_USE' });

  // 然后定义一系列超图操作函数
  var hyperFunctions = {
    beginTransaction: function beginTransaction() {
      return new HyperTransaction();
    },

    // 接受一个传入的 session，因为 transaction 的用法和 session 的用法一样，所以后续能支持事务
    createHyperEdge: function createHyperEdge(_ref6) {
      var tags = _ref6.tags;
      var props = _ref6.props;
      var children = _ref6.children;
      var session = _ref6.session;
      var _ref6$hyperEdgeUUID = _ref6.hyperEdgeUUID;
      var hyperEdgeUUID = _ref6$hyperEdgeUUID === undefined ? (0, _nodeUuid.v4)() : _ref6$hyperEdgeUUID;

      var nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      // 把传入的属性转换成字符串，并给属性加上一条 UUID
      var tagsString = tagArrayToString(tags);
      var propsString = propsObjectToString(_extends({}, props, { uuid: hyperEdgeUUID }));

      return _bluebird2.default.try(function () {
        return session.run('CREATE (n :HYPEREDGE ' + tagsString + ' ' + propsString + ') RETURN n.uuid');
      }).then(function (result) {
        if (result.records.length > 1) {
          return _bluebird2.default.reject(new _errorTypes.DatabaseRestrictBrokenError());
        }
        return result.records[0].get('n.uuid');
      }).then(function (addedHyperEdgeUUID) {
        return hyperFunctions.addNodeToHyperEdge({ children: children, hyperEdgeUUID: hyperEdgeUUID, session: session });
      }).then(function () {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    createNode: function createNode(_ref7) {
      var tags = _ref7.tags;
      var props = _ref7.props;
      var _ref7$nodeUUID = _ref7.nodeUUID;
      var nodeUUID = _ref7$nodeUUID === undefined ? (0, _nodeUuid.v4)() : _ref7$nodeUUID;
      var session = _ref7.session;
      var hyperEdgeUUIDs = _ref7.hyperEdgeUUIDs;

      var nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      // 把传入的属性转换成字符串，并给属性加上一条 UUID
      var tagsString = tagArrayToString(tags);
      var propsString = propsObjectToString(_extends({}, props, { uuid: nodeUUID }));

      return _bluebird2.default.try(function () {
        return session.run('CREATE (n :NODE ' + tagsString + ' ' + propsString + ') RETURN n.uuid');
      }).then(function (result) {
        if (result.records.length > 1) {
          return _bluebird2.default.reject(new _errorTypes.DatabaseRestrictBrokenError());
        }
        return result.records[0].get('n.uuid');
      }).then(function (addedNodeUUID) {
        return _bluebird2.default.mapSeries(hyperEdgeUUIDs, function (item) {
          return hyperFunctions.addNodeToHyperEdge({ children: [addedNodeUUID], item: item, session: session });
        });
      }).then(function () {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    addNodeToHyperEdge: function addNodeToHyperEdge(_ref8) {
      var nodeUUIDs = _ref8.nodeUUIDs;
      var hyperEdgeUUID = _ref8.hyperEdgeUUID;
      var session = _ref8.session;

      var nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      return _bluebird2.default.mapSeries(nodeUUIDs, function (item) {
        return session.run('MATCH (hyperEdge:HYPEREDGE {uuid: {hyperEdgeUUID}}), (node {uuid: {uuid}}) CREATE (hyperEdge)-[:HYPEREDGE]->(node)', { hyperEdgeUUID: hyperEdgeUUID, uuid: item });
      }).then(function () {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    deleteHyperEdge: function deleteHyperEdge(_ref9) {
      var hyperEdgeUUID = _ref9.hyperEdgeUUID;
      var session = _ref9.session;

      var nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }

      _bluebird2.default.try(function () {
        return session.run('MATCH (hyperEdge:HYPEREDGE {uuid: {hyperEdgeUUID}}) DELETE (hyperEdge)', { hyperEdgeUUID: hyperEdgeUUID });
      }).then(function () {
        if (nonTransactional) {
          session.close();
        }
      });
    }
  };

  if (!HyperType(hyperFunctions)) {
    throw new TypeError('Value of variable "hyperFunctions" violates contract.\n\nExpected:\nHyperType\n\nGot:\n' + _inspect(hyperFunctions));
  }

  var HyperTransaction = function () {
    function HyperTransaction() {
      _classCallCheck(this, HyperTransaction);

      this.transaction = driver.session().beginTransaction();
    }

    _createClass(HyperTransaction, [{
      key: 'commit',
      value: function commit() {
        var _this = this;

        var onSuccess = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};
        var onFail = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

        if (!(typeof onSuccess === 'function')) {
          throw new TypeError('Value of argument "onSuccess" violates contract.\n\nExpected:\nFunction\n\nGot:\n' + _inspect(onSuccess));
        }

        if (!(typeof onFail === 'function')) {
          throw new TypeError('Value of argument "onFail" violates contract.\n\nExpected:\nFunction\n\nGot:\n' + _inspect(onFail));
        }

        return new _bluebird2.default(function (resolve, reject) {
          if (!_this.transaction) {
            return reject(new _errorTypes.TransactionSessionDontExistError());
          }
          _this.transaction.commit().subscribe({
            onCompleted: function onCompleted() {
              onSuccess(resolve());
            },
            onError: function onError(error) {
              onFail(reject(new _errorTypes.TransactionCommitError()));
            }
          });
        });
      }
    }, {
      key: 'rollback',
      value: function rollback() {
        var _this2 = this;

        var callback = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

        function _ref4(_id4) {
          if (!(_id4 instanceof _bluebird2.default)) {
            throw new TypeError('Function return value violates contract.\n\nExpected:\nPromise<>\n\nGot:\n' + _inspect(_id4));
          }

          return _id4;
        }

        if (!(typeof callback === 'function')) {
          throw new TypeError('Value of argument "callback" violates contract.\n\nExpected:\nFunction\n\nGot:\n' + _inspect(callback));
        }

        return _ref4(_bluebird2.default.try(function () {
          if (!_this2.transaction) {
            return _bluebird2.default.reject(new _errorTypes.TransactionSessionDontExistError());
          }
          return _this2.transaction.rollback();
        }).then(callback));
      }
    }, {
      key: 'createHyperEdge',
      value: function createHyperEdge(_ref10) {
        var tags = _ref10.tags;
        var props = _ref10.props;
        var children = _ref10.children;

        return hyperFunctions.createHyperEdge({ tags: tags, props: props, children: children, session: this.transaction });
      }
    }, {
      key: 'addNodeToHyperEdge',
      value: function addNodeToHyperEdge(_ref11) {
        var nodeUUIDs = _ref11.nodeUUIDs;
        var hyperEdgeUUID = _ref11.hyperEdgeUUID;

        return hyperFunctions.addNodeToHyperEdge({ nodeUUIDs: nodeUUIDs, hyperEdgeUUID: hyperEdgeUUID, session: this.transaction });
      }
    }, {
      key: 'createNode',
      value: function createNode(_ref12) {
        var tags = _ref12.tags;
        var props = _ref12.props;
        var nodeUUID = _ref12.nodeUUID;
        var hyperEdgeUUIDs = _ref12.hyperEdgeUUIDs;

        return hyperFunctions.createNode({ tags: tags, props: props, nodeUUID: nodeUUID, hyperEdgeUUIDs: hyperEdgeUUIDs, session: this.transaction });
      }
    }, {
      key: 'deleteHyperEdge',
      value: function deleteHyperEdge(_ref13) {
        var hyperEdgeUUID = _ref13.hyperEdgeUUID;

        return hyperFunctions.deleteHyperEdge({ hyperEdgeUUID: hyperEdgeUUID, session: this.transaction });
      }
    }]);

    return HyperTransaction;
  }();

  return hyperFunctions;
}

// const funcs = hyper({ host: '192.168.99.100', boltPort: 7687, userName: 'neo4j', passWord: 'j4oen' });
// funcs.createNode()


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