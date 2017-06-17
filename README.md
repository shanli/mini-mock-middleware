# 说明
此express中间件有两个作用

1. 本地mock数据
2. 代理接口到远端


# 基本使用
```js
const express = require('express');
const mockMiddleware = require('@nfe/mock-middleware');

const app = express();
app.use(mockMiddleware({
    'map': 'mock-map.js',  // 指定一个map文件,用于映射接口
    'delay': 0             // 指定接口延迟时间,单位是 ms,默认值为 1000, 目的为为了模拟接口的等待过程
}));

```

比如, `mock-map.js`的结构类似这样子:
```js
let remote = 'http://localhost:3004';  // 定义远端接口的host

module.exports = {
    // test远端接口
    // '/api/test': remote + '/api/test',

    // test本地mock
    '/api/test': 'mock/test1.json',

    // test1本地mock
    '/api/test1': 'mock/test1.json',

    // test2本地mock
    '/api/test2': 'mock/test2.json',

    // test3代理到远端接口
    '/api/test3': remote + '/api/test4'
};
```
这代表

1. 当调用接口`/api/test`的时候,返回`mock/test1.json`里面的数据。
2. 当调用接口`/api/test1`的时候,返回`mock/test1.json`里面的数据。
3. 当调用接口`/api/test2`的时候,根据参数,返回`mock/test2.json`里面的数据。
4. 当调用接口`/api/test3`的时候(post方法),返回远端接口`http://localhost:3004/api/test3`里面的数据。




# 高级使用
有些时候,同一个接口,传递不同参数的时候,返回的结果也是不同的,最典型的就是**分页**,
那我们如何模拟这种区别呢?

有两种方式

1. 配置 test.json 里面的数据结构
2. 在 map.js 中定义假路径的时候,把参数直接带上。

先说第一种方法。

## 配置 test.json

### 1. 忽略所有参数
当你希望不管传什么参数,接口返回永远都是一样的话,那么`test1.json`必须是有一个`code`字段,如下所示:
```json
{
    "code":0,
    "data":"data1"
}
```
程序判断逻辑:当`test1.json`中包含code字段,则忽略所有参数。

### 2. 需要参数判断
在需要参数进行判断的时候,我们要考虑两个问题。

1. 是否区分`url`上的参数和`body`的参数?
2. 参数传多了或者传少了,如何匹配?

第一个问题,程序会忽略参数到底上在`url`还是在`body`上,直接将所有的参数合并成一个对象,
且`body`里面的字段会覆盖`url`的同名字段。

第二个问题,只要传递参数的集合包含定义的假的参数集合,就意味着命中规则,且只会命中最先出现的那一条。
如果找不到匹配的规则,则返回空对象。

举个例子,假如`test2.json`结构如下:
```json
{
    "page=1": {
        "code": 0,
        "data": [
            1,
            2,
            3
        ]
    },
    "page=2": {
        "code": 0,
        "data": [
            4,
            5,
            6
        ]
    },
    "page=3&name=liangshaofeng": {
        "code": 0,
        "data": [
            7,
            8,
            9
        ]
    }
}
```

请求url(包括参数)与返回结果之间的对应关系为:
```
url: /api/test2?page=1
res: {
  "code": 0,
   "data": [
       1,
       2,
       3
   ]
}
```

```
url: /api/test2?page=2
res: {
  "code": 0,
  "data": [
      4,
      5,
      6
  ]
}
```

```
url: /api/test2?page=3
res: {}
```

## 配置 map.js
第一种方法的优点在于只需要配置一个假路径,缺点在于当一个接口返回的 json 本来就很大的时候,
多个 json 叠加在一起,会使得 json 文件变得非常庞大,于是有了这第二种方法。

如下所示:
```js
// map.js
'/api/test4?page=1': 'mock/test4-1.json',
'/api/test4?page=2': 'mock/test4-2.json',
'/api/test4?page=2&test=3': 'mock/test4-3.json'
```

在假设 /api/test4 是一个分页的接口, 我们便可以在 map.js 直接把 page 参数带上,以重定向到不同的 json 文件。
参数的匹配顺序与规则与第一种方法的实现原理相同。
