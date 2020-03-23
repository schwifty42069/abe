'use strict';

const config = require('config');
const irc = require('irc');
const request = require('then-request');
const server = config.get('irc.server');
const channels = config.get('irc.channels');
const nick = config.get('irc.nick');
const admins = config.get("admin.admins");
const debug = config.get('irc.debug');
const secure = config.get('irc.secure');
const port = config.get('irc.port');
const accepted_langs = ['python', 'node', 'php', 'c', 'bash', 'perl'];
const child_process = require('child_process');
const jwt = require('jsonwebtoken');
const token_secret = config.get('token.token_secret');
let ccdb = {};
let author_ccoms = {};
let last_ccom_time = Date.now();

class MultiLangCCOM {

    constructor(lang, name, nick, host, code, time) {
		this.lang = lang;
        if(this.lang == "js") this.lang = "node";
		this.name = name;
		this.nick = nick;
        this.host = host;
		this.code = code;
        this.time = time;
        this.token = this.fetch_token(JSON.stringify({
            "name": this.name,
            "lang": this.lang,
            "author_nick": this.nick,
            "author_host": this.host,
            "code": this.code,
            "time": this.time,
        }))
        this.banned_patterns = {
            "python": ["import os", "import subprocess", "import ctypes", "__import__", "importlib", "from os", [/exec\(/g, "exec"],
                       "from subprocess", "from ctypes", "chr", "globals", "pwd", ".system", "locals", "0001", "\u0001",
                       "vars()"],
            "perl": ["exec", "system", "`", "fork", "kill", "chr", "install", "0001", "\u0001"],
            "node": ["child_process", "exec", "spawn", "shelljs", "fromCharCode", "cluster", "fs", "__dirname__",
                     "__filename", "0001", "\u0001"],
            "bash": [[/\W>\W/g, ">"], "&", [/\Wcd\W/g, "cd"], [/\Wls\W/g, "ls"], "TZ", "pwd", "mkdir", "001", "\u0001", "\\|", [/\Wid\W/g, "id"],
                     "\\$\\(", "`", "sdcard", "termux", "while true", [/\Wnc\W/g, "nc"], "netcat", "ifconfig", "iwconfig",
                     [/\Wip\W/g, "ip"], "netstat", [/\Wcat\W/g, "cat"], "/system", "/data", "/etc", [/\Wam\W/g, "am"]],
            "except": [">.<"]
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
                for(let i = 0; i < 6; i++) {
                    bot.say(channels[0], lines[i]);
                }
            } else if(action == "edit") {
                this.edit_ccom(bot);
                bot.say(channels[0], "successfully edited ccom!");
                return;
            } else {
                result = result["stdout"].replace( /\r/g, '\n');
                let lines = result.split("\n");
                for(let i = 0; i < 6; i++) {
                    bot.say(channels[0], lines[i]);
                }
            }
        } else {
            result = result["stderr"].replace( /\r/g, '\n');
            let lines = result.split("\n");
            bot.say(channels[0], "The following error occurred:\n");
            for(let i = 0; i < 6; i++) {
                bot.say(channels[0], lines[i]);
            }
            return false;
        }
    }

    match_banned_pattern(bot) {
        for(let i in this.banned_patterns[this.lang]) {
            if(typeof(this.banned_patterns[this.lang][i]) == 'object') {
                if(this.code.match(this.banned_patterns[this.lang][i][0]) && !this.code.includes(this.banned_patterns["except"][0])) {
                    bot.say(channels[0], `Use of ${this.banned_patterns[this.lang][i][1]} is banned for security reasons!`);
                    return true;
                }
            } else {
                if(this.code.match(this.banned_patterns[this.lang][i]) && !this.name == "rogex2str" && !this.name == "str2rogex") {
                    bot.say(channels[0], `Use of ${this.banned_patterns[this.lang][i]} is banned for security reasons!`);
                    return true;
                }
            }
        }
        return false;
    }

