
const fs = require("fs");
const util = require('util');
const Sequelize = require('sequelize');
const crypto = require('crypto');
const zlib = require('zlib');

import moment from "moment"

// const common_params = require('./common');

const fileReadAsync = util.promisify(fs.readFile);
const fileWriteAsync = util.promisify(fs.writeFile);
const fileDeleteAsync = util.promisify(fs.unlink);
const randomBytesAsync = util.promisify(crypto.randomBytes);
const inflateAsync = util.promisify(zlib.inflate);
const deflateAsync = util.promisify(zlib.deflate);

////////////////////////////////////////////////////////////////////////////////
export function GetTime() { var t = process.hrtime(); return t[0] + t[1] * 0.000000001; }
const g_ServerStartTimestamp = moment().unix();
const g_ServerStartHiResTime = GetTime();
export function GetUnixTime() { return (g_ServerStartTimestamp + (GetTime() - g_ServerStartHiResTime)); }

////////////////////////////////////////////////////////////////////////////////
export function Delay(delay) { return new Promise(function(fulfill, reject) { setTimeout(function() { fulfill(); }, delay); }); }