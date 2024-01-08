const jsforce = require("jsforce");
const { newProduct } = require("./productController");
const getSalesforceId = async (
  conn,
  objectName,
  externalIdField,
  externalId
) => {
    let query = `SELECT Id FROM ${objectName} WHERE ${externalIdField} = '${externalId}' LIMIT 1`;
  if(objectName == 'Account'){
     query = `SELECT Id, PersonContactId FROM ${objectName} WHERE ${externalIdField} = '${externalId}' LIMIT 1`;
  }else{
     query = `SELECT Id FROM ${objectName} WHERE ${externalIdField} = '${externalId}' LIMIT 1`;
  }
  const result = await conn.query(query);
  if (result.records && result.records.length > 0 && objectName == 'Account') {
    return {
      //accountId: result.records[0].Id,
      accountId: result.records[0].PersonContactId
    };
  }
  if(result.records && result.records.length > 0 && objectName == 'LoyaltyForce__Product__c'){
    console.log(result.records[0]);
    return {
      productId : result.records[0].Id 
    };
  }
  return null;
};
const findCategoryById = async (conn, categoryId) => {
  const query = `SELECT Id FROM LoyaltyForce__Category__c WHERE LoyaltyForce__CategoryId__c = '${categoryId}'`;
  const result = await conn.query(query);

  if (result.totalSize > 0) {
    return result.records[0];
  }

  return null;
};

const createProductAndGetId = async (conn, productDetail) => {
  const queryProduct = `SELECT Id FROM LoyaltyForce__Product__c WHERE LoyaltyForce__ProductCode__c = '${productDetail.default_code}'`;
  const resultProduct = await conn.query(queryProduct);

  if (resultProduct.totalSize !== 0) {
    return resultProduct.records[0].Id;
  } else {
    // Crear el producto y obtener el productId
    const productId = await createProductIfNotExists(conn, productDetail);
    return productId;
  }
};

const createProductIfNotExists = async (conn, productDetail) => {
  const queryProduct = `SELECT Id FROM LoyaltyForce__Product__c WHERE LoyaltyForce__ProductCode__c = '${productDetail.default_code}'`;
  const resultProduct = await conn.query(queryProduct);

  if (resultProduct.totalSize === 0) {
    let category = await findCategoryById(conn, productDetail.categ_id);

    if (!category) {
      console.warn(`Category with id ${productDetail.categ_id} not found. Assigning category with value 1.`);
      category = { Id: '1' }; // Assigning category with value 1
    }

    const productData = {
      LoyaltyForce__ProductCode__c: productDetail.default_code,
      Odoo_id__c: productDetail.id,
      magento_code__c: productDetail.magentoId,
      Name: isCompleteProduct(productDetail.name),
      LoyaltyForce__ProductDescription__c: isComplete(productDetail.description),
      LoyaltyForce__SKU__c: productDetail.default_code,
      LoyaltyForce__StandardPriceEur__c: productDetail.price,
      LoyaltyForce__CategoryCode1__c: category.Id,
    };
    const response = await conn.sobject("LoyaltyForce__Product__c").create(productData);
    if (!response.success) {
      console.log(response);
      return null;
    }
    return response.id;
  }
  return resultProduct.records[0].Id;
};

