'use strict';

const irc = require('irc');
const request = require('then-request');
const server = 'chat.freenode.net';
const channels = ['#hlsvillage'];
const nick = 'testytesterbot';
const debug = true;
const secure = true;
const port = 6697;
const accepted_langs = ['python', 'js', 'php', 'c', 'bash'];
const { exec } = require('child_process');
let current_ccom_db = {};

class MultiLangCCOM {

    constructor(lang, name, user, code, time) {
		this.lang = lang;
		this.name = name;
		this.user = user;
		this.code = code;
		this.time = time;
        this.banned_patterns = {
            "python": ["import os", "import subprocess", "import ctypes", "__import__", "importlib"]
        }
    }

    execute_result(error, stdout, action, bot) {
        if(!error) {
            if (action == "add") {
                this.post_ccom();
                bot.say(channels[0], "successfully added ccom!");
            } else if(action == "run") {
                bot.say(channels[0], stdout);
            }
        } else {
            bot.say(channels[0], `The following error occured: ${error}`);
        }
    }

    execute_ccom(action, bot) {
        console.log("executing ccom..");
	if(!accepted_langs.includes(this.lang)) {
            bot.say(channels[0], `${this.lang} is not a supported language for ccoms!`);
            return;
        }
	if(this.lang == "python") {
            if(action == "add") {
                console.log(`checking ${this.code} for banned pattern..`)
                for(let i in this.banned_patterns[this.lang]) {
                    if(this.code.match(this.banned_patterns[this.lang][i])) {
                        bot.say(channels[0], `Use of ${this.banned_patterns[this.lang][i]} is banned for security reasons!`);
                        return;
                    }
                }
            } else if(action == "del") {
                this.remove_ccom();
                bot.say(channels[0], "successfully removed ccom!");
                bot.fetch_ccom_db();
                return;
            }

            /* duckgoose, I'm leaving this pattern w/o the escape char because it triggers
            my linter and I'm too lazy to edit the config file.. */

            this.code = this.code.replace(/"/g, "'");
            let e = exec(`python -c "${this.code}"`, (error, stdout, stderr) => {
                if(error) this.execute_result(error.message, "", action, bot);
                if(stderr) this.execute_result(stderr, "", action, bot);
                this.execute_result(false, stdout, action, bot);
             });
             bot.fetch_ccom_db();
             return;
        }
    }

    post_ccom() {
        request('POST', 'http://192.168.49.105:42069/ccoms', {json: {'lang': this.lang, 'name': this.name, 'author': this.user,
        'code': this.code, 'time': this.time }}).getBody('utf8').then(JSON.parse).done(function (res) {
            console.log(res);
        });
    }

    remove_ccom() {
        request('DELETE', `http://192.168.49.105:42069/ccoms/name/${this.name}`).done(function (res) {
            console.log(res);
        });
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
            current_ccom_db = JSON.parse(res.getBody());
        });
    }

    parse_ccom_action(message, from) {
        let args = message.split(" ");
        if(args[0] == ".mlcc") {
            if(args[1] == "add") {
                let code = "";
                let name = args[2];
                let lang = args[3];
                for(let i = 4; i < args.length; i++) code += `${args[i]} `;
                let mlcc = new MultiLangCCOM(lang, name, from, code, new Date);
                for(let i = 0; i < current_ccom_db.length; i++) {
                    if(current_ccom_db[i]['name'] == args[2]) {
                        this.say(channels[0], "A ccom with this name already exists");
                        return;
                    }
                }
                mlcc.execute_ccom("add", this);
            } else if(args[1] == "remove") {
                console.log("Hit remove path...")
                let name = args[2];
                let author = from;
                for(let i = 0; i < current_ccom_db.length; i++) {
                    if(current_ccom_db[i]['name'] == name) {
                        if(current_ccom_db[i]['author'] != author) {
                            this.say(channels[0], "you may not delete a ccom you didn't add!");
                            return;
                        }
                        new MultiLangCCOM(current_ccom_db[i]['lang'], current_ccom_db[i]['name'], current_ccom_db[i]['user'],
                        current_ccom_db[i]['code'], current_ccom_db[i]['time']).execute_ccom("del", this);
                        return;
                    }
                }
                this.say(channels[0], `no ccom with the name ${name} found`);
                return;
            }
        } else {
            this.fetch_ccom_db();
            console.log(current_ccom_db);
            for(let i = 0; i < current_ccom_db.length; i++) {
                if(current_ccom_db[i]['name'] == args[0].substr(1, args[0].length)) {
                    new MultiLangCCOM(current_ccom_db[i]['lang'], current_ccom_db[i]['name'], current_ccom_db[i]['user'],
                    current_ccom_db[i]['code'], current_ccom_db[i]['time']).execute_ccom("run", this);
                }
            }
        }
    }

    start_listener() {
        this.addListener('message', function (from, to, message) {
            console.log(from + ' => ' + to + ': ' + message);
            if(message.match("^.")) {
                this.parse_ccom_action(message, from);
            }
        });
    }
}
new Bot(server, nick, {channels: channels, port: port, secure: secure, debug: debug});
