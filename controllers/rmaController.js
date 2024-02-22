const jsforce = require("jsforce");


const updateRMAOrder = async (req, res) => {
  console.log("Nueva llamada entrante - updateRMA");
  console.log("Body: ", req.body);
  const {
    id,
    state,
    name,
    description,
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
    
    console.log('xxxstate ' + state);
    console.log('xxxid ' + id);
    let query = `SELECT Id, Status, RecordType.Name, Notas_internas__c FROM Case WHERE External_Id__c = '${id}' LIMIT 1`;
    console.log('xxxquery ' + query);
    const result = await conn.query(query);
    var newState = '';
    var NotasInternas = '';

    if (result.records && result.records.length > 0) {
      const caso = result.records[0];
      console.log('xxxcaso ' + caso);
      if(state == 'to_approve')
      {
        if(caso.RecordType.Name == 'RMA - Devoluciones')
        {
          newState = 'InProcess';
        }
        else if(caso.RecordType.Name == 'RMA- Garantía')
        {
          newState = 'WaitingForManufacturer';
        }
      }
      else if(state == 'approved')
      {
        if(caso.RecordType.Name == 'RMA - Devoluciones')
        {
          newState = 'Authorized';
        }
        else if(caso.RecordType.Name == 'RMA- Garantía')
        {
          newState = 'Authorized';
        }
      }
      else if(state == 'cancelled')
      {
        if(caso.RecordType.Name == 'RMA - Devoluciones')
        {
          newState = 'Rejected';
        }
        else if(caso.RecordType.Name == 'RMA- Garantía')
        {
          newState = 'Rejected';
        }
      }
      else if(state == 'done')
      {
        if(caso.RecordType.Name == 'RMA - Devoluciones')
        {
          newState = 'Closed';
        }
        else if(caso.RecordType.Name == 'RMA- Garantía')
        {
          newState = 'Closed';
        }
      }
      //actualización de notas internas
      if(description != null && description != '' && (caso.RecordType.Name == 'RMA - Devoluciones' || caso.RecordType.Name == 'RMA- Garantía'))
      {
         NotasInternas = description;

      }

      if(newState !== '' && NotasInternas == '') {
        const response = await conn.sobject('Case').update({
          Id: caso.Id,
          Status: newState
        });
        
        if(response.success) {
          console.log(`Estado del caso actualizado con éxito: ${response.id}`);
          res.status(200).json({ res: `Caso ${response.id} actualizado con éxito.` });
        } else {
          console.log('Error al actualizar el estado del caso');
          await logErrorToSalesforce(conn, 'UPDATE ERROR', JSON.stringify(response), null);
          res.status(201).json({ res: 'Error: Error al actualizar el estado del caso.' });
        }
      } 
      /*else {
        console.log('El estado del caso ya está en el valor correcto');
        res.status(200).json({ res: 'Operación omitida: El estado del caso ya está en el valor correcto.' });
      }*/

      else if(newState == '' && NotasInternas != '') {
        const response = await conn.sobject('Case').update({
          Id: caso.Id,
          Notas_internas__c: NotasInternas
        });
        
        if(response.success) {
          console.log(`Notas internas del caso actualizadas con éxito: ${response.id}`);
          res.status(200).json({ res: `Caso ${response.id} actualizado con éxito.` });
        } else {
          console.log('Error al actualizar Notas internas del caso');
          await logErrorToSalesforce(conn, 'UPDATE ERROR', JSON.stringify(response), null);
          res.status(201).json({ res: 'Error: Error al actualizar las Notas internas del caso.' });
        }
      }
      
      else if(newState != '' && NotasInternas != '') {
        const response = await conn.sobject('Case').update({
          Id: caso.Id,
          Status: newState,
          Notas_internas__c: NotasInternas
        });
        
        if(response.success) {
          console.log(`Notas internas y estado del caso actualizados con éxito: ${response.id}`);
          res.status(200).json({ res: `Caso ${response.id} actualizado con éxito.` });
        } else {
          console.log('Error al actualizar Notas internas y estado del caso');
          await logErrorToSalesforce(conn, 'UPDATE ERROR', JSON.stringify(response), null);
          res.status(201).json({ res: 'Error: Error al actualizar las Notas internas y estado del caso.' });
        }
      } 

    } else {
      console.log('No se ha encontrado el caso especificado');
      await logErrorToSalesforce(conn, 'GET ERROR', JSON.stringify(result), null);
      res.status(200).json({ res: 'Error: No se encontró el caso especificado.' });
    }
  });
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

  
  module.exports = { updateRMAOrder };
