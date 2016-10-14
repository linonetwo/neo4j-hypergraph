'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NotSupportedError = exports.Neo4jOperationFailedError = exports.MissingUUIDError = undefined;

var _commonErrors = require('common-errors');

var generateClass = _commonErrors.helpers.generateClass;


var MissingUUIDError = generateClass('MissingUUIDError', {
  extends: _commonErrors.ArgumentError,
  args: ['function'],
  generateMessage: function generateMessage() {
    return 'missing-uuid  \n    missing uuid in ' + undefined.function + '  \n    neo4j-hypergraph need uuid to locate data,  \n    please check whether this UUID is really provided from program side of view  ';
  }
});

var Neo4jOperationFailedError = generateClass('Neo4jOperationFailedError', {
  extends: _commonErrors.ArgumentError,
  args: ['function', 'parameters'],
  generateMessage: function generateMessage() {
    return 'neo4j-failure  \n    neo4j operation in ' + undefined.function + ' failed with parameters ' + undefined.parameters + '  \n    please check operation usage in the docs, or submit issue  ';
  }
});

exports.MissingUUIDError = MissingUUIDError;
exports.Neo4jOperationFailedError = Neo4jOperationFailedError;
exports.NotSupportedError = _commonErrors.NotSupportedError;