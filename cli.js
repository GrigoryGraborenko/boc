#!/usr/bin/env node
'use strict';

const fs = require('fs');

function getFiles(path, list) {
    var files = fs.readdirSync(path);
    files.forEach(function(file) {
        var filepath = path + '\\' + file;
        var stats = fs.statSync(filepath);
        if(stats.isDirectory()) {
            list.push({ path: (path + "") });
            getFiles(filepath + "", list);
        } else if(stats.isFile()) {
            list.push({ path: (path + ""), file: (file + "") });
        }
    });
}

function execute() {

    var src_dir = __dirname + '\\';
    if((process.argv.length >= 3) && (process.argv[2] === "example")) {
        src_dir += "example";
    } else if((process.argv.length >= 3) && (process.argv[2] === "minimal")) {
        src_dir += "minimal";
    } else {
        return "Please pick a project type to start with. Possible types: example, minimal";
    }

    var dest_dir = process.cwd();
    var files = [];
    getFiles(src_dir, files);

    files.forEach(function(file_obj) {

        var path = file_obj.path.replace(src_dir, dest_dir);

        try {
            fs.accessSync(path);
        } catch(err) {
            fs.mkdirSync(path);
        }
        if(file_obj.file === undefined) {
            return;
        }

        var data = fs.readFileSync(file_obj.path + '\\' + file_obj.file);
        fs.writeFileSync(path + '\\' + file_obj.file, data);

    });

    return true;
}

var result = execute();
if(result !== true) {
    console.error(result);
}