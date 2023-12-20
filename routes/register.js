const express = require('express');
const router = express.Router();
const requisterController = require('../controllers/registerController');

class Register{
    constructor(){
        this.app = express();
       /* this.app.post('/register', requisterController.handlerNewUser); */
    }
}


module.exports = new Register().app;