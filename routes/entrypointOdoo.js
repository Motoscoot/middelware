const express = require('express');
const router = express.Router();

const partnerController = require('../controllers/partnerController');
const productController = require('../controllers/productController');
const purchaseController = require('../controllers/purchaseController');
const rmaController = require('../controllers/rmaController');
const xmlController = require('../controllers/xmlController');
const deliveryStatusController = require('../controllers/deliveryStatusController');

class EntrypointOdoo{
    constructor(){
        this.app = express();
        this.app.post('/newPartner', partnerController.newPartner);
        this.app.post('/updatePartner', partnerController.updatePartner);
        this.app.post('/newProduct', productController.newProduct);
        this.app.post('/updateProduct', productController.updateProduct);
        this.app.post('/newPurchase', purchaseController.newPurchaseOrder);
        this.app.post('/processXmlData', xmlController.downloadAndProcessXmlData);
        this.app.post('/updatePurchase', purchaseController.updatePurchase);
        this.app.post('/newStatus', deliveryStatusController.newDeliveryStatus);

        
        
       // this.app.post('/newRMA', rmaController.newRMAOrder);
       //this.app.post('/updateRMA', rmaController.updateRMAOrder);
       this.app.post('/updateRMA', rmaController.updateRMAOrder);
    }
}



module.exports = new EntrypointOdoo().app;