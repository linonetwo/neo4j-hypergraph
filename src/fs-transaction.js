/* eslint no-use-before-define: ["error", { "classes": false }]*/
import fsp from 'fs-promise';
import { v4 as uuid } from 'node-uuid';
import path from 'path';
import temp from 'promised-temp';

import sequencePromise from './sequencePromise';

import { MissingImportantFileError, AlreadyExistsError, NotSupportedError } from './errorTypes';

type FsType = {
  beginTransaction: (config: TransactionConfigType) => Transaction; // eslint-disable-line
  mergeDir: (src: string, dest: string, conflictResolver: 'overwrite' | 'skip') => Promise<>;
  // ...fsp
}

const fs: FsType = {
  // fileNameMap: {}, // 用于保存文件名和临时文件名之间的映射，以后对于所有输入的路径，都看看有没有能用这里面的路径替换掉的

  beginTransaction: (...config) => new Transaction(Object.assign({}, ...config, { fsFunctions: fs })),

  /* eslint no-continue: 0 */
  async mergeDir(srcPath, destPath, conflictResolver = 'overwrite') {
    // 不直接使用 fs-extra 中功能相似的 copy 是为了保持灵活性，我不是很确定 merge 是否与 copy 有不同之处，所以目前只在文件的粒度上使用 copy
    const files = await fsp.readdir(srcPath);
    for (const name of files) {
      const srcName = path.join(srcPath, name);
      const destName = path.join(destPath, name);
      const srcStats = await fsp.lstat(srcName);

      if (srcStats.isDirectory()) {
        // 对于源头的每一个文件夹，递归创建出文件夹树
        if (!await fsp.exists(destName)) {
          await fsp.mkdir(destName);
        }
        await fs.mergeDir(srcName, destName, conflictResolver);
        continue;
      }

      // 递归到了叶子节点后，开始处理文件
      if (!await fsp.exists(destName)) {
        // 目的地没这个文件就直接复制文件
        await fsp.copy(srcName, destName);
      } else {
        // 目的地有这个文件就要看看你希望怎么解决冲突
        switch (conflictResolver) {
          case 'overwrite':
            await fsp.mkdir(path.dirname(srcName));
            await fsp.writeFile(srcName, await fsp.readFile(destName));
            break;
          case 'skip':
          default:
            break;
        }
      }
    }
  },
  ...fsp
};


function checkNotSupportedPath(aPath) {
  if (path.isAbsolute(aPath)) {
    throw new NotSupportedError(`wip  ${aPath}  absolute path is not supported`);
  }
  if (/\.\./.test(path.normalize(aPath))) {
    throw new NotSupportedError(`wip  ${aPath}  path that use .. is not supported`);
  }
}

type TransactionConfigType = {
  basePath: ?string;
  fsFunctions: FsType;
  mergeResolution?: 'overwrite' | 'skip';
}
class Transaction {
  constructor({ basePath = process.cwd(), fsFunctions, mergeResolution = 'overwrite' }: TransactionConfigType) {
    this.uuid = uuid();
    this.fs = { ...fsFunctions, beginTransaction: undefined };

    // 如果传入的是一个绝对路径，就直接在上面干活了
    if (path.isAbsolute(basePath)) {
      this.basePath = basePath;
    // 如果传入的是正确的相对路径，就接上一个 process.cwd()
    } else if (this.fs.existsSync(path.join(process.cwd(), basePath))) {
      this.basePath = path.join(process.cwd(), basePath);
    } else {
      throw new MissingImportantFileError(path.join(process.cwd(), basePath));
    }

    this.tempFolderPath = '';
    this.tempFolderCreated = false;
    this.affixes = {
      prefix: 'tempFolder',
      suffix: '.transaction-fs'
    };

    this.mergeResolution = mergeResolution;
  }

  // 自己也要做判断：如果临时文件夹已存在就不创建了，如果想创建的文件夹已经存在就不创建了
  async _check(newThingPath: string) {
    checkNotSupportedPath(newThingPath);

    if (await this.fs.exists(path.join(this.basePath, newThingPath))) {
      throw new AlreadyExistsError(newThingPath);
    }
    if (!await this.fs.exists(this.basePath)) {
      throw new MissingImportantFileError(this.basePath);
    }
    if (!this.tempFolderCreated) {
      this.tempFolderPath = await temp.mkdir(this.affixes);
      this.tempFolderCreated = true;
    }
    if (this.tempFolderCreated && !await this.fs.exists(this.tempFolderPath)) {
      throw new MissingImportantFileError(this.tempFolderPath);
    }
  }


  // 创建一个临时文件夹，在里面创建想创建的文件夹：
  // 先判断
  // 然后对于 a/b/c ，递归地创建 temp/a/b/c
  async mkdirs(dirPath) {
    try {
      // 确定环境可用，而且 dirPath 是一个正确的不存在的相对路径
      await this._check(dirPath);

      const newPath = path.join(this.tempFolderPath, dirPath);
      await this.fs.mkdirs(newPath);
    } catch (error) {
      await this.rollback(error);
    }
  }

  async writeFile(fileName, content) {
    try {
      await this._check(fileName);

      const newPath = path.join(this.tempFolderPath, fileName);
      await this.fs.writeFile(newPath, content);
    } catch (error) {
      await this.rollback(error);
    }
  }

  // 尝试将临时文件夹里的内容合并到工作目录下，一言不合就回滚
  async commit() {
    try {
      // console.log(this.tempFolderPath, this.basePath, this.mergeResolution);
      await this.fs.mergeDir(this.tempFolderPath, this.basePath, this.mergeResolution);
    } catch (error) {
      await this.rollback(error);
    }
  }

  // 直接把临时文件夹删了了事
  async rollback(error) {
    await this.fs.remove(this.tempFolderPath);
    if (error) {
      throw error;
    }
  }


  // createWriteStreamT(filePath, options) { // https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options 原生不支持链式调用
  //   const replacedFilePath = replaceTempPath(filePath, fs.fileNameMap);
  //   const newPath = path.join(path.dirname(replacedFilePath), `~createWriteStreamT~${path.basename(replacedFilePath)}`);// 创建一个加 ~ 文件，表示这只是暂时的，可能会被回滚
  //   fs.fileNameMap[replacedFilePath] = newPath;

  //   fs.rollbackStack.unshift(() => { if (fsp.existsSync(newPath)) { return fsp.remove(newPath); } }); // 入栈一个回滚操作：删掉临时文件
  //   fs.commitStack.unshift(() => fsp.existsSync(replacedFilePath) ?
  //          fsp.remove(replacedFilePath).then(() => fsp.rename(newPath, replacedFilePath)) :
  //          fsp.rename(newPath, replacedFilePath)
  //   ); // 入栈一个提交操作：删掉原文件，把文件名改成正常版本

  //   const _writeStream = fsp.createWriteStream(newPath, options); // 开始创建文件输入流
  //   return Promise.resolve(_writeStream); // 用起来像 fs.createWriteStreamT('aaa.xml').then(writeStream => {writeStream.write('asdffff'); writeStream.end()}).then(() => fs.commit()).catch(err => console.log(err));
  // }


}


export default fs;
