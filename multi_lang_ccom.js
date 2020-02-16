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
const accepted_langs = ['python', 'js', 'php', 'c', 'bash'];
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');
const token_secret = config.get('token.token_secret');
const esc = require('escapeshellarg');
let ccdb = {};

class MultiLangCCOM {

    constructor(lang, name, user, code, time) {
		this.lang = lang;
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
                       "from os", "from subprocess", "from ctypes"]
        }
    }

    fetch_token(json_data) {
        return jwt.sign({
            data: json_data
        }, token_secret, {expiresIn: '1h'});
    }

    execute_result(error, stdout, action, bot) {
        if(!error) {
            if (action == "add") {
                this.post_ccom(bot);
                bot.say(channels[0], "successfully added ccom!");
            } else if(action == "run") {
                bot.say(channels[0], stdout);
            }
        } else {
            bot.say(channels[0], `The following error occured: ${error}`);
            return false;
        }
    }

    execute_ccom(action, bot, who) {
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
                this.remove_ccom(this.user);
                bot.say(channels[0], "successfully removed ccom!");
                bot.fetch_ccom_db();
                return;
            }

            this.code = this.code.replace(/"/g, "'");
            if(who == undefined) who = {"nick": "test"};
            let e = exec(`python -c "user = '${who['nick']}'; ${this.code}"`, (error, stdout, stderr) => {
                if(error) { if(!this.execute_result(error.message, "", action, bot)); return; }
                if(stderr) { if(!this.execute_result(stderr, "", action, bot)); return; }
                this.execute_result(false, stdout, action, bot);
             });
             return;
        } else {
            bot.say(channels[0], "I only understand python right now :( ");
        }
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
        let from = `${who['nick']}!${who['user']}@${who['host']}`
        if(args[0] == ".mlcc") {
            if(args[1] == "add") {
                let code = "";
                let name = args[2];
                let lang = args[3];
                for(let i = 4; i < args.length; i++) code += `${args[i]} `;
                let mlcc = new MultiLangCCOM(lang, name, from, code, new Date().toString());
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == args[2]) {
                        this.say(channels[0], "A ccom with this name already exists");
                        return;
                    }
                }
                mlcc.execute_ccom("add", this);
            } else if(args[1] == "remove") {
                let name = args[2];
                let author = from;
                for(let i = 0; i < ccdb.length; i++) {
                    if(ccdb[i]['name'] == name) {
                        if(ccdb[i]['author'] != author && !admins.includes(who['host'])) {
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
