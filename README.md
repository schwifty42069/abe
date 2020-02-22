Abe - an IRC bot written in nodejs
==================================

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
Bash -- Available in basic form

Available ccom variables:

    user (string) - user who invokes ccom

```
```
Perl -- Available in basic form

Available ccom variables:

    $user (string) - user who invokes ccom
```
```
PHP -- not yet implemented

```
