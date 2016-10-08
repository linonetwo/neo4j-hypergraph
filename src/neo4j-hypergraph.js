// @flow
/* eslint no-use-before-define: ["error", { "classes": false }]*/

import { v4 as uuid } from 'node-uuid';
import Promise from 'bluebird';
import { v1 as neo4j } from 'neo4j-driver';

import { MissingUUIDError, Neo4jOperationFailedError, NotSupportedError } from './errorTypes';

type NodeType = {
  UUID: string;
  tags: [string];
  updateTime: number;
  createTime: number;
};

type HyperType = {
  addHyperEdge: (para: {tags?: [string]; props?: [string]; children: [string]}) => NodeType;
}

const hyper: HyperType = {
  addHyperEdge
};



export default hyper;