    execute_ccom(action, bot, who, args) {
        if(!accepted_langs.includes(this.lang)) {
            bot.say(channels[0], `${this.lang} is not a supported language for ccoms!`);
            return;
        }
        if(action == "add" || action == "edit" || action == "test") {
            console.log(`checking ${this.code} for banned pattern..`)
            if(this.match_banned_pattern(bot)) return;
        } else if(action == "del") {
            this.remove_ccom(this.user);
            bot.say(channels[0], "successfully removed ccom!");
            bot.fetch_ccom_db(undefined, true);
            return;
        }
        if(who == undefined) who = {"nick": "test"};
        if(args == undefined) args = ["1", "2", "3", "4", "5"];
        let spawner = new Spawner(this.lang, null, this, who, args, action, bot);
        spawner.spawn((evt, err) => {
            this.execute_result(spawner.get_formatted_output(), action, bot);
        });
        return;
    }

    edit_ccom(bot) {
        let name = this.name;
        let user = this.user;
        request('PUT', `${config.get('mongodb.db_address')}/ccoms/name/${this.name}`, {json: {'lang': this.lang, 'name': this.name, 'author_nick':
        this.nick, 'author_host': this.host, 'code': this.code, "created_date": this.time }, headers:{'authorization': this.token}}).getBody('utf8')
        .then(JSON.parse).done(function (res) {
            console.log(`${user} successfully edited ${name}!`);
            bot.fetch_ccom_db(undefined, true, undefined);
        });
    }

    post_ccom(bot) {
        let name = this.name;
        let user = this.user;
        request('POST', `${config.get('mongodb.db_address')}/ccoms`, {json: {'lang': this.lang, 'name': this.name, 'author_nick':
        this.nick, 'author_host': this.host, 'code': this.code, "created_date": this.time }, headers:{'authorization': this.token}}).getBody('utf8')
        .then(JSON.parse).done(function (res) {
            console.log(`response code: ${res.code}`);
            console.log(`${user} successfully added ${name}!`);
            bot.fetch_ccom_db(undefined, true, undefined);
        });
    }

    remove_ccom() {
        let name = this.name;
        let user = this.nick;
        request('DELETE', `${config.get('mongodb.db_address')}/ccoms/name/${this.name}`,
        {headers:{"authorization": this.token}}).done(function (res) {
            console.log(`${user} successfully removed ${name}!`);
        });
    }
}

class Runtime {
    constructor(ccom, args, who, action) {
        this.ccom = ccom;
        this.args = args;
        this.who = who;
        this.action = action;
    }

    create_runtime() {
        if(this.args.length < 2) {
            this.args.push("test2");
        }
        let arg_str = this.args.join(" ");
        if(this.action == "test") arg_str = "";

        if(this.ccom.lang == "python") {
            return(`arg_str = "${arg_str}"; args = arg_str.split(" "); arg_str = arg_str.replace(".${this.ccom.name} ", ""); user = "${this.who['nick']}";  exec("exec = None\\n${this.ccom.code.replace(/\"/g, "\\\"")}")`);
        }
        if(this.ccom.lang == "perl") {
            return(`$arg_str = "${arg_str}"; $arg_str =~ s/.${this.ccom.name} //; @args = split(" ", $arg_str); $user = "${this.who['nick']}"; ${this.ccom.code}`);
        }
        if(this.ccom.lang == "js" || this.ccom.lang == "node") {
            return(`let arg_str = "${arg_str}"; let args = arg_str.split(" ");
                    let input = arg_str.replace(/.${this.ccom.name} /, ''); let user = "${this.who['nick']}"; ${this.ccom.code}`);
        }
        if(this.ccom.lang == "bash") {
            return(`user=${this.who['nick']}; arg_str="${arg_str}"; IFS=' '; args=(\${arg_str// / }); unset IFS; ${this.ccom.code}`);
        }
    }
}