const createCustomer = async (conn, email, customer_id, customer_create_date, customer_fullname, customer_nif, customer_pricelist) => {
  // Dividir el nombre completo en nombre y apellido
  const nameArray = customer_fullname.split(' ').map(name => name.trim());
  let customer_firstname, customer_lastname;

  // Revisar la longitud del array de palabras y aplicar la lógica requerida
  switch(nameArray.length){
    case 4:
      customer_firstname = nameArray.slice(0, 2).join(' ');
      customer_lastname = nameArray.slice(2).join(' ');
      break;
    case 3:
      customer_firstname = nameArray[0];
      customer_lastname = nameArray.slice(1).join(' ');
      break;
    case 2:
      customer_firstname = nameArray[0];
      customer_lastname = nameArray[1];
      break;
    default:
      customer_firstname = "";
      customer_lastname = customer_fullname;
      break;
  }

   let b2bOrb2c = 'B2B';  
  
   if(customer_pricelist != null && customer_pricelist === 'string' && (customer_pricelist.starsWith('B2C'))){
     b2bOrb2c = 'B2C'
   }
    // Define isCompany a false por defecto
    let isCompany = false;
  
    // Verificar si customer_nif comienza con "ES" o "PT" y el siguiente valor es superior a dos
    if (typeof customer_nif === 'string'  && (customer_nif.startsWith('ES') || (customer_nif.startsWith('PT') && parseInt(customer_nif.substring(2)) > 2))) {
      isCompany = true;
    }
  //Obtenemos o generamos pricelist
  let priceListId;
  let query = `SELECT Id, Name FROM priceList__c WHERE Name = '${customer_pricelist}' LIMIT 1`;
  const result = await conn.query(query);
  console.log('Se trata de obtener la tarifa existente', result.records );
  if(result.records == null || result.records.length == 0){
    const response = await conn.sobject('priceList__c').create({
      Name: customer_pricelist,
      type__c: b2bOrb2c,
    }); 
    if(response.success){
      priceListId = response.Id;
      console.log('response de la obtencion de la tarifa es ', response);
    }else{
      console.log('No se pudo generar priceList en salesforce');
    }
  }else{
    console.log("respuesta de la obtencion de la priceList es" + result.records[0])
    priceListId = result.records[0].Id;
  }

  // Verificar si ya existe una cuenta con el mismo correo electrónico
  let accountInfo = await getSalesforceId(conn, 'Account', 'PersonEmail', email);
  //refuerzo porsis lo encontramos por nif o algo
  if(accountInfo == null){
    accountInfo = await getSalesforceId(conn, 'Account', 'LoyaltyForce__Nif__c', customer_nif);
  }
  if (accountInfo) {
    // Si la cuenta existe, obtén el PersonContactId
    let id = accountInfo.accountId;
    console.log('El Id para la cuenta recuperada es : ' + id);
    let query = `SELECT Id, PersonContactId FROM Account WHERE PersonContactId = '${id}' LIMIT 1`;
    const result = await conn.query(query);
    if(result.records && result.records.length > 0){
      console.log('Se actualiza la tarifa con id' , priceListId);
      await conn.sobject('Account').update({
        Id: result.records[0].Id,
        FirstName: customer_firstname,
        LastName: customer_lastname,
        Odoo_creation_date__c: customer_create_date,
        LoyaltyForce__LifecycleStage__pc:'Multiple purchases',
        //LoyaltyForce__Nif__c: customer_nif != false ? customer_nif : '',
        isCompany__c: isCompany, 
        priceList__c: priceListId != null || priceListId != '' ? priceListId : 'a147S000000Iz8vQAC'
      });
      console.log('El account actualizado corresponde con ', result.records[0].PersonContactId)
      return result.records[0].PersonContactId;

    }else{
      console.log("No se pudo obtener el PersonContactId para la cuenta existente");
      return null;
    }

  } else {
    // Si la cuenta no existe, crea una nueva
    console.log('Se actualiza la tarifa con id' , priceListId);
    const accountData = {
      FirstName: customer_firstname,
      LastName: customer_lastname,
      Odoo_id__c: customer_id,
      PersonEmail: email,
      LoyaltyForce__External_Id__c : email,
      Odoo_creation_date__c : customer_create_date, 
      LoyaltyForce__LifecycleStage__pc: "1st purchase",
      LoyaltyForce__Nif__c: customer_nif != false ? customer_nif : '',
      isCompany__c: isCompany,
      priceList__c: priceListId != null ? priceListId : 'a147S000000Iz8vQAC' 
    };

    const response = await conn.sobject('Account').create(accountData);
    if (response.success) {
      let id = response.id;
      let query = `SELECT Id, PersonContactId FROM Account WHERE id = '${id}' LIMIT 1`;
      const result = await conn.query(query);
      if(result.records && result.records.length > 0){
        return result.records[0].PersonContactId;
      }else{
        console.log(response);
        return null;
      }
    } else {
      console.log(response);
      return null;
    }
  }
};

