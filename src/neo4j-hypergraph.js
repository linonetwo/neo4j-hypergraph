// @flow
/* eslint no-use-before-define: ["error", { "classes": false }]*/

import { v4 as uuid } from 'node-uuid';
import Promise from 'bluebird';
import { v1 as neo4j } from 'neo4j-driver';
import { size, forEach } from 'lodash';
import url from 'url';

import { MissingUUIDError,
  Neo4jOperationFailedError,
  NotSupportedError,
  TransactionSessionDontExistError,
  TransactionCommitError,
  DatabaseRestrictBrokenError,
} from './errorTypes';

type NodeType = {
  UUID: string;
  tags: [string];
  updateTime: number;
  createTime: number;
};

type HyperType = {
  createHyperEdge: (para: {tags?: [string]; props?: [string]; children: [string]}) => NodeType;
}

function tagArrayToString(tags: Array<string>): string {
  // 首先把 ['A', 'B'] 类型的 tags 数组拆成 :A:B 的形式
  let tagsString = '';
  if (tags && typeof tags === 'string') {
    tagsString = ':' + tags.join(':');
  }
  return tagsString;
}

function propsObjectToString(properties: Object): string {
  let propertiesString = '';
  const sizeOfProps = size(properties);
  if (sizeOfProps !== 0 && typeof properties === 'object') {
    propertiesString = '{';
    forEach(properties, (value, key) => {
      propertiesString = `${propertiesString} ${key}: "${JSON.stringify(value).replace(/"/g, '\'')}"`;
    });
    propertiesString += ' }';
  }
  return propertiesString;
}

function hyper({ host, boltPort, userName, passWord }) {
  // 先登录一下 Neo4J 控制器
  const driver = neo4j.driver(
    url.format({ protocol: 'bolt', slashes: true, hostname: host, port: boltPort }),
    neo4j.auth.basic(userName, passWord),
    { encrypted: true, trust: 'TRUST_ON_FIRST_USE' }
  );

  // 然后定义一系列超图操作函数
  const hyperFunctions: HyperType = {
    beginTransaction() {
      return new HyperTransaction();
    },
    // 接受一个传入的 session，因为 transaction 的用法和 session 的用法一样，所以后续能支持事务
    createHyperEdge({ tags = [], props = [], children = [], session, hyperEdgeUUID = uuid() }) {
      let nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      // 把传入的属性转换成字符串，并给属性加上一条 UUID
      const tagsString = tagArrayToString(tags);
      const propsString = propsObjectToString({ ...props, uuid: hyperEdgeUUID });

      const createHyperEdgeQuery = `CREATE (n :HYPEREDGE ${tagsString} ${propsString}) RETURN n.uuid`;
      return Promise.try(() =>
        session.run(createHyperEdgeQuery)
      )
      .then((result) => {
        if (result.records.length > 1) {
          return Promise.reject(new DatabaseRestrictBrokenError());
        }
        return result.records[0].get('n.uuid');
      })
      .then(addedHyperEdgeUUID =>
        hyperFunctions.addNodeToHyperEdge({ nodeUUIDs: children, hyperEdgeUUID, session })
      )
      .then(() => {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    createNode({ tags = [], props = [], nodeUUID = uuid(), session, hyperEdgeUUIDs = [] }) {
      let nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      // 把传入的属性转换成字符串，并给属性加上一条 UUID
      const tagsString = tagArrayToString(tags);
      const propsString = propsObjectToString({ ...props, uuid: nodeUUID });

      const createNodeQuery = `CREATE (n :NODE ${tagsString} ${propsString}) RETURN n.uuid`;
      return Promise.try(() =>
        session.run(createNodeQuery)
      )
      .then((result) => {
        if (result.records.length > 1) {
          return Promise.reject(new DatabaseRestrictBrokenError());
        }
        return result.records[0].get('n.uuid');
      })
      .then(addedNodeUUID =>
        Promise.mapSeries(hyperEdgeUUIDs, (item) =>
          hyperFunctions.addNodeToHyperEdge({ nodeUUIDs: [addedNodeUUID], hyperEdgeUUID: item, session })
        )
      )
      .then(() => {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    addNodeToHyperEdge({ nodeUUIDs = [], hyperEdgeUUID, session }) {
      let nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }
      console.log(nodeUUIDs, hyperEdgeUUID);
      return Promise.mapSeries(nodeUUIDs, (item) =>
        session.run('MATCH (hyperEdge:HYPEREDGE {uuid: {hyperEdgeUUID}}), (node {uuid: {uuid}}) CREATE (hyperEdge)-[:HYPEREDGE]->(node)',
          { hyperEdgeUUID, uuid: item }
        )
      )
      .then(() => {
        if (nonTransactional) {
          session.close();
        }
      });
    },
    deleteHyperEdge({ hyperEdgeUUID, session }) {
      let nonTransactional = false;
      // 如果函数的调用者没提供 session，那肯定就是非事务性调用
      if (!session) {
        session = driver.session(); /* eslint no-param-reassign: 0*/
        nonTransactional = true;
      }

      Promise.try(() =>
        session.run('MATCH (hyperEdge:HYPEREDGE {uuid: {hyperEdgeUUID}}) DELETE (hyperEdge)',
          { hyperEdgeUUID }
        )
      )
      .then(() => {
        if (nonTransactional) {
          session.close();
        }
      });
    }
  };

  class HyperTransaction {
    constructor() {
      this.transaction = driver.session().beginTransaction();
    }

    commit(onSuccess: Function = () => { }, onFail: Function = () => { }): Promise<> {
      return new Promise((resolve, reject) => {
        if (!this.transaction) {
          return reject(new TransactionSessionDontExistError());
        }
        this.transaction.commit()
        .subscribe({
          onCompleted: () => {
            onSuccess(resolve());
          },
          onError: (error) => {
            onFail(reject(new TransactionCommitError()));
          }
        });
      });
    }

    rollback(callback: Function = () => { }): Promise<> {
      return Promise.try(() => {
        if (!this.transaction) {
          return Promise.reject(new TransactionSessionDontExistError());
        }
        return this.transaction.rollback();
      })
      .then(callback);
    }

    createHyperEdge({ tags, props, children }) {
      return hyperFunctions.createHyperEdge({ tags, props, children, session: this.transaction });
    }

    addNodeToHyperEdge({ nodeUUIDs, hyperEdgeUUID }) {
      return hyperFunctions.addNodeToHyperEdge({ nodeUUIDs, hyperEdgeUUID, session: this.transaction });
    }

    createNode({ tags, props, nodeUUID, hyperEdgeUUIDs }) {
      return hyperFunctions.createNode({ tags, props, nodeUUID, hyperEdgeUUIDs, session: this.transaction });
    }

    deleteHyperEdge({ hyperEdgeUUID }) {
      return hyperFunctions.deleteHyperEdge({ hyperEdgeUUID, session: this.transaction });
    }
  }


  return hyperFunctions;
}

const funcs = hyper({ host: '192.168.99.100', boltPort: 32768, userName: 'neo4j', passWord: 'j4oen' });
funcs.createHyperEdge({ tags: [], props: [], children: ['96565c63-b242-4ad2-9fee-dd525f4a4f2c'] });


export default hyper;
