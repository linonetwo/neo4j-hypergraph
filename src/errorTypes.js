import { ArgumentError, AlreadyInUseError, NotSupportedError, data, helpers } from 'common-errors';

const { generateClass } = helpers;
const { TransactionError, DataError } = data;

const MissingUUIDError = generateClass('MissingUUIDError', {
  extends: ArgumentError,
  args: ['function'],
  generateMessage: () =>
    `missing-uuid  
    missing uuid in ${this.function}  
    neo4j-hypergraph need uuid to locate data,  
    please check whether this UUID is really provided from program side of view  `
});

const Neo4jOperationFailedError = generateClass('Neo4jOperationFailedError', {
  extends: ArgumentError,
  args: ['function', 'parameters'],
  generateMessage: () =>
    `neo4j-failure  
    neo4j operation in ${this.function} failed with parameters ${this.parameters}  
    please check operation usage in the docs, or submit issue  `
});

const TransactionSessionDontExistError = generateClass('TransactionSessionDontExistError', {
  extends: TransactionError,
  generateMessage: () =>
    `transaction-session-dont-exist  
    at Transacrtion.commit  
    maybe previous function delete the session  `
});

const TransactionCommitError = generateClass('TransactionCommitError', {
  extends: TransactionError,
  generateMessage: () =>
    `neo4j-commit-fail  
    at Transacrtion.commit  
    maybe some thing bad happened?  `
});

const DatabaseRestrictBrokenError = generateClass('DatabaseRestrictBrokenError', {
  extends: DataError,
  args: ['function'],
  generateMessage: () =>
    `database-restrict-broken  
    operation ${this.function} got more than one result  
    this is weired, maybe Cypher Query was badely wroten  `
});

export {
  MissingUUIDError,
  Neo4jOperationFailedError,
  NotSupportedError,
  TransactionSessionDontExistError,
  TransactionCommitError,
  DatabaseRestrictBrokenError,
} ;
