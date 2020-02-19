'use strict';

const config = require('config');
const irc = require('irc');
const request = require('then-request');
const server = 'chat.freenode.net';
const channels = ['#hlsvillage'];
const nick = 'testytesterbot';
const admins = config.get("admin.admins");
const debug = false;
const secure = true;
const port = 6697;
const accepted_langs = ['python', 'node', 'php', 'c', 'bash', 'perl'];
const child_process = require('child_process');
const jwt = require('jsonwebtoken');
const token_secret = config.get('token.token_secret');
const esc = require('escapeshellarg');
let ccdb = {};

class MultiLangCCOM {

    constructor(lang, name, user, code, time) {
		this.lang = lang;
        if(this.lang == "js") this.lang = "node";
		this.name = name;
		this.user = user;
		this.code = code;
		this.time = time;
        this.token = this.fetch_token(JSON.stringify({
            "name": this.name,
            "lang": this.lang,
            "author": this.user,
            "code": this.code,
            "time": this.time
        }))
        this.banned_patterns = {
            "python": ["import os", "import subprocess", "import ctypes", "__import__", "importlib",
                       "from os", "from subprocess", "from ctypes", "chr(1)"],
            "perl": ["exec", "system", "`", "fork", "kill", "chr(1)"],
            "node": ["child_process", "chr(1)"]
        };
    }

    fetch_token(json_data) {
        return jwt.sign({
            data: json_data
        }, token_secret, {expiresIn: '1h'});
    }

    execute_result(result, action, bot) {
        if(result["return"] == 0 || result["stderr"] == "") {
            if (action == "add") {
                this.post_ccom(bot);
                bot.say(channels[0], "successfully added ccom!");
            } else if(action == "run") {
                result = result["stdout"].replace( /\r/g, '\n');
                let lines = result.split("\n");
                for(let i = 0; i < 4; i++) {
                    bot.say(channels[0], lines[i]);
                }
            }
        } else {
            bot.say(channels[0], `The following error occured: ${result["stderr"]}`);
            return false;
        }
    }

    execute_ccom(action, bot, who) {
        if(!accepted_langs.includes(this.lang)) {
            bot.say(channels[0], `${this.lang} is not a supported language for ccoms!`);
            return;
        }
        if(action == "add") {
            console.log(`checking ${this.code} for banned pattern..`)
            for(let i in this.banned_patterns[this.lang]) {
                if(this.code.match(this.banned_patterns[this.lang][i])) {
                    bot.say(channels[0], `Use of ${this.banned_patterns[this.lang][i]} is banned for security reasons!`);
                    return;
                }
            }
        } else if(action == "del") {
            this.remove_ccom(this.user);
            bot.say(channels[0], "successfully removed ccom!");
            bot.fetch_ccom_db();
            return;
        }
        if(who == undefined) who = {"nick": "test"};
        let spawner = new Spawner(this.lang, null, this, who);
        spawner.spawn((evt, err) => {
            this.execute_result(spawner.get_formatted_output(), action, bot);
        });
        return;
    }

    edit_ccom(bot) {
        let name = this.name;
        let user = this.user;
        request('PUT', `http://192.168.49.105:42069/ccoms/name/${this.name}`, {json: {'lang': this.lang, 'name': this.name, 'author':
        this.user, 'code': this.code, 'time': this.time }, headers:{'authorization': this.token}}).getBody('utf8')
        .then(JSON.parse).done(function (res) {
            console.log(`${user} successfully edited ${name}!`);
            bot.fetch_ccom_db();
        });
    }

    post_ccom(bot) {
        let name = this.name;
        let user = this.user;
        request('POST', 'http://192.168.49.105:42069/ccoms', {json: {'lang': this.lang, 'name': this.name, 'author':
        this.user, 'code': this.code, 'time': this.time }, headers:{'authorization': this.token}}).getBody('utf8')
        .then(JSON.parse).done(function (res) {
            console.log(`${user} successfully added ${name}!`);
            bot.fetch_ccom_db();
        });
    }

    remove_ccom() {
        let name = this.name;
        let user = this.user;
        request('DELETE', `http://192.168.49.105:42069/ccoms/name/${this.name}`,
        {headers:{"authorization": this.token}}).done(function (res) {
            console.log(`${user} successfully removed ${name}!`);
        });
    }
}

