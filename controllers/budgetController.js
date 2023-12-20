const Odoo = require('odoo-xmlrpc');


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

const newBudget = async (req, res) => {
    let budgetCompanyId = req.body.companyId; // usuario o empresa asociada al presupuesto
    let commercial = req.body.commercial;
    console.log('Company id  ES ' + budgetCompanyId);
    let budgetName = req.body.budgetName;
    let closeDate = req.body.closeDate;
    let stageName = req.body.stage;
    let amount = req.body.amount;
    let instalationCode = req.body.InstalationCode;

    let clientOrder = req.body.clientOrder;
    let x_SalesforceId = req.body.oppSalesforceID;
    let x_PrecioE2 = req.body.precioE2;
    console.log('CLIENT ORDER ES ' + clientOrder);
    console.log('La linea de instalacion es ' + instalationCode);

    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    const timeClosed = Date.parse(closeDate);
    const future = new Date(timeClosed);
    odoo.connect(function (err) {
        if (err) { return console.log(err); }
        console.log('Connected to Odoo server.');
        var inParams = [];
        inParams.push({'company_id': parseInt(budgetCompanyId),
                        'name' : budgetName,
                        'validity_date' :  future.toISOString().split('T')[0],
                        'date_order' : today.toISOString().split('T')[0],
                        'amount_total' : amount,
                        'sale_order_template_id' : parseInt(instalationCode), 
                        'client_order_ref' : parseInt(clientOrder),
                        'partner_id' : parseInt(clientOrder),
                        'x_SalesforceId' : x_SalesforceId,
                        'x_PrecioE2' : x_PrecioE2,
                        'user_id' : parseInt(commercial)
                     })
        var params = [];
        params.push(inParams);
        odoo.execute_kw('sale.order', 'create', params, function (err, value) {
            if (err) {
                res.status(500).json({
                    error: 'Error al realizar la insercion en odoo' + err
                })
                 return console.log(err); 
            }
            res.json({
                res : value
            });
        });
        //Se realiza una actualizacion del ultimo insertado para forzar que la plantilla se fije.


    });
    
}

const newBudgetSection = async (req, res) => {
    let retorno;
    let errorResponse = false;
    const arrayInt = req.body.sections;
    for(let i = 0; i < arrayInt.length; i++){
        let budgetCompanyId = arrayInt[i].companyId; // usuario o empresa asociada al presupuesto
        let sectionName = arrayInt[i].sectionName;
        let parentId = arrayInt[i].parentBudget;
        let totalPrice = arrayInt[i].totalPrice;

         //'display_type' : 'line_section'

        odoo.connect(function (err) {
            if (err) { return console.log(err); }
            console.log('Connected to Odoo server.');
            var inParams = [];
            inParams.push({'x_name' : sectionName,
                            'x_order_id' : parseInt(parentId),
                            'x_totalPrice' : parseFloat(totalPrice)
                         })
            var params = [];
            params.push(inParams);
            odoo.execute_kw('x_quote.lines', 'create', params, function (err, value) {
                if (err) {
                    errorResponse = true;
                     return console.log(err); 
                }
                console.log('Result: ', value);
                retorno = value;
            });
        });

    }
    if(errorResponse == true){
        res.status(500).json({
            error: 'Error al realizar la insercion en odoo' + err
        })
    }else{
        res.json({
            res : retorno
        });
    }


}

const updateBudget = async (req, res) => {
    let idElement = req.body.idElement;
    let budgetName = req.body.budgetName;
    let closeDate = req.body.closeDate;
    let stageName = req.body.stage;
    let amount = req.body.amount;
    let instalationCode = req.body.InstalationCode;
    let clientOrder = req.body.clientOrder;
    let x_SalesforceId = req.body.oppSalesforceID;
    let x_PrecioE2 = req.body.precioE2;
    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    const timeClosed = Date.parse(closeDate);
    const future = new Date(timeClosed);
        odoo.connect(function (err) {
            if (err) { return console.log(err); }
            console.log('Connected to Odoo server.');
            var inParams = [];
            inParams.push([parseInt(idElement)]); //id to update
            inParams.push({'company_id': parseInt(budgetCompanyId),
                            'name' : budgetName,
                            'validity_date' :  future.toISOString().split('T')[0],
                            'date_order' : today.toISOString().split('T')[0],
                            'amount_total' : amount,
                            //'sale_order_template_id' : configureLine(instalationCode), 
                            'client_order_ref' : parseInt(clientOrder),
                            'partner_id' : parseInt(clientOrder),
                            'x_SalesforceId' : x_SalesforceId,
                            'x_PrecioE2' : x_PrecioE2
                        })
            var params = [];
            params.push(inParams);
            odoo.execute_kw('sale.order', 'write', params, function (err, value) {
                if (err) {
                    res.status(500).json({
                        error: 'Error al realizar la recuperacion en odoo' + err
                    })
                     return console.log(err); 
                }
                res.json({
                    res : value
                });
            });
        });
}

module.exports = {newBudget, newBudgetSection, updateBudget};