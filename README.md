Abe - an IRC bot written in nodejs
==================================
***

This bot is intended to allow users in an IRC channel to create custom commands in multiple languages.

Data for the user created commands are stored in a mongodb instance via RESTful API implemented with the scripts located in the api directory and server.js

**The following languages will be available for use:**
```
Python -- Fully functional!

Available ccom variables:

    user (string) - user who invokes ccom

    args (array) - arguments passed with ccom

    arg_str (string) - joined args array without ccom name
```

```
Ruby -- not yet implemented
```
```
Javascript -- Fully functional!*

Available ccom variables:

    user (string) - user who invokes ccom

    args (array) - arguments passed with ccom

    arg_str (string) - joined args array without ccom name

    *note: nodejs instance is slow to spawn (ccoms are slow)
```
```
Bash -- Fully functional!

Available ccom variables:

    user (string) - user who invokes ccom

    args (array) - arguments passed with ccom

    arg_str (string) - joined args array without ccom name

```
```
Perl -- Available in basic form

Available ccom variables:

    $user (string) - user who invokes ccom

    $args (array) - arguments passed with ccom

    $arg_str (string) - joined args array without ccom name
```
```
PHP -- not yet implemented

```
***
Usage
======
***
*The following assumes you have mongodb configured with a user that has read/write permissions on the CCOM db and that you are using a unix based system*

This bot consists of three primary components.

1. *The Server* - This is the server for the RESTful API used by the bot.

2. *The RESTful API* - The API is comprised of 3 components: the model, the controller and the routes.

3. *The IRCBot module* - The bot itself which communicates with the other components.

**Setup**

The first thing you'll need to do is set up the default.json config file in the config directory. These settings include IRC server/port/nick/security, setting admins for the bot, db configuration and token generation configuration. It will look something like this: \(NOTE: The irc module used by this bot has many more configurable settings you can find [here](https://www.npmjs.com/package/irc)\)

![example config file](https://i.imgur.com/9KEG5nZ.png)

Once you have your config file set up, the rest is straight forward. You'll need to start the mongodb daemon and the server (server.js) on the machine you've configured them to run on.

![starting the server and mongod](https://i.imgur.com/f9YslF1.png)

Finally, you need to start the bot \(ircbot.js\)

![starting bot](https://i.imgur.com/IxzT7OR.png)

**Bot Commands**

*Usage for the bot commands are as follows (all commands are passed over IRC)*

Usage: .mlcc add|remove|list|view

Add: .mlcc add ccom_name ccom_language ccom_code

Remove: .mlcc remove ccom_name

List: .mlcc list \(optional: nick can be passed\)

View: .mlcc view ccom_name

*Feel free to contact me here on github for help!*
