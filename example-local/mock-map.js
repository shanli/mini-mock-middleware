/**
 * @file  假接口定义
 * @author  shanli1115@baidu.com
 */

let remote = 'http://localhost:3004';

module.exports = {
    // test远端接口
    // '/api/test': remote + '/api/test',

    // test本地接口
    '/api/test': 'mock/test1.json',

    // test1接口
    '/api/test1': 'mock/test1.json',

    // test2接口
    '/api/test2': 'mock/test2.json',

    // test3 post接口
    '/api/test3': remote + '/api/test4',

    // test4 接口
    '/api/test4?page=1': 'mock/test4-1.json',
    '/api/test4?page=2': 'mock/test4-2.json',
    '/api/test4?page=2&test=3': 'mock/test4-3.json'

};

