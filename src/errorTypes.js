import { ArgumentError, AlreadyInUseError, NotSupportedError, helpers } from 'common-errors';

const { generateClass } = helpers;

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

export {
  MissingUUIDError,
  Neo4jOperationFailedError,
  NotSupportedError,
} ;