const newPurchaseOrder = async (req, res) => {
  console.log("Nueva llamada entrante - newPurchaseOrder");
  console.log("Body: ", req.body);
  const {
    id,
    name,
    customer_id,
    customer_email,
    customer_create_date,
    customer_name,
    customer_pricelist,
    date_order,
    order_line,
    currency_id,
    state,
    amount_total,
    amount_untaxed,
    amount_tax,
    discount,
    payment_mode,
    customer_nif,
    shipping_cost,
    discount_code,
    x_SalesforceId,
    delivery_address,
    invoice_address,
    activity_state,
    invoice_status,
    username: sfUsername,
    password: sfPassword,
    clientID: clientId,
    clientSecret,
    loginUrl,
  } = req.body;

  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl,
      clientId,
      clientSecret,
    },
  });

  conn.login(sfUsername, sfPassword, async (err) => {
    if (err) {
      console.log(err);
      return;
    }
    // Comprobar si customer_email contiene '//', si es así, dividirlo en un array de correos electrónicos
    const emailArray = customer_email != null && customer_email != '' && customer_email.includes('//') ? customer_email.split('//').map(email => email.trim()) : [customer_email];
    let accountId;
    // Comprobar si el customer_SalesforceId es false, lo que indica que el cliente no existe en Salesforce
    if (!x_SalesforceId ) {

      // Llamar al método para crear un nuevo cliente en Salesforce y asignar el accountId creado
      accountId = await createCustomer(conn, emailArray[0], customer_id, customer_create_date, customer_name, customer_nif, customer_pricelist);
      if (!accountId) {
        console.log('Error al crear el cliente');
        await logErrorToSalesforce(conn, 'INSERT ERROR', JSON.stringify(res), null);
        res.status(201).json({ res: 'Error: Error al insertar el cliente. '});
        return;
      }
    }else{
        //Si tiene x_SalesforceId recuperamos el personContactID de el usuario
        let accountIdForUpdate;
        let query = `SELECT Id, PersonContactId FROM Account WHERE Id = '${x_SalesforceId}' LIMIT 1`;
        const result = await conn.query(query);
        if (result.records && result.records.length > 0) {
          accountId = result.records[0].PersonContactId;
          accountIdForUpdate = result.records[0].Id;
        }else{
          let query = `SELECT Id, PersonContactId FROM Account WHERE LoyaltyForce__External_Id__c = '${emailArray[0]}' LIMIT 1`;
          const result = await conn.query(query);
          if (result.records && result.records.length > 0) {
            accountId = result.records[0].PersonContactId;
            accountIdForUpdate = result.records[0].Id;
          }else{
            console.log('Error al reculperar el cliente');
            await logErrorToSalesforce(conn, 'GET ERROR', JSON.stringify(result), null);
            res.status(201).json({ res: 'Error: Error al recuperar el cliente. '});
            return;
          }
        }
          /**
         * Obtener pricelist
         *   let priceListId;
         */
        let b2bOrb2c = 'B2B';  

        if(customer_pricelist != null && customer_pricelist === 'string' && (customer_pricelist.starsWith('B2C'))){
          b2bOrb2c = 'B2C'
        }
        let queryPricelist = `SELECT Id, Name FROM priceList__c WHERE Name = '${customer_pricelist}' LIMIT 1`;
        const resultPricelist = await conn.query(queryPricelist);
        console.log('Se trata de obtener la tarifa existente', resultPricelist.records );
        if(resultPricelist.records == null || resultPricelist.records.length == 0){
          const response = await conn.sobject('priceList__c').create({
            Name: customer_pricelist,
            type__c: b2bOrb2c,
          }); 
          if(response.success){
            priceListId = response.Id;
            console.log('response de la obtencion de la tarifa es ', response);
          }else{
            console.log('No se pudo generar priceList en salesforce');
          }
        }else{
          console.log("respuesta de la obtencion de la priceList es" + resultPricelist.records[0])
          priceListId = resultPricelist.records[0].Id;
        }
        console.log('Trato de realizar update del account con id ', accountId);
        console.log('El pricelist es  ', priceListId);
        const responseFromAccountUpdate = await conn.sobject('Account').update({
            Id: accountIdForUpdate,
            priceList__c: priceListId != null || priceListId != '' ? priceListId : 'a147S000000Iz8vQAC'
          });

      }
      
    let b2bOrb2c = 'B2B';  
    let pointOfSale = 'a0n7S00000193BgQAI';
    console.log('Customer_pricelist es ', customer_pricelist);
    if(customer_pricelist != null && typeof customer_pricelist === 'string' && customer_pricelist.startsWith('B2C')){
      b2bOrb2c = 'B2C';
      pointOfSale = 'a0n7S0000018zB1QAI';
      console.log('El point of sales es B2C');
    } else {
        console.log('El point of sales es B2B');
    }


    console.log('Customer id ' + accountId);
    const purchaseOrderData = {
      //activity_state
      Estado_pedido__c: invoice_status != 'false' && invoice_status != false ? invoice_status : '',
      LoyaltyForce__OrderNo__c: isComplete(name),
      LoyaltyForce__StoreOrderNumber__c : isComplete(name),
      LoyaltyForce__OrderDate__c: isComplete(date_order, true),
      LoyaltyForce__CustomerId__c: accountId,
      LoyaltyForce__OrderTotalItems__c: order_line.length,
      LoyaltyForce__OrderTotalEur__c: isComplete(amount_total),
      LoyaltyForce__OrderCurrency__c: currency_id == 1 ? "EUR" : "USD",
      LoyaltyForce__Status__c: isComplete(state),
      Amount_Untaxed__c: isComplete(amount_untaxed),
      Amount_Tax__c: isComplete(amount_tax),
      LoyaltyForce__DiscountCodeValue__c: isComplete(discount),
      LoyaltyForce__Payment_method__c: isComplete(payment_mode.name),
      LoyaltyForce__PointOfSales__c : pointOfSale,
      LoyaltyForce__DiscountCodeType__c : 'FixedValue',
      Shipping_Cost__c: isComplete(shipping_cost),
      LoyaltyForce__DiscountCode__c: isComplete(discount_code),
      Delivery_Address__c: isComplete(delivery_address),
      Invoice_Address__c: isComplete(invoice_address),
      LoyaltyForce__OrderChannel__c: name.includes('MAG') ? 'ecommerce' : 'TPV',
      LoyaltyForce__OrderCurrencyTotal__c : isComplete(amount_tax),
      // Agrega otros campos aquí como LoyaltyForce_Type__c, etc.
    };

    const response = await conn
      .sobject("LoyaltyForce__Ticket__c")
      .create(purchaseOrderData);

    if (!response.success) {
      await logErrorToSalesforce(conn, 'CREATE ERROR', JSON.stringify(response), null);
      res.status(201).json({ res: 'Error: Error al insertar el ticket. '});
    } else {
      console.log(`Operación exitosa: ${response.id}`);
      let index = 0;
      for (const line of order_line) {
        index ++;
        const productId = await getSalesforceId(
          conn,
          "LoyaltyForce__Product__c",
          "LoyaltyForce__ProductCode__c",
          line.product_id
        );
        
        //let productIdObtained =  productId ? productId : null;
        let productIdObtained =  productId ? productId.Id : null;
        if (!productIdObtained) {
          // Crear el producto y obtener el productId
          const productDetail = {
            name: isCompleteProduct(line.productDetail_name),
            id : line.productDetail_id,
            description : line.productDetail_description,
            extra_code : line.productDetail_extra_code,
            price : line.productDetail_price, 
            default_code : line.productDetail_default_code,
            categ_id : line.productDetail_categ_id,
            magentoId : line.productDetail_magentoId, 
            username: sfUsername,
            password: sfPassword,
            clientID: clientId,
            clientSecret : clientSecret,
            loginUrl : loginUrl
          };
          //productIdObtained = await createProductAndGetId(conn, productDetail);
          productIdObtained = await createProductAndGetId(conn, { ...productDetail });
        }    
    
        const ticketLineData = {

          //LoyaltyForce__CategoryId__c: categoryId,
          LoyaltyForce__CustomerId__c: accountId,
          LoyaltyForce__LineNumber__c: index,
          LoyaltyForce__LineTotalCurrency__c:
            line.price_unit * line.product_uom_qty,
          LoyaltyForce__OrderId__c: response.id,
          
          LoyaltyForce__ProductId__c: productIdObtained,
          LoyaltyForce__Quantity__c: line.product_uom_qty,
          LoyaltyForce__UnitPriceEur__c: line.price_unit,
          LoyaltyForce_ProductUOM__c: line.product_uom.name,
          LoyaltyForce__LineTotalEur__c: line.price_unit * line.product_uom_qty,
          //LoyaltyForce_Taxes__c: line.taxes_id.map((tax) => tax.name).join(", "),
          LoyaltyForce_Description__c: isComplete(line.name),
          LoyaltyForce_PriceSubtotal__c: line.price_subtotal,
          LoyaltyForce_Discount__c: line.discount,
          Shipping_Cost__c: line.shipping_cost,
        };

        const ticketLineResponse = await conn
          .sobject("LoyaltyForce__TicketLine__c")
          .create(ticketLineData);
        if (!ticketLineResponse.success) {
          console.log(ticketLineResponse);
          await logErrorToSalesforce(conn, 'INSERT ERROR', JSON.stringify(res), null);
          res.status(201).json({ res: 'Error: Error al insertar la linea de ticket. '});
          return;
        }
      }

      res.status(200).json({ res: response.id });
    }
  });
};

