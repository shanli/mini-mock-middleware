/**
 * @file mock数据中间件
 * @author shanli1115@gmail.com
 */

const path = require('path');
const queryString = require('query-string');
const _ = require('lodash');
const jsonfile = require('jsonfile');
const proxy = require('http-proxy-middleware');

/**
 * mock数据中间件
 *
 * @param  {Object} mockOptions 针对mock服务的配置
 * @param {string} mockOptions.map 指定本地mock的假路径配置文件。mock服务会通过它寻找到对应的json文件
 * @return {Function}
 */
const mockMiddleware = function (mockOptions) {
    return function (req, res, next) {
        let pathToMap = path.resolve(mockOptions.map);
        let delay = mockOptions.delay === undefined ? 1000 : mockOptions.delay;
        delete require.cache[pathToMap];
        let router = require(pathToMap);

        // 合并参数,也就是说,无论参数是在url上还是在body上,都能识别,且body会覆盖query的同名参数
        let mergedParams = mergeParams(req.query, req.body);

        let matchedPath;
        for (let r in router) {
            if (!router.hasOwnProperty(r)) continue;
            if (r.startsWith(req.path)) {
                // 命中了路径前缀,下面需要判断参数是否命中
                let params = r.split('?');
                if (params[0] === req.path && !params[1]) {
                    // 不定义参数的情况
                    matchedPath = router[r];
                    break;
                }

                let parsedParams = queryString.parse(params[1]);
                let isMatch = _.isMatch(mergedParams, parsedParams);
                if (isMatch) {
                    matchedPath = router[r];
                    break;
                }
            }
        }

        // 匹配不到任何假路径时,不做任何处理
        if (!matchedPath) {
            next();
            return;
        }

        // 匹配到url,代理到远端接口
        let reg = /https?:\/\/[\d\w\.\:]*/;    // 从router中匹配出域名
        let output = reg.exec(matchedPath);
        if (output && output[0]) {
            let remote = output[0];
            let targetPath = matchedPath.slice(remote.length, matchedPath.length);
            let pathRewrite = {};
            pathRewrite[`${req.path}`] = targetPath;
            proxy({
                target: remote,
                changeOrigin: true,
                pathRewrite
            })(req, res, next);
            return;
        }

        // 匹配到非url(也就是匹配到json路径)
        let matchedJsonObj = jsonfile.readFileSync(preHandleFilePath(matchedPath));


        // 当假数据只有一种的时候,忽略是否携带参数
        if (matchedJsonObj.hasOwnProperty('code')) {
            setTimeout(() => {
                res.send(matchedJsonObj);
            }, delay);
            return;
        }

        let matchedResponse = findOutMatchedResponse(mergedParams, matchedJsonObj);
        setTimeout(() => {
            res.send(matchedResponse);
        }, delay);
    };
};

/**
 * 合并参数
 * 也就是说,无论参数是在url上还是在body上,都能识别,且body会覆盖query的同名参数
 *
 * @param {Object} query url上带的参数
 * @param {Object} body body上带的参数
 * @return {Object} 新的参数对象
 */
function mergeParams(query = {}, body = {}) {
    return Object.assign({}, query, body);
}

/**
 * 根据参数,从一个集合中匹配出对应的属性值
 * 比如给定参数组合params{page:1,name:liangshaofeng}和集合collection
 {
    "page=1&name=liangshaofeng": {
        "code": 0,
        "data": [
            1,
            2,
            3
        ]
    },
    "page=2&name=youngwind": {
        "code": 0,
        "data": [
            4,
            5,
            6
        ]
    }
}
 能够匹配返回结果:
 {
     "code": 0,
     "data": [
         1,
         2,
         3
     ]
 },
 * 匹配规则:  1. 只要给定的参数集合包含假定的参数集合,就能匹配成功;
 2. 只返回最先匹配的那一条
 3. 如果匹配不成功,返回空对象
 *
 * @param {Object} params  参数, 比如{page:1}
 * @param {Object} collection  候选集合
 * @return {Object}
 */
function findOutMatchedResponse(params, collection) {
    for (let key in collection) {
        if (!collection.hasOwnProperty(key)) {
            continue;
        }

        let parsedKey = queryString.parse(key);
        let isMatch = _.isMatch(params, parsedKey);
        if (isMatch) {

            return collection[key];
        }

    }
    return {};
}

/**
 * 预处理文件路径,
 * 统一去除根目录的斜杠
 *
 * @param {string} path  文件路径,例如: '/mock-map.json','mock-map.json'
 * @return {string}
 */
function preHandleFilePath(path) {
    if (!path) {
        return '';
    }

    if (path.startsWith('/')) {
        path = process.cwd() + path.substring(1);
    }

    return path;
}

module.exports = mockMiddleware;
