module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "module": "readonly",
        "require": "readonly",
        "webkitAudioContext": "readonly",
    },
    "plugins": ["@typescript-eslint"],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module",
        "@typescript-eslint/rule-name": "error"
    },
    "rules": {
        "prefer-const": 2,
        "no-console": 0,
    },
};