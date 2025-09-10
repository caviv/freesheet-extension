// log.js


const log = [];

function consolelog(text) {
	console.log(text);
	$$('id-log').innerHTML = text + "\r\n" + $$('id-log').innerHTML;
}