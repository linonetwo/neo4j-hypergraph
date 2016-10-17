'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DatabaseRestrictBrokenError = exports.TransactionCommitError = exports.TransactionSessionDontExistError = exports.NotSupportedError = exports.Neo4jOperationFailedError = exports.MissingUUIDError = undefined;

var _commonErrors = require('common-errors');

var generateClass = _commonErrors.helpers.generateClass;
var TransactionError = _commonErrors.data.TransactionError;
var DataError = _commonErrors.data.DataError;


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

var TransactionSessionDontExistError = generateClass('TransactionSessionDontExistError', {
  extends: TransactionError,
  generateMessage: function generateMessage() {
    return 'transaction-session-dont-exist  \n    at Transacrtion.commit  \n    maybe previous function delete the session  ';
  }
});

var TransactionCommitError = generateClass('TransactionCommitError', {
  extends: TransactionError,
  generateMessage: function generateMessage() {
    return 'neo4j-commit-fail  \n    at Transacrtion.commit  \n    maybe some thing bad happened?  ';
  }
});

var DatabaseRestrictBrokenError = generateClass('DatabaseRestrictBrokenError', {
  extends: DataError,
  args: ['function'],
  generateMessage: function generateMessage() {
    return 'database-restrict-broken  \n    operation ' + undefined.function + ' got more than one result  \n    this is weired, maybe Cypher Query was badely wroten  ';
  }
});

exports.MissingUUIDError = MissingUUIDError;
exports.Neo4jOperationFailedError = Neo4jOperationFailedError;
exports.NotSupportedError = _commonErrors.NotSupportedError;
exports.TransactionSessionDontExistError = TransactionSessionDontExistError;
exports.TransactionCommitError = TransactionCommitError;
exports.DatabaseRestrictBrokenError = DatabaseRestrictBrokenError;