const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

class Auth{
    constructor(){
        this.app = express();
        this.app.post('/auth', authController.handleLogin);

    }
}


module.exports = new Auth().app;