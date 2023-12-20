
const Odoo = require('odoo-xmlrpc');
const provincias = require('./utils/getCodProvincia');

const odoo = new Odoo({
    url:'http://kaizenstep-odoo-doctorenergy.odoo.com/',
    port:'80',
    db:'kaizenstep-odoo-doctorenergy-production-6032403',
    //db: 'kaizenstep-odoo-sebas',
    username:'slopez@kaizenstep.com',
    password:'SalesOrg2022!'
})
/*const odoo = new Odoo({
    url:'http://kaizenstep-odoo-sebas-test-nuevos-6641683.dev.odoo.com/',
    port:'80',
    db:'kaizenstep-odoo-sebas-test-nuevos-6641683',
    //db: 'kaizenstep-odoo-sebas',
    username:'slopez@kaizenstep.com',
    password:'SalesOrg2022!'
})*/

const newAccount = async (req, res) => {
    console.log('Create Account');
    let accountName = req.body.Name;
    let accountMobile = req.body.PersonMobile;
    let accountEmail = req.body.Email;
    let accountPhone = req.body.Phone;
    let accountSalesforceID = req.body.Id;
    //let accountTitle = req.body.Tittle != '' || req.body.Tittle != null ? req.body.Tittle : 'Mister';
    let accountISCompany = req.body.IsCompany;
    let accountStreet = req.body.BillingStreet;
    let accountCity = req.body.BillingState;
    let accountZip = req.body.BillingPostalCode;
    let accountCountry = req.body.BillingCountry;
    let accountMobilePhone = req.body.MobilePhone;
    let accountProvincia = provincias.obtenerCodigoProvincia(req.body.BillingCity);
    console.log('CAMPO MOVIL ' +  accountMobilePhone);
    console.log('CAMPO PAIS ' + accountCountry);
    console.log('CAMPO EMAIL ' + accountEmail);
    odoo.connect(function (err) {
        if (err) { return console.log(err); }
        console.log('Connected to Odoo server.');
        var inParams = [];
        inParams.push({'name': accountName,
                        'mobile' : accountMobilePhone,
                        'phone' : accountPhone,
                        'email' : accountEmail,
                        'is_company' : accountISCompany,
                        'x_SalesforceId' : accountSalesforceID,
                        'street' : accountStreet,
                        'city' : accountCity,
                        'state_id' : accountProvincia,
                        "country_code" : 'es',
                        "country_id" : 68,
                        "zip" : accountZip
                        //"vat" : accountNifCif
                     })
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'create', params, function (err, value) {
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

const updateAccount = async (req, res) => {
    console.log('Update account');
    let idAccount = parseInt(req.body.idAccount);
    console.log(idAccount);
    let accountName = req.body.Name;
    let accountEmail = req.body.Email;
    let accountPhone = req.body.Phone;
    let accountSalesforceID = req.body.Id;
    //let accountTitle = req.body.Tittle != '' || req.body.Tittle != null ? req.body.Tittle : 'Mister';
    let accountISCompany = req.body.IsCompany;
    let accountStreet = req.body.BillingStreet;
    let accountCity = req.body.BillingCity;
    let accountZip = req.body.BillingPostalCode;
    let accountCountry = req.body.BillingCountry;
    let accountProvincia = provincias.obtenerCodigoProvincia(req.body.BillingCity);
    let accountMobilePhone = req.body.MobilePhone;
    console.log('CAMPO MOVIL ' +  accountMobilePhone);
    console.log('CAMPO PAIS ' + accountCountry);
    console.log('CAMPO EMAIL ' + accountEmail);
    odoo.connect(function (err) {
        if (err) { return console.log(err); }
        console.log('Connected to Odoo server.');
        var inParams = [];
        inParams.push([idAccount]); //id to update
        inParams.push({'name': accountName,
                        'mobile' : accountMobilePhone,
                        'phone' : accountPhone, 
                        'email' : accountEmail,
                        'is_company' : accountISCompany,
                        'x_SalesforceId' : accountSalesforceID,
                        'street' : accountStreet,
                        'state_id' : accountProvincia,
                        'city' : accountCity,
                        "country_code" : 'es',
                        "country_id" : 68,
                        "zip" : accountZip
                        //"vat" : accountNifCif
                        })
        var params = [];
        params.push(inParams);
        odoo.execute_kw('res.partner', 'write', params, function (err, value) {
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



module.exports = {newAccount, updateAccount};