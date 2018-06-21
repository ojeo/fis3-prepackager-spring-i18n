'use strict';
var _ = fis.util;
var fs = require('fs');
var path = require('path');
var http = require('http');
var request = require('sync-request');
module.exports = function (ret, conf, settings, opt) {
    var propPath = settings.path;
    var name = settings.name;

    var root = fis.project.getProjectPath();

    //fis.log.info(JSON.stringify(settings));

    _.map(ret.ids, function(id, file) {
        if (file.isHtmlLike) {
            replace(file);
        }
    });

    var keys = {};
    if(settings.mock) {

        //fis.log.info(JSON.stringify(path.join(root,propPath)));
        keys = parseproperties(propPath,name);

        //fis.log.info(JSON.stringify(keys));


        var contentlan = "#set ($i18nmap = ";
        contentlan = contentlan + JSON.stringify(keys).replace(/\\\\/g,'\\').replace(/\\"/g,'""') + ")\n";
        //fis.log.info(JSON.stringify(keys).replace(/\\\\/g,'\\').replace(/\\"/g,'""') );
        contentlan = contentlan + '#macro(springMessage $arg)\n#foreach($cookie in $request.getCookies())\n#if($cookie.name == "Language")\n#set($lan = $cookie.value)\n#break\n#end\n#end\n#if("$lan" == "" || !$lan)\n#set($req_lan = $request.getHeader("Accept-Language"))\n#set($lan=$req_lan.substring(0,$req_lan.indexOf(",")))\n#end\n#set($lan = $lan.replace("-", "_"))\n#if(!$i18nmap.get($lan))\n#set($lan = ".")\n#end\n#if(!$i18nmap.get($lan).get($arg))\n$arg\n#else\n$i18nmap.get($lan).get($arg)\n#end\n#end';

        var file = fis.file.wrap(root + '/widget/i18n.vm');
        file.setContent(contentlan);

        file.isMod = true;
        file.useCompile = false;

        //map.json 添加translate.tpl
        ret.map.res[file.getId()] = {
            uri  : file.getUrl(opt.hash, opt.domain),
            type : file.rExt.replace(/^\./, '')
        };

        //translate.tpl产出
        ret.pkg[file.subpath] = file;

    }

    function replace(file) {
        var found = false;
        var content = file.getContent();
        var reg = /__i18n\(\s*[\'\"]([a-zA-Z0-9\._]+)[\'\"]\s*\)/g
        content = content.replace(reg, function(m, key) {
            m = "#springMessage('"+key+"')";
            found = true;
            return m;
        });
        if(settings.mock && found){
            content = "#parse('widget/i18n.vm')"+'\n'+content;
        }
        file.setContent(content);
    }
    function parseproperties(propPath,messageName, encoding) {
        var root = fis.project.getProjectPath();
        var propRoot = path.join(root,propPath)
        var keyvalue = {};  //存储键值对
        var encoding = encoding || 'UTF-8';  //定义编码类型
        try {
            if(propPath.indexOf("http")==0){
                if(settings.languages!=null && settings.languages.length>0){
                    for(var i=0;i<settings.languages.length;i++){
                        var lang = settings.languages[i];

                        var url=propPath+messageName+'_'+lang+'.properties';
                        if(lang == '.'){
                            url=propPath+messageName+'.properties';
                        }
                        //fis.log.info("url:"+url);
                        var content = request('GET', url).getBody().toString();
                        var regexjing = /\s*(#+)/;  //去除注释行的正则
                        var regexkong = /\s*=\s*/;  //去除=号前后的空格的正则
                        keyvalue[lang] = {};
                        var arr_case = null;
                        var regexline = /.+/g;  //匹配换行符以外的所有字符的正则
                        while (arr_case = regexline.exec(content)) {  //过滤掉空行
                            if (!regexjing.test(arr_case)) {  //去除注释行
                                //fis.log.info("arr_case:"+arr_case);
                                keyvalue[lang][arr_case.toString().split(regexkong)[0]] = arr_case.toString().split(regexkong)[1].replace(/\\/g, "\\");  //存储键值对
                            }
                        }
                    }
                }
            }else {
                var files = fs.readdirSync(propRoot);
                //fis.log.info("f:"+JSON.stringify(files));
                files.forEach(function (file) {
                    //fis.log.info("file:"+file);
                    var lang = file.substring(file.indexOf(messageName) + messageName.length + 1, file.lastIndexOf(".properties"));
                    if (file.lastIndexOf(".properties") == messageName.length) {
                        lang = "."
                    }
                    var content = fs.readFileSync(path.join(propRoot, file), encoding);
                    var regexjing = /\s*(#+)/;  //去除注释行的正则
                    var regexkong = /\s*=\s*/;  //去除=号前后的空格的正则
                    keyvalue[lang] = {};
                    var arr_case = null;
                    var regexline = /.+/g;  //匹配换行符以外的所有字符的正则
                    while (arr_case = regexline.exec(content)) {  //过滤掉空行
                        if (!regexjing.test(arr_case)) {  //去除注释行
                            keyvalue[lang][arr_case.toString().split(regexkong)[0]] = arr_case.toString().split(regexkong)[1].replace(/\\/g, "\\");  //存储键值对
                        }
                    }
                });
            }
        } catch (e) {
            fis.log.error("e:"+e);
            //e.message  //这里根据自己的需求返回
            return null;
        }
        return keyvalue;
    }
};
exports.defaultOptions = {
    mock: false,
    path: "/static/i18n/",
    name: 'messages'
};