class Spawner {
    constructor(exe, exe_args, ccom, who) {
        this.exe = exe;
        if(this.exe == "js") this.exe = "node"
        this.exe_args = exe_args;
        this.ccom = ccom;
        this.closed = false;
        this.stdout = "";
        this.stderr = "";
        this.who = who;
    }
    spawn = (callback) => {
        this.callback = (evt, err) => {
            if (callback) {
                callback(evt, err);
                callback = null;
            }
        }
    if (this.proc) {
        let msg = "Spawner instances cannot be reused.";
        let err = new Error(msg);
        this.on_error(err);
        return;
    }
    this.proc = child_process.spawn(this.exe, this.exe_args);
	this.proc.stdout.on('data', this.on_stdout);
	this.proc.stdout.on('error', this.on_error);
	this.proc.stderr.on('data', this.on_stderr);
	this.proc.stderr.on('error', this.on_error);
	this.proc.on('close', this.on_close);
	this.proc.on('error', this.on_error);
	this.proc.stdin.on('error', this.on_error);
    if(this.ccom.lang == "python") this.proc.stdin.write(`user = "${this.who['nick']}"; ${this.ccom.code}`);
    if(this.ccom.lang == "perl") this.proc.stdin.write(`$user = "${this.who['nick']}"; ${this.ccom.code}`);
    if(this.ccom.lang == "js" || this.ccom.lang == "node") this.proc.stdin.write(`let user = "${this.who['nick']}"; ${this.ccom.code}`);
	this.proc.stdin.end();
    }
    on_stdout = (data) => {
		this.stdout = data.toString();
	}
	on_stderr = (data) => {
		this.stderr = data.toString();
	}
	on_close = (return_code) => {
		this.return_code = return_code;
		this.closed = true;
		this.callback('done');
	}
	on_error = (err) => {
		this.error = err;
		this.callback('error', err);
	}
	get_formatted_output() {
		let msg = "";
		if (this.error) {
			msg = {"stdout": "", "stderr": `${this.error}]`, "return": `${this.return_code}`};
		} else if (this.closed) {
			msg = {"stdout": `${this.stdout}`, "stderr": `${this.stderr}`, "return": `${this.return_code}`};
		} else if (this.proc) {
			msg = `still running.`;
		} else {
			msg = `has not been launched yet.`;
		}
		return msg;
	}
}

class Bot extends irc.Client {
    constructor(server, nick, {channels: channels, port: port, secure: secure, debug: debug}) {
        super(server, nick, {channels: channels, port: port, secure: secure, debug: debug});
        this.server = server;
        this.nick = nick;
        this.channels = channels;
        this.port = port;
        this.secure = secure;
        this.debug = debug;
        this.start_listener();
        this.fetch_ccom_db();
    }

    fetch_ccom_db(){
        console.log("started fetching ccoms")
        request('GET', 'http://192.168.49.105:42069/ccoms').done(function(res) {
            ccdb = JSON.parse(res.getBody());
        });
    }

    parse_ccom_action(message, who) {
        let args = message.split(" ");
        let from = `${who['nick']}!${who['user']}@${who['host']}`;
        if(args[0] == ".mlcc") {
            if(args[1] == "add") {
                let code = "";
                let name = args[2];
                let lang = args[3];
                for(let i = 4; i < args.length; i++) code += `${args[i]} `;
                let mlcc = new MultiLangCCOM(lang, name, from, code, new Date().toString());
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == args[2]) {
                        if(ccdb[i]['author'] != from && !admins.includes(who['host'])) {
                            this.say(channels[0], "you may not edit a ccom you didn't add!");
                            return;
                        }
                        mlcc.edit_ccom(this);
                        this.say(channels[0], "successfully edited ccom!")
                        return;
                    }
                }
                mlcc.execute_ccom("add", this);
            } else if(args[1] == "remove") {
                let name = args[2];
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == name) {
                        if(ccdb[i]['author'] != from && !admins.includes(who['host'])) {
                            this.say(channels[0], "you may not delete a ccom you didn't add!");
                            return;
                        }
                        new MultiLangCCOM(ccdb[i]['lang'], ccdb[i]['name'], ccdb[i]['author'],
                        ccdb[i]['code'], ccdb[i]['time']).execute_ccom("del", this);
                        return;
                    }
                }
                this.say(channels[0], `no ccom with the name ${name} found`);
                return;
            } else if(args[1] == "list") {
                this.fetch_ccom_db();
                let ccoms_list = "";
                for(let i = 0; i < ccdb.length; i++) {
                    ccoms_list += `${ccdb[i]['name']} `
                }
                this.say(channels[0], ccoms_list);
            } else if(args[1] == "view") {
                if(args[2] == undefined) {
                    this.say(channels[0], "please provide the name of the ccom");
                    return;
                }
                let bot = this;
                request('GET', `http://192.168.49.105:42069/ccoms/name/${args[2]}`).done(function(res) {
                    let ccom = JSON.parse(res.getBody());
                    bot.say(channels[0], `Language: ${ccom[0]['lang']}\n${ccom[0]['code']}\nAdded by ${ccom[0]['author']} on ${ccom[0]['Created_date']}`);
                });
                return;
            }
        } else {
            for(let i = 0; i < ccdb.length; i++) {
                if(ccdb[i]['name'] == args[0].substr(1, args[0].length)) {
                    new MultiLangCCOM(ccdb[i]['lang'], ccdb[i]['name'], ccdb[i]['user'],
                    ccdb[i]['code'], ccdb[i]['time']).execute_ccom("run", this, who);
                }
            }
        }
    }

    start_listener() {
        this.addListener('message', function (from, to, message) {
            console.log(from + ' => ' + to + ': ' + message);
            if(message.match("^.")) {
                this.whois(from, function(info) {
                    this.parse_ccom_action(message, info);
                });
            }
        });
    }
}
new Bot(server, nick, {channels: channels, port: port, secure: secure, debug: debug});