const updatePurchase = async (req, res) => {
  console.log("Nueva llamada entrante - updatePurchase");
  console.log("Body: ", req.body);

  const {
    id,
    name,
    state,
    activity_state,
    invoice_status,
    username: sfUsername,
    password: sfPassword,
    clientID: clientId,
    clientSecret,
    loginUrl,
  } = req.body;

  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl,
      clientId,
      clientSecret,
    },
  });

  conn.login(sfUsername, sfPassword, async (err) => {
    if (err) {
      console.log(err);
      return;
    }

    let query = `SELECT Id, LoyaltyForce__Status__c FROM LoyaltyForce__Ticket__c WHERE LoyaltyForce__OrderNo__c = '${name}' LIMIT 1`;
    const result = await conn.query(query);

    if (result.records && result.records.length > 0) {
      const ticket = result.records[0];
      if(ticket.LoyaltyForce__Status__c !== state) {
        const response = await conn.sobject('LoyaltyForce__Ticket__c').update({
          Id: ticket.Id,
          LoyaltyForce__Status__c: state,
          Estado_pedido__c: invoice_status != 'false' && invoice_status != false ? invoice_status : ''
        });
        
        if(response.success) {
          console.log(`Estado del ticket actualizado con éxito: ${response.id}`);
          res.status(200).json({ res: `Ticket ${response.id} actualizado con éxito.` });
        } else {
          console.log('Error al actualizar el estado del ticket');
          await logErrorToSalesforce(conn, 'UPDATE ERROR', JSON.stringify(response), null);
          res.status(202).json({ res: 'Error: Error al actualizar el estado del ticket.' });
        }
      } else {
        console.log('El estado del ticket ya está en el valor proporcionado');
        res.status(200).json({ res: 'Operación omitida: El estado del ticket ya está en el valor proporcionado.' });
      }

    } else {
      console.log('No se encontró el ticket especificado');
      await logErrorToSalesforce(conn, 'GET ERROR', JSON.stringify(result), null);
      res.status(203).json({ res: 'Error: No se encontró el ticket especificado.' });
    }
  });
};


const isCompleteProduct = (value, isDate = false) => {
  if (isDate && value) {
    return new Date(value).toISOString();
  }
  if (value && value !== "false" && value !== "") {
    return value.length > 80 ? value.substring(0, 80) : value;
  }
  return "";
};
const logErrorToSalesforce = async (conn, error, additionalInfo) => {
  const errorData = {
    DateTime__c: new Date().toISOString(),
    ErrorMessage__c: error.message,
    ErrorType__c: error.stack,
    RelatedRecordId__c: additionalInfo
  };
 
  try {
    const result = await conn.sobject('TraceLog__c').create(errorData);
    return result.id;
  } catch (err) {
    console.log('Failed to log error to Salesforce: ', err);
    return null;
  }
};


const isComplete = (value, isDate = false) => {
  if (isDate && value) {
    return new Date().toISOString();
    //return new Date(value).toISOString();
  }
  if (value && value !== "false" && value !== "") {
    return value.length > 120 ? value.substring(0, 120) : value;
  }
  return "";
};
module.exports = { newPurchaseOrder, updatePurchase };
