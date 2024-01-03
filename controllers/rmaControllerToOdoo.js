
const Odoo = require('odoo-xmlrpc');

/*url = <insert server URL>
db = <insert database name>
username = 'admin'
password = <insert password for your admin user (default: admin)></insert>*/

const odoo = new Odoo({
    url:'https://b2b.motoscoot.net/',
    //port:'80',
    db: 'motoscoot',
    username:'motoscoot@kaizenstep.com',
    password:'tgVv&74%93nc'
})
/*
const odoo = new Odoo({
    url:'http://kaizenstep-odoo-doctorenergy.odoo.com/',
    port:'80',
    db:'kaizenstep-odoo-doctorenergy-production-6032403',
    //db: 'kaizenstep-odoo-sebas',
    username:'slopez@kaizenstep.com',
    password:'SalesOrg2022!'
})
*/
/*const odoo = new Odoo({
    url:'http://kaizenstep-odoo-sebas-test-nuevos-6641683.dev.odoo.com/',
    port:'80',
    db:'kaizenstep-odoo-sebas-test-nuevos-6641683',
    //db: 'kaizenstep-odoo-sebas',
    username:'slopez@kaizenstep.com',
    password:'SalesOrg2022!'
})*/

const newCase = async (req, res) => {
    console.log('Create Case');
    let caseID = req.body.Id;
    let caseName = req.body.Subject;
    let partnerID = req.body.AccountId;
    if(req.body.ProductId != null)
    {
        let productID = req.body.ProductId;
    }
    else
    {
        let productID = '';
    }
    //let productUOMQty = req.body.Quantity;
    //let productUOM = req.body.UnitOfMeasure;
    console.log('Before connection');
    odoo.connect(function (err) {
        if (err) { return console.log(err); }
        console.log('Connected to Odoo server.');
        var inParams = [];
        inParams.push({
            //'id': caseID,
            'name': caseName,
            'partner_id': partnerID,
            //'product_id': productID,
            //'product_uom_qty': productUOMQty,
            //'product_uom': productUOM,
            'create_date': new Date()
        });
        var params = [];
        params.push(inParams);
        console.log('Before execute');
        odoo.execute_kw('rma.order.line', 'create', params, function (err, value) {
            if (err) {
                console.log('error');
                res.status(500).json({
                    error: 'Error al realizar la insercion en odoo' + err
                })
                 return console.log(err); 
            }
            console.log('Result: ', value);
            res.json({
                res : value
            });
        });
    });
}

const updateCase = async (req, res) => {
    console.log('Update Case');
    let idCase = parseInt(req.body.idCase);
    let caseName = req.body.Subject;
    let partnerID = req.body.AccountId;
    let productID = req.body.ProductId;
    let productUOMQty = req.body.Quantity;
    let productUOM = req.body.UnitOfMeasure;

    odoo.connect(function (err) {
        if (err) { return console.log(err); }
        console.log('Connected to Odoo server.');
        var inParams = [];
        inParams.push([idCase]); //id to update
        inParams.push({
            'name': caseName,
            'partner_id': partnerID,
            'product_id': productID,
            'product_uom_qty': productUOMQty,
            'product_uom': productUOM,
        });
        var params = [];
        params.push(inParams);
        odoo.execute_kw('order.rma', 'write', params, function (err, value) {
            if (err) {
                res.status(500).json({
                    error: 'Error al realizar la insercion en odoo' + err
                })
                 return console.log(err); 
            }
            console.log('Result: ', value);
            res.json({
                res : value
            });
        });
    });
}

module.exports = {newCase, updateCase};
