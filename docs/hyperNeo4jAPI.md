# 目录

## [介绍](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/hyperNeo4jAPI.md#这是啥)

- ### [场论有向超图简介](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/hyperNeo4jAPI.md#超边类似于标签但这个标签可以带有属性)
- ### [API 介绍](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/hyperNeo4jAPI.md#这是一个抽象的超图操作-api)


## 这是啥

这是一个以 Neo4j 图论数据库为基础的超图 API，虽然底层只是普通的有向属性图（Directed Property Graph），但如果你从超图的角度来看可以获得许多好处：  

### 超边类似于标签，但这个标签可以带有属性

![drawBackOfUsingLabel1](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/drawBackOfUsingLabel1.png?raw=true)
一般我们会用 Label 或 Tag 将同一类的节点联系起来，这种做法的效率较高，但表达能力不够强。如果需要表达更复杂的知识间关系，我们可以像上图那样，用一块涂抹出来的色块，包住 Node1 和 Node2，效果相当于给 Node1 和 Node2 都加上同样的标签。
![hyperGraphIsActually](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/hyperGraphIsActually.png?raw=true)  
涂抹出来的色块是什么？它就是超边：一维的边就是一条线，能连接两个节点，而二维的边就是涂抹出来的一个色块，能包住好几个节点。所以我们可以看到，超边和 Label 一样，都是对节点进行分类的方法。  
超边可以很方便地描述出这种情况，首先，人类很容易看出上图中节点同时属于黄色的超边，其次，在 Neo4j 中我们也可以用原生的有向图来描述出这样的超边。  
![drawBackOfUsingLabel2](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/drawBackOfUsingLabel2.png?raw=true)  
如果节点像上图这样，同时属于多个类别呢？超边可以很方便地描述出来，但是如果想用 Label 描述出这样的关系就麻烦啦，不仅仅是所需的标签数量会爆炸，而且还需要额外的信息来描述标签之间的层次关系。  
![hypergraphIntro1](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/hypergraphIntro1.png?raw=true)  
在超图里，每个节点都可以属于多个超边，例如上图中 Node1 就属于三个超边，其中绿色的超边不是直接包含 Node1，而是通过超边之间的层次关系而间接拥有 Node1。  
超边之间可以有多种层次关系，取决于业务需要，更多的关系类型会提高推理难度，但有更高的精确性，需要有所取舍。  
![MultilevelHyperGraph](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/MultilevelHyperGraph.png?raw=true)  
因为在底层上，超图其实是用 Neo4j 的普普通通的点和边实现的，所以我们可以着眼于某些层次，忽略掉这个层次以下的点和以上的超边，只看这一层的超边和点，从而得到超图的一个「一点也不超的图」子图，在上面跑一跑 pagerank 呀，node2vec 呀都是极好的。  
![fieldDirectedHyperGraph1](https://github.com/linonetwo/neo4j-hypergraph/blob/master/docs/pics/fieldDirectedHyperGraph1.png?raw=true)  
最后，为了表示「我是你爸爸」这样的有向关系，我们像上图这样引入场的概念，类似于电场或磁场，它有梯度、散度、旋度，能计算出场内每个点之间的「势差」，因此只要说明点在场中的位置，就能根据两个点之间「势」的高低确定两个点之间的方向。需要注意的是这一方案因为表达能力过强，计算效率可能较低。  
有了有向关系后，就能在业务层模拟谓词等约束条件，当然计算可能会更慢一些。  

### 这是一个抽象的超图操作 API

我们提供一系列基本操作，实现对上述超图的查询（Query）和改变（Mutation），并尝试提供事务性（Transaction）。  

## ADD

**addUser({run, fsf: getFsFunctions(), userInfo, defaultHyperEdgeInfo}) => Promise({userInfo, defaultHyperEdgeUUID})**

场景：新用户注册

动机：一切之始，添加用户，还有它的默认超边

实现：userInfo = {string: userUUID, userName, encryptedString: password}，把这几个东西都作为属性，然后添加默认超边，默认超边的初始名字就用用户名来当

---

**addHyperEdge( {run, fsf = getFsFunctions(), userInfo, hyperEdgeInfo = {{uuid, hyperEdgeName: '', nodeUUIDList: [], tagsList: [], sitesList: []}} ) => Promise([{"h.uuid": hyperEdgeUUID}, {"t.uuid": tagUUID}, {"s.uuid": siteUUID}, ...])**

动机：其中 hyperEdgeName 可用于在传入文件夹时直接用文件夹名创建超边，但如果不提供名字的话就用空 string 当名字，因为超边可以用位点等信息搜到，并不一定要名字。nodeUUIDList 是用来将原本属于其他超边的节点也同时加入自己的，因为一个点可以属于好几个超边。不要疑惑为什么没有一个用于创建节点的函数，因为节点一开始就必须属于某个超边，然后才能被加入更多超边。

实现：检查传入的信息哪些是空的，然后用提供的信息创建新的 neo4j 节点，用 user 节点指向它。如果 nodeUUIDList 非空，把它看做一个超边，指向这个「超边」所连接的节点。

---
**addBlankNode2DefaultHyperEdge({run, fsf = getFsFunctions(), userInfo, nodeInfo = {uuid: uuid.v4(), nodeName: ''}}) => Promise({userInfo, nodeUUID})**

动机：用于添加空白节点，节点必须属于某个超边，所以当不提供超边UUID的时候，也得用这个添加节点，本着函数不要揽太多活的原则，提供超边UUID的时候请用 addNode2HyperEdge()

实现：先用 userInfo 到neo4j里查看他默认要添加到哪个超边里（:DEFAULT_HYPEREDGE 指向的那个）可能是一个名叫“未归类”的超边，如果没获取到这个超边，那么这个用户可能是每半天创建一个新的以时间命名的超边等等，得看它的 defaultHyperedgeFormat 属性，为它新建一个超边。

---
**addNode2DefaultHyperEdge({run, fsf = , userInfo, nodeInfo = , hyperEdgeInfo}) => Promise({userInfo, nodeInfo})**

动机：节点必须属于某个超边，所以当不提供超边UUID的时候，也得用这个添加节点，本着函数不要揽太多活的原则，提供超边UUID的时候请用 addNode2HyperEdge()。hyperEdgeInfo 是用于测试的，测试的时候我们需要给定 uuid 然后看结果是否一致，所以必须有一个接口传入 uuid。

实现：先用 userInfo 到neo4j里查看他默认要添加到哪个超边里（:DEFAULT_HYPEREDGE 指向的那个）可能是一个名叫“未归类”的超边，如果没获取到这个超边，那么这个用户可能是每半天创建一个新的以时间命名的超边等等，得看它的 defaultHyperedgeFormat 属性，为它新建一个超边。

---
**addNode2HyperEdge({run, userInfo, nodeInfo, hyperEdgeUUID}) => Promise({hyperEdgeUUID, nodeInfo})**

动机：当指明把节点添加到某个超边时用这个。可以把某个 hyperEdgeUUID 当做 nodeUUID 传入，从而嵌套超边。

实现：先检查 nodeUUID 和 hyperEdgeUUID 是不相等的非空值，然后让 hyperEdgeUUID 多一条指向 nodeUUID 的边。

---
**addSite2Node({run, fsf, userInfo, nodeUUID, array[string]: sitesList， bool: manualGenerated = false}) => Promise({nodeUUID, siteUUID})**

动机：用户可能需要描述文档的局部，这时需要在文档 XML 里添加位点；并且方便将局部与其他文档关联起来，这时需要在 neo4j 里添加位点。所以这个函数需要原子性（atomic）地将一个位点添加到 XML 和 neo4j 里。然后返回的对象里会有位点在 neo4j 里的 UUID。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话就用 sitesList 创建文档节点指向的位点节点,带上manualGenerated: true 表示这个位点不是算法自动生成的而是人的主观判断，并返回位点节点的 uuid，然后在 XML 里创建 <site/> 标签，带上位点节点的 uuid。

```xml
<file type="text/plain" src="onetwo/635cc10c-7172-48c5-a3e9-845ec55e27cc/8a346f58-56f1-431c-9829-d86c8e012e86">
  <site type="text/plain" offset="400,444" uuid="sdc8c10c-4521-as2t-a3e9-84sd355e27cc"/>
</file>
```
---
**addTag2Node({run, userInfo, nodeUUID, array: tagsList }) => Promise({nodeUUID})**

动机：用户可能需要添加对整个文档的描述，而不是描述文档中的局部，这时候就得加 Tag

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话就用 tagsList 在 neo4j 里 MERGE 一个个「user节点」指向的 tag 节点，然后让当前文档节点指向它们， XML 里创建 <tag/> 标签，带上 uuid。

---
**addFile2Node({run, userInfo, nodeUUID, file}) => Promise({nodeUUID})**

动机：为上传的文件或图片创建一个由 nodeUUID 表示的节点指向的节点，这样文件也会有一个 XML ，可以为它添加一些注释什么的，也方便单独打开，单独分享。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话就创建一个由 nodeUUID 表示的节点指向的节点，把文件保存到本地硬盘，将地址写入节点。

---

### Link  
用于把已经存在的节点或超边加入到某个超边中。  
### Get

**getInitialHyperEdge(run, userInfo) => Promise(hyperEdgeUUID, XML, [nodeUUID])**

动机：刚打开页面时，需要打开一个默认的页面，不然用户无从获取第一个 uuid，也就无法打开别的页面。

实现：用 userInfo 检查是否有权限，然后找到用户信息节点，看他设置默认打开什么超边，然后返回这个超边的 UUID 和 XML，还有它指向的节点的 UUID。

---
**getHyperEdge(run, userInfo, hyperEdgeUUID) => Promise(hyperEdgeUUID, bool: returnURL, XML, [nodeUUID])**

动机：用户需要获取关于某个超边都连接了哪些节点的信息，就像打开了一个文件夹一样。

实现：用 userInfo 检查是否有权限，然后到 neo4j 里获取超边和它指向的节点的 UUID，返回 XML 和 UUID 列表。（如果用缓存数据库，将 returnURL 设为 true）

---
**getNode(run, userInfo, nodeUUID) => Promise(nodeUUID, bool: returnURL, XML)**

动机：用户需要获取某个模因，XML传递到前端再行 parse，或者提供给上级 API使用，如果要改用 graphQL 的话。

实现：用 userInfo 检查是否有权限，然后直接返回 XML。（或是将 XML 插入缓存数据库，然后只返回它对应的地址）

---
**getFile(run, userInfo, nodeUUID) => Promise(nodeUUID, bool: returnURL, File)**

动机：用户需要获取某个模因内的图片，图片是保存在某个图片节点里的。

实现：用 userInfo 检查是否有权限，然后直接返回文件。（或是将文件插入缓存数据库，然后只返回它对应的地址）

---
**getArbitrary(run, userInfo,string: cypher) => Promise([object]: nodes)**

动机：用户可能有自己的想法， 比如想获取和某个描述某人的笔记具有相同描述人的位点的所有笔记，从而找到其他人和这个人的关系。这搜索语句他想自己写，那么传入这函数，函数检查一下只是读取而没有写入，然后把搜到的节点uuid 和内容摘要用对象数组返回。object 必须可以进一步转换为 json 。

实现：用 userInfo 检查是否有权限，正则匹配 MATCH 后的所有点，看看有没有 WHERE ，如果没有就连上一个 WHERE (:USER)-[:OWN]->() AND blabla 所有点都要被 (:USER) 连着，如果已经有 WHERE 就用 AND 连在后面，然后检查 cypher 是不是只有读取而没有修改，然后把结果打包成 object 数组，返回。

---

### UPDATE

**updateNode(run, userInfo, nodeUUID, newXML) => Promise(nodeUUID)**

动机：新添加模因后只是个光秃秃的 XML 和 neo4j 节点，还得用这个函数把内容加进去，或是用文本编辑器编辑了模因之后，也用这个函数。更新位点的 XML ，也用这个函数。这个函数主要用于把前端的修改加入数据库，注意别的函数也有修改 XML 的行为，如果只是后台内的修改，不要调用这个函数。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话用 userInfo 看看用户设置保留几份历史文档，然后把传入的 XML 保存在本地硬盘上，把同一目录下的历史版本删到只剩用户指定的数量，修改 Neo4j 中的信息，使节点信息指向新的 XML 。

---
**updateFile(run, userInfo, nodeUUID, newFile) => Promise(nodeUUID)**

动机：有时候需要把图片替换掉，那么比起删掉再上传一个新的再放到指定位置，其实可以直接右键替换掉嘛，然后因为图片是由文件节点指定的，所以只要换掉文件节点里面指向的名字就行了。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话用 userInfo 看看用户设置保留几份过期文件，然后把传入的文件放在本地硬盘上，把同一目录下的历史版本删到只剩用户指定的数量，修改 Neo4j 中的信息，使节点信息指向新的文件。

---

### Delete

**archiveNode(run, userInfo, nodeUUID) => Promise()**

动机：有时候用户只是一段时间内不想看到某个节点，想让它滚蛋，这时可以给节点加一个标记，让它一段时间内不会在所有包含它的超边内出现，也不会被非精确搜索轻易搜索到。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话把节点元信息保存到一个已归档节点的文档里，然后给它加上一个 :ARCHIVED 标签，并加上属性记录是何时被归档的。

---
**deleteNode(run, userInfo, nodeUUID) => Promise()**

动机：有时候用户需要真正地永久删除一个节点，可能因为它含有隐私。得提示用户，这个文档关联的图片和文件不会被删除，因为它们可能牵扯到很多别的文档。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话把节点元信息保存到一个已删除节点的文档里，然后删光指向它的边和它指向别人的边，最后删掉它自己。

---
**deleteTagFromNode(run, userInfo, nodeUUID, tagUUID) => Promise()**

动机：偶尔可能会遇到想删 Tag 的时候，可能是因为这个 Tag 是别人添加的，但加得特别烂不切题。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话在 XML 里找到 tagUUID 对应的标签，删了它，然后在 neo4j 里删了这个 Tag 对应的节点。

---
**deleteSiteFromNode(run, userInfo, nodeUUID, siteUUID) => Promise()**

动机：偶尔可能会遇到想删位点的时候，可能是因为这个位点是自动添加的，但加得特别烂不切题。

实现：检查传入值非空后，用 nodeUUID 找到对应节点，然后用 userInfo 验证有无修改权限，有的话在 XML 里找到 siteUUID 对应的标签，删了它，然后在 neo4j 里删了这个位点对应的节点。

---

### ML
**clusteringSite(nodeUUID) => Promise(nodeUUID)**

位点缘起问题: 给定很多个文字模因的局部片段，以及这些局部的上下文，将这些文字片段聚类为多组「广义同义词」。
之所以说「广义」是因为这些「词」可能比较长，比如一个故事段落和一个成语可以是「广义的同义词」

动机：用 addSite2Node() 添加的位点千奇百怪，但可以被归到有限个类别里，相当于用某个超边来表示一类同义词或是近义模因的「本质」。这个函数用来把某个节点指向的位点遍历一遍，分别添加到它们应该在的超边里。

实现：可能用多重联配算法？或是用Distributional Clustering（我为此额外地带上了上下文）？

---
**clusteringMeme(nodeUUID)  => Promise(nodeUUID)**

模因联配问题: 给定 A B 两类节点和它们之间的边，通过相连边的个数判定A 类节点的紧密程度，对其进行归类 (其中A是模因节点， B是合并了近义项后的位点节点)

动机：用户添加某个模因或某条笔记后一般懒得把它加到某个超边里，而且有时候模因可以属于好多个超边，用户肯定懒得去加，特别是当用户忘了某个很久以前创建的超边时，或是用户脑洞不够大无法想到某个超边时，用户懒得去为了一个模因苦思冥想很久。这个函数使用模因节点的 XML 中的 Tag 、指向的模因节点所属的超边、节点的添加时间和背景信息（比如添加前后添加了什么别的信息、正在做关于什么项目的调研）等信息，自动将模因节点加入超边。
