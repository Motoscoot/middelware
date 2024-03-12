const jsforce = require('jsforce');

const findDeliveryStatusByOdooId = async (conn, odooId) => {
  console.log(`Buscando Delivery_status__c con Odoo_Id__c: ${odooId}`);
  const records = await conn.query(`SELECT Id, Odoo_Id__c FROM Delivery_status__c WHERE Odoo_Id__c = '${odooId}' LIMIT 1`);
  console.log(`Resultados obtenidos 1: ${JSON.stringify(records)}`);
  const existingId = records && records.records && records.records.length ? records.records[0].Id : null;
  console.log('Actualizacion de objeto ' + existingId);
  return existingId;
};


const findLoyaltyForceTicketIdByOrderNo = async (conn, orderNo) => {
    console.log(`Buscando LoyaltyForce__Ticket__c con LoyaltyForce__OrderNo__c: ${orderNo}`);
    const result = await conn.query(`SELECT Id FROM LoyaltyForce__Ticket__c WHERE LoyaltyForce__OrderNo__c = '${orderNo}' LIMIT 1`);
    console.log(`Resultados obtenidos 2: ${JSON.stringify(result)}`);
    return result && result.records && result.records.length ? result.records[0].Id : null;
};


const newDeliveryStatus = async (req, res) => {
  console.log('Inicio del proceso newDeliveryStatus');

  const {
    name, 
    partner_id,
    status,
    x_SalesforceId,
    picking_id,
    origin,
    scheduled_date,
    move_lines,
    partner_address,
    carrier_tracking_ref,
    username: sfUsername,
    password: sfPassword,
    clientID: clientId,
    clientSecret,
    loginUrl,
  } = req.body;

  console.log('Detalles del cuerpo de la petición:', req.body);

  const conn = new jsforce.Connection({
    oauth2 : {
      clientId : clientId,
      clientSecret : clientSecret,
      loginUrl : loginUrl
    },
  });

  console.log('Iniciando sesión en Salesforce...');
  await conn.login(sfUsername, sfPassword);
  console.log('Sesión en Salesforce iniciada correctamente.');

  const sfSaleOrderId = await findLoyaltyForceTicketIdByOrderNo(conn, origin);

  /*if (!sfSaleOrderId) {
    console.error("El campo 'sfSaleOrderId' está vacío.");
    // Registro del error en Salesforce
    const errorMessage = "El campo 'sfSaleOrderId' está vacío.";
    await logErrorToSalesforce(conn, { message: errorMessage, stack: '' }, 'Error al encontrar sfSaleOrderId');
    // Devolvemos un estado 200 a Odoo a pesar del error
    res.status(200).json({ message: 'El error ha sido registrado en Salesforce' });
    return;
  }*/
  
  let response;
  
  if (!sfSaleOrderId)
  {
      const deliveryStatusData = {
      Name: name,
      Delivery_Address__c: partner_address,
      Status__c: status,
      Odoo_Id__c: picking_id,
      Date__c: new Date(scheduled_date),
      Carrier_tracking_REF__c : carrier_tracking_ref,
      };

      console.log(`Datos para UPSERT/CREATE en Salesforce: ${JSON.stringify(deliveryStatusData)}`);

      if (x_SalesforceId) {
        console.log(`UPSERT usando x_SalesforceId: ${x_SalesforceId}`);
        deliveryStatusData.Id = x_SalesforceId;
        response = await conn.sobject("Delivery_status__c").upsert(deliveryStatusData, 'Id');
      } else {
        const existingSfId = await findDeliveryStatusByOdooId(conn, picking_id);
        if (existingSfId) {
          console.log(`Registro ya existente encontrado con ID: ${existingSfId}`);
          deliveryStatusData.Id = existingSfId;
          response = await conn.sobject("Delivery_status__c").upsert(deliveryStatusData, 'Id');
        } else {
          console.log('Creando un nuevo registro en Salesforce...');
          response = await conn.sobject("Delivery_status__c").create(deliveryStatusData);
        }
        
    }
  }
  else
  {
    const deliveryStatusDataSF = {
      Compra__c: sfSaleOrderId,
      Name: name,
      Delivery_Address__c: partner_address,
      Status__c: status,
      Odoo_Id__c: picking_id,
      Date__c: new Date(scheduled_date),
      Carrier_tracking_REF__c : carrier_tracking_ref,
    };

    console.log(`Datos para UPSERT/CREATE en Salesforce: ${JSON.stringify(deliveryStatusDataSF)}`);

      if (x_SalesforceId) {
        console.log(`UPSERT usando x_SalesforceId: ${x_SalesforceId}`);
        deliveryStatusDataSF.Id = x_SalesforceId;
        response = await conn.sobject("Delivery_status__c").upsert(deliveryStatusDataSF, 'Id');
      } else {
        const existingSfId = await findDeliveryStatusByOdooId(conn, picking_id);
        if (existingSfId) {
          console.log(`Registro ya existente encontrado con ID: ${existingSfId}`);
          deliveryStatusDataSF.Id = existingSfId;
          response = await conn.sobject("Delivery_status__c").upsert(deliveryStatusDataSF, 'Id');
        } else {
          console.log('Creando un nuevo registro en Salesforce...');
          response = await conn.sobject("Delivery_status__c").create(deliveryStatusDataSF);
        }
        
      }
  }

  

  console.log(`Respuesta de Salesforce: ${JSON.stringify(response)}`);

  if (!response.success) {
    console.error("Error al intentar UPSERT:", response);
    await logErrorToSalesforce(conn, 'UPSERT ERROR NEW STATUS', JSON.stringify(response));
    res.status(500).json({ error: 'Error durante el UPSERT' });
  } else {
    console.log(`Operación exitosa: ${response.id}`);
    res.status(200).json({ res: response.id });
  }
};

const logErrorToSalesforce = async (conn, error, additionalInfo) => {
    console.log(`Registrando error en Salesforce: ${error.message}`);
    const errorData = {
      DateTime__c: new Date().toISOString(),
      ErrorMessage__c: error.message,
      ErrorType__c: error.stack,
      RelatedRecordId__c: additionalInfo
    };
   
    try {
      const result = await conn.sobject('TraceLog__c').create(errorData);
      console.log(`Error registrado exitosamente con ID: ${result.id}`);
      return result.id;
    } catch (err) {
      console.error('Falló el registro del error en Salesforce: ', err);
      return null;
    }
};

module.exports = { newDeliveryStatus };
