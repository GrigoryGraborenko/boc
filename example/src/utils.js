////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const fs = require('fs');
import moment from "moment"

////////////////////////////////////////////////////////////////////////////////
export function GetTime() { var t = process.hrtime(); return t[0] + t[1] * 0.000000001; }
const g_ServerStartTimestamp = moment().unix();
const g_ServerStartHiResTime = GetTime();
export function GetUnixTime() { return (g_ServerStartTimestamp + (GetTime() - g_ServerStartHiResTime)); }

////////////////////////////////////////////////////////////////////////////////
export function Delay(delay) { return new Promise(function(fulfill, reject) { setTimeout(function() { fulfill(); }, delay); }); }