class Spawner {
    constructor(exe, exe_args, ccom, who, args, action, bot) {
        this.exe = exe;
        this.exe_args = exe_args;
        if(this.exe == "js") this.exe = "node";
        if(this.exe == "python") { this.exe = "python"; this.exe_args = ["-u"]; }
        this.ccom = ccom;
        this.closed = false;
        this.stdout = "";
        this.stderr = "";
        this.who = who;
        this.args = args;
        this.action = action;
        this.bot = bot;
        this.line_count = 0;
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
        let rt = new Runtime(this.ccom, this.args, this.who, this.action);
        this.proc.stdin.write(rt.create_runtime());
    	this.proc.stdin.end();
    }
    on_stdout = (data) => {
        let lines = data.toString().split("\n");
        if(lines[lines.length - 1] == "") lines.pop();
        if(this.line_count < 6) {
            console.log(lines);
            if(lines.length > 6) {
                console.log("line len > 6");
                for(let i = this.line_count; i < 6; i++) {
                    this.bot.say(channels[0], lines[i].replace(/\r/g, '\n'));
                    this.line_count++;
                }
                this.proc.kill();
                return;
            } else {
                this.bot.say(channels[0], data.toString().replace(/\r/g, '\n'));
            }
        }
        this.line_count += lines.length;
        if(this.line_count >= 6) {
            this.proc.kill();
        }
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
        this.fetch_ccom_db(undefined, true, undefined);
    }

    // todo: remove unnecessary repetition
    fetch_ccom_db(user, launch, who){
        let bot = this;
        if(user == undefined && who != undefined) {
            console.log(`fetching ccoms (${who['nick']})`)
            request('GET', `${config.get('mongodb.db_address')}/ccoms/author/${who['nick']}`).done(function(res) {
                author_ccoms = JSON.parse(res.getBody());
                let ccoms_list = "";
                for(let i = 0; i < author_ccoms.length; i++) {
                    ccoms_list += `${author_ccoms[i]['name']} `
                }
                if(ccoms_list.length == 0) {
                    bot.say(channels[0], `no ccoms found for ${user}`);
                } else {
                    bot.say(channels[0], ccoms_list);
                }
            });
        } else if(user != undefined && user != "all" && who == undefined) {
            console.log(`fetching ccoms (${user})`)
            request('GET', `${config.get('mongodb.db_address')}/ccoms/author/${user}`).done(function(res) {
                author_ccoms = JSON.parse(res.getBody());
                let ccoms_list = "";
                for(let i = 0; i < author_ccoms.length; i++) {
                    ccoms_list += `${author_ccoms[i]['name']} `
                }
                if(ccoms_list.length == 0) {
                    bot.say(channels[0], `no ccoms found for ${user}`);
                } else {
                    bot.say(channels[0], ccoms_list);
                }
            });
        } else if (user == "all") {
            console.log(`fetching ccoms (${user})`)
            request('GET', `${config.get('mongodb.db_address')}/ccoms`).done(function(res) {
                author_ccoms = JSON.parse(res.getBody());
                let ccoms_list = "";
                for(let i = 0; i < author_ccoms.length; i++) {
                    ccoms_list += `${author_ccoms[i]['name']} `
                }
                if(ccoms_list.length == 0) {
                    bot.say(channels[0], `no ccoms found for ${user}`);
                } else {
                    bot.say(channels[0], ccoms_list);
                }
            });
        } else {
            console.log(`fetching ccoms (globally)`)
            request('GET', `${config.get('mongodb.db_address')}/ccoms`).done(function(res) {
                ccdb = JSON.parse(res.getBody());
                let ccoms_list = "";
                for(let i = 0; i < ccdb.length; i++) {
                    ccoms_list += `${ccdb[i]['name']} `
                }
                if(!launch || launch == undefined) bot.say(channels[0], ccoms_list);
            });
        }
        author_ccoms = {};
    }

