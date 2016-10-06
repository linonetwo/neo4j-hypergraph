/* eslint-env node, mocha */
/* eslint arrow-body-style: 0 */
/* eslint-disable no-unused-expressions */
import Promise from 'bluebird';
import chai from 'chai';
import chaiFs from 'chai-fs';
import isUUID from 'is-uuid';

import path from 'path';
import fs from '../src/fs-transaction';

chai.use(chaiFs);
const { expect, should } = chai;

describe('basic fs characteristic', () => {
  let tx = {};
  const basePath = './__test__/testFile';

  before(() => {
  });

  beforeEach(() => {
    fs.mkdirSync(basePath);
    tx = fs.beginTransaction({ basePath });
  });

  afterEach(async () => {
    await fs.remove(basePath);
  });

  it('new a tx, it have its v4uuid', () => {
    return expect(isUUID.v4(tx.uuid)).to.be.true;
  });

  it('new a tx, it have its fsFunctions, which is without beginTransaction() function', () => {
    return expect(tx.fs).to.be.deep.equal({ ...fs, beginTransaction: undefined });
  });

  it('new a tx, it have its basePath', () => {
    return expect(tx.basePath).to.be.equal(path.join(process.cwd(), basePath));
  });
});

describe('non-transactional frequently used helper functions', () => {
  const basePath = './__test__/testFile';

  beforeEach(() => {
    return fs.mkdirs(basePath);
  });

  afterEach(() => {
    return fs.remove(basePath);
  });

  it('remove , remove a serious of nested folder and file inside', async () => {
    const dirSeries = path.join(basePath + '/a/b/c/');

    // nested folder
    await fs.mkdirs(dirSeries);

    // with file
    const writeStream = fs.createWriteStream(path.join(dirSeries, 'aFile.md'));
    writeStream.write('# markdown');
    writeStream.end();

    // delete them
    await fs.remove(basePath);

    expect(dirSeries).to.not.be.a.path();
  });

  it('mkdirs , there being a serious of folder with correct name', async () => {
    const dirSeries = path.join(basePath, '/a/b/c/');
    await fs.mkdirs(dirSeries);
    expect(dirSeries).to.be.a.path();
  });
});

describe('frequently used fs-transaction operations', () => {
  let tx = {};
  const basePath = './__test__/testFile';

  before(() => {
  });

  beforeEach(() => {
    fs.mkdirSync(basePath);
    tx = fs.beginTransaction({ basePath });
  });

  afterEach(async () => {
    await fs.remove(basePath);
  });


  it('mkdir then commit, there being a folder with correct name', async () => {
    const dirSeries = path.join(basePath, 'a/b/c/');

    await tx.mkdirs('a/b/c/');
    await tx.commit();
    expect(dirSeries).to.be.a.path();
  });

  it('mk different dir two times then commit, there being folders with correct name', async () => {
    const dirSeriesOne = path.join(basePath, 'a/b/c/');
    const dirSeriesTwo = path.join(basePath, 'a/d/d/');

    await tx.mkdirs('a/b/c/');
    await tx.mkdirs('a/d/d/');
    await tx.commit();
    expect(dirSeriesOne).to.be.a.path();
    expect(dirSeriesTwo).to.be.a.path();
  });

  it('mkdir then rollback, there exists nothing', async () => {
    const dirSeries = path.join(basePath, 'a/b/c/');

    await tx.mkdirs('a/b/c/');
    await tx.rollback();
    expect(dirSeries).to.not.be.a.path();
  });


  it('writeFile then commit, correct file created', async () => {
    const fileName = 'aFile.md';
    const filePath = path.join(basePath, fileName);
    const fileContent = '# This is a title\n\nAnd this is a content';

    await tx.writeFile(fileName, fileContent);

    await tx.commit();
    expect(filePath).to.be.a.file();
  });

  it('writeFile then rollback, there exists nothing', async () => {
    const fileName = 'aFile.md';
    const filePath = path.join(basePath, fileName);
    const fileContent = '# This is a title\n\nAnd this is a content';

    await tx.writeFile(fileName, fileContent);

    await tx.rollback();
    expect(basePath).to.be.a.directory().and.empty;
  });
});
