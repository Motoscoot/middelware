const express = require('express');
const router = express.Router();

const accountController = require('../controllers/accountController');
const rmaController = require('../controllers/rmaControllerToOdoo');
const rmaControllerUpdate = require('../controllers/rmaController');


class EntryPointSF{
    constructor(){
        this.app = express();
        this.app.post('/newAccount', accountController.newAccount);
        this.app.post('/updateAccount', accountController.updateAccount);
        this.app.post('/newRma', rmaController.newCase);
        this.app.post('/newOrderRma', rmaController.newCase);
        //this.app.post('/updateRma', rmaController.updateCase);
        this.app.post('/updateRMA', rmaControllerUpdate.updateRMAOrder);
    }   
}



module.exports = new EntryPointSF().app;