    parse_ccom_action(message, who) {
        if((Date.now() - last_ccom_time) / 1000 < 1.5) {
           this.say(channels[0], "Lay off the blow, you're out of control.");
           return;
        }
        last_ccom_time = Date.now();
        let args = message.split(" ");
        if(args[3] == "bash") { this.say(channels[0], "Bash is under construction at this time! :("); return; };
        let nick = who['nick'];
        let host = who['host'];
        let created_date = new Date().toString();
        if(args[0] == ".mlcc") {
            if(args[1] == "add") {
                let action = "add";
                let code = "";
                let name = args[2];
                let lang = args[3];
                if(lang == "bash") { this.say(channels[0], "Bash is under construction at this time! :("); return; };
                for(let i = 4; i < args.length; i++) code += `${args[i]} `;
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == args[2]) {
                        if(ccdb[i]['author_host'] != host && !admins.includes(host)) {
                            this.say(channels[0], "you may not edit a ccom you didn't add!");
                            return;
                        }
                        action = "edit";
                    }
                }
                if(code.match("^https://pastebin.com/raw/")) {
                    let bot = this;
                    request('GET', code).done(function(res, err) {
                        try {
                            let mlcc = new MultiLangCCOM(lang, name, nick, host, res.getBody().toString(), created_date)
                            console.log(mlcc.code);
                            if(!mlcc.match_banned_pattern()) {
                                mlcc.execute_ccom(action, bot)
                            }
                        } catch(err) {
                            console.log(`Error:\n\n${err.message}`)
                        }
                    });
                    return;
                }
                let mlcc = new MultiLangCCOM(lang, name, nick, host, code, created_date)
                mlcc.execute_ccom(action, this);
            } else if(args[1] == "remove") {
                let name = args[2];
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == name) {
                        if(ccdb[i]['author_host'] != host && !admins.includes(host)) {
                            this.say(channels[0], "you may not delete a ccom you didn't add!");
                            return;
                        }
                        new MultiLangCCOM(ccdb[i]['lang'], ccdb[i]['name'], ccdb[i]['author_nick'], ccdb[i]['author_host'],
                        ccdb[i]['code'], ccdb[i]['created_date']).execute_ccom("del", this);
                        return;
                    }
                }
                this.say(channels[0], `no ccom with the name ${name} found`);
                return;
            } else if(args[1] == "list") {
                if(args[2] == undefined) {
                    this.fetch_ccom_db(undefined, false, who);
                    return;
                } else {
                    this.fetch_ccom_db(args[2], false, undefined);
                    return;
                }
            } else if(args[1] == "view") {
                if(args[2] == undefined) {
                    this.say(channels[0], "please provide the name of the ccom");
                    return;
                }
                let bot = this;
                request('GET', `${config.get('mongodb.db_address')}/ccoms/name/${args[2]}`).done(function(res) {
                    let ccom = JSON.parse(res.getBody());
                    if(ccom == undefined || ccom.length == 0) {
                        bot.say(channels[0], `no ccom named ${args[2]} found`);
                        return;
                    } else {
                        bot.say(channels[0],
                            `Language: ${ccom[0]['lang']}\n${ccom[0]['code']}\nAdded by ${ccom[0]['author_nick']}@${ccom[0]['author_host']} on ${ccom[0]['created_date']}`);
                    }
                });
                return;
            } else if(args[1] == "help") {
                this.say(channels[0], "Usage: .mlcc add|remove|list|view|test\nAdd: .mlcc add ccom_name ccom_language ccom_code" +
                                      "\nRemove: .mlcc remove ccom_name\nList: .mlcc list\nView: .mlcc view ccom_name" +
                                      "\nTest: .mlcc test ccom_language ccom_code");
            } else if(args[1] == "test") {
                let code = "";
                let name = "test";
                let lang = args[2];
                if(lang == "bash") { this.say(channels[0], "Bash is under construction at this time! :("); return; };
                for(let i = 3; i < args.length; i++) code += `${args[i]} `
                let mlcc = new MultiLangCCOM(lang, name, nick, host, code, created_date).execute_ccom("test", this, who, args);
            }
        } else {
            for(let i = 0; i < ccdb.length; i++) {
                if(ccdb[i]['name'] == args[0].substr(1, args[0].length)) {
                    new MultiLangCCOM(ccdb[i]['lang'], ccdb[i]['name'], ccdb[i]['author_nick'],
                    ccdb[i]['author_host'], ccdb[i]['code'], ccdb[i]['created_date']).execute_ccom("run", this, who, args);
                }
            }
        }
    }

    start_listener() {
        this.addListener('message', function (from, to, message) {
            console.log(from + ' => ' + to + ': ' + message);
            if(to == channels[0]) {
                if(from != "testytesterbot" && from != "Bark") {
                    if(message.match("^[.]")) {
                        this.whois(from, function(info) {
                            this.parse_ccom_action(message, info);
                        });
                    }
                }
            } else if(to == "testytesterbot") {
                this.say(channels[0], `${from}, no privmsg shenanigans!`)
            }
        });
    }
}
new Bot(server, nick, {channels: channels, port: port, secure: secure, debug: debug});
