const jsforce = require('jsforce');

const isValidEmail = (email) => {
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return emailRegex.test(email);
};

const newPartner = async (req, res) => {
    const {
        name, id, email, phone, mobile, nif, language, jobposition, website,
        street, city, cp, username: sfUsername, password: sfPassword, clientID: clientId,
        clientSecret, loginUrl, contacts, create_date,
    } = req.body;

    const nameArray = name.split(' ').map(name => name.trim());
    let FirstName, LastName;

    switch(nameArray.length){
        case 4:
            FirstName = nameArray.slice(0, 2).join(' ');
            LastName = nameArray.slice(2).join(' ');
            break;
        case 3:
            FirstName = nameArray[0];
            LastName = nameArray.slice(1).join(' ');
            break;
        case 2:
            FirstName = nameArray[0];
            LastName = nameArray[1];
            break;
        default:
            FirstName = "";
            LastName = name;
            break;
    }

    // Define isCompany a false por defecto
    let isCompany = false;

    // Verificar si customer_nif comienza con "ES" o "PT" y el siguiente valor es superior a dos
    if (typeof nif === 'string'  && (nif.startsWith('ES') || (nif.startsWith('PT') && parseInt(nif.substring(2)) > 2))) {
        isCompany = true;
      }
      
      if (!isValidEmail(email)) {
        console.log('INVALID_EMAIL: Email provided is not valid');
        await logErrorToSalesforce(conn, 'INVALID_EMAIL', 'Email provided is not valid', null);
        res.status(200).json({ res: 'Error' }); // Aquí cambiamos a 200
        return;
    }


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

        const queryByEmail = `SELECT Id FROM Account WHERE LoyaltyForce__External_Id__c = '${email}'`;
        const queryByNif = `SELECT Id FROM Account WHERE LoyaltyForce__Nif__c = '${nif}'`;

        const resultByEmail = await conn.query(queryByEmail);
        const resultByNif = await conn.query(queryByNif);

        if (resultByEmail.totalSize !== 0 && resultByNif.totalSize !== 0 && resultByEmail.records[0].Id !== resultByNif.records[0].Id) {
            console.log('DUPLICATE_VALUE: LoyaltyForce__Nif__c and LoyaltyForce__External_Id__c conflict with different records');
            await logErrorToSalesforce(conn, new Error('DUPLICATE_VALUE'), 'LoyaltyForce__Nif__c and LoyaltyForce__External_Id__c conflict with different records');
            res.status(200).json({ res: 'Error' });
            return;
        }
        const accountData = {
            FirstName: isComplete(FirstName),
            LastName: isComplete(LastName),
            Odoo_id__c: isComplete(id),
            PersonEmail: isComplete(email),
            Phone: isComplete(phone),
            PersonMobilePhone: isComplete(mobile),
            Website: isComplete(website),
            LoyaltyForce__Nif__c: isComplete(nif),
            ShippingStreet: isComplete(street),
            ShippingCity: isComplete(city),
            ShippingPostalCode: isComplete(cp),
            Odoo_creation_date__c : isComplete(create_date),
            LoyaltyForce__Languages__pc: isComplete(language),
            LoyaltyForce__External_Id__c: isComplete(email),
            LoyaltyForce__SourceChannel__pc: "Ecommerce",
            LoyaltyForce__LoyaltyStatus__pc: "InLoyalty",
            LoyaltyForce__LifecycleStage__pc: "Customer account",
            isCompany__c: isCompany,
        };

        let response = {};
       
        if (resultByEmail.totalSize !== 0) {
            try{
                response = await conn.sobject("Account").upsert(accountData, 'LoyaltyForce__External_Id__c');
                response.id = resultByEmail.records[0].Id;
            }catch(error){
                if (error.errorCode === 'DUPLICATES_DETECTED') {
                    console.log('DUPLICATES_DETECTED: Se detectaron duplicados en Salesforce.');
                    await logErrorToSalesforce(conn, 'DUPLICATES_DETECTED', 'Se detectaron duplicados en Salesforce.', error);
                    res.status(200).json({ res: 'Error', message: 'DUPLICATES_DETECTED' });
                    return;
                } else {
                    console.log('Error desconocido:', error);
                    await logErrorToSalesforce(conn, 'UNKNOWN_ERROR', 'Error desconocido al hacer upsert usando LoyaltyForce__External_Id__c', error);
                    res.status(200).json({ res: 'Error', message: 'Error desconocido' });
                    return;
                }
            }
        
        } else if (resultByNif.totalSize !== 0) {
            try{
                response = await conn.sobject("Account").upsert(accountData, 'LoyaltyForce__Nif__c');
                response.id = resultByNif.records[0].Id;
            }catch(error){
                if (error.errorCode === 'DUPLICATES_DETECTED') {
                    console.log('DUPLICATES_DETECTED: Se detectaron duplicados en Salesforce.');
                    await logErrorToSalesforce(conn, 'DUPLICATES_DETECTED', 'Se detectaron duplicados en Salesforce.', error);
                    res.status(200).json({ res: 'Error', message: 'DUPLICATES_DETECTED' });
                    return
                } else {
                    console.log('Error desconocido:', error);
                    await logErrorToSalesforce(conn, 'UNKNOWN_ERROR', 'Error desconocido al hacer upsert usando LoyaltyForce__Nif__c', error);
                    res.status(200).json({ res: 'Error', message: 'Error desconocido' });
                    return
                }    
            }
        
        } else {
            try{
                response = await conn.sobject("Account").create(accountData);
            }catch(error){
                if (error.errorCode === 'DUPLICATES_DETECTED') {
                    console.log('DUPLICATES_DETECTED: Se detectaron duplicados en Salesforce.');
                    await logErrorToSalesforce(conn, 'DUPLICATES_DETECTED', 'Se detectaron duplicados en Salesforce.', error);
                    res.status(200).json({ res: 'Error', message: 'DUPLICATES_DETECTED' });
                    return;
                } else {
                    console.log('Error desconocido:', error);
                    await logErrorToSalesforce(conn, 'UNKNOWN_ERROR', 'Error desconocido al crear cuenta', error);
                    res.status(200).json({ res: 'Error', message: 'Error desconocido' });
                    return;
                }    
            }
        }
        

        if (!response.success) {
            console.log(response);
            await logErrorToSalesforce(conn, 'UPDATE_ERROR', JSON.stringify(response), null);
            res.status(200).json({ res: 'Error' }); // Aquí cambiamos a 20
            return;
        } else {
            if (Array.isArray(contacts)) {  
                for (const contact of contacts) {
                    const additionalInfo = {
                        Odoo_Id__c: isComplete(contact.id),
                        Name__c: isComplete(contact.name),
                        Mobile__c: isComplete(contact.mobile),
                        Email__c: isComplete(contact.email),
                        Nif__c: isComplete(contact.nif),
                        Languaje__c: isComplete(contact.language),
                        Website__c: isComplete(contact.website),
                        Street__c: isComplete(contact.street),
                        City__c: isComplete(contact.city),
                        Cp__c: truncatePostalCode(isComplete(contact.cp)),
                        Account__c: response.id,
                    };
                    await conn.sobject("Additional_Info__c").create(additionalInfo);
                }
            }
            console.log(`Operación exitosa: ${response.id}`);
            res.status(200).json({ res: response.id });
        }
    
    });
}

const updatePartner = async (req, res) => {
    console.log("Nueva llamada entrante - updatePartner");
    console.log("Body: ", req.body);

    const {
        x_SalesforceId, id, name, email, phone, mobile, nif, language, jobposition, website,
        street, city, cp, username: sfUsername, password: sfPassword, clientID: clientId,
        clientSecret, loginUrl,
    } = req.body;

    const nameArray = name.split(' ').map(name => name.trim());
    let FirstName, LastName;

    switch(nameArray.length){
        case 4:
            FirstName = nameArray.slice(0, 2).join(' ');
            LastName = nameArray.slice(2).join(' ');
            break;
        case 3:
            FirstName = nameArray[0];
            LastName = nameArray.slice(1).join(' ');
            break;
        case 2:
            FirstName = nameArray[0];
            LastName = nameArray[1];
            break;
        default:
            FirstName = "";
            LastName = name;
            break;
    }

    // Define isCompany a false por defecto
    let isCompany = false;

    // Verificar si customer_nif comienza con "ES" o "PT" y el siguiente valor es superior a dos
    if (typeof nif === 'string'  && (nif.startsWith('ES') || (nif.startsWith('PT') && parseInt(nif.substring(2)) > 2))) {
        isCompany = true;
      }


    /*if (!x_SalesforceId) {
        newPartner(req, res);
        console.info('Creación iniciada');
        return;
    }*/
    if (!isValidEmail(email)) {
        console.log('INVALID_EMAIL: Email provided is not valid');
        await logErrorToSalesforce(conn, new Error('INVALID_EMAIL'), 'Email provided is not valid');
        res.status(200).json({ res: 'Email provided is not valid' });
        return;
    }

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

        const accountData = {
            //Id: x_SalesforceId,
            Odoo_id__c: isComplete(id),
            FirstName: isComplete(FirstName),
            LastName: isComplete(LastName),
            PersonEmail: isComplete(email),
            Phone: isComplete(phone),
            PersonMobilePhone: isComplete(mobile),
            Website: isComplete(website),
            LoyaltyForce__Nif__c: isComplete(nif),
            ShippingStreet: isComplete(street),
            ShippingCity: isComplete(city),
            ShippingPostalCode: truncatePostalCode(isComplete(cp)),
            LoyaltyForce__Languages__pc: isComplete(language),
            LoyaltyForce__External_Id__c: isComplete(email),
            LoyaltyForce__SourceChannel__pc: "Ecommerce",
            LoyaltyForce__LoyaltyStatus__pc: "InLoyalty",
            LoyaltyForce__LifecycleStage__pc: "Customer account",
            isCompany__c: isCompany,
        };
        console.log("antes upsert");
        try{
            const response = await conn.sobject("Account").upsert(accountData,'LoyaltyForce__External_Id__c');
        }catch(error){
            if (error.errorCode === 'DUPLICATES_DETECTED') {
                console.log('DUPLICATES_DETECTED: Se detectaron duplicados en Salesforce.');
                await logErrorToSalesforce(conn, 'DUPLICATES_DETECTED', 'Se detectaron duplicados en Salesforce.', error);
                res.status(200).json({ res: 'Error', message: 'DUPLICATES_DETECTED' });
                return;
            } else {
                console.log('Error desconocido:', error);
                await logErrorToSalesforce(conn, 'UNKNOWN_ERROR', 'Error desconocido al crear cuenta', error);
                res.status(200).json({ res: 'Error', message: 'Error desconocido' });
                return;
            }    
        }
        console.log("después upsert");

        if (!response.success) {
           
            const errorMessage = "error al actualizar la cuenta.";
            await logErrorToSalesforce(conn, { message: errorMessage, stack: '' }, 'error al actualizar la cuenta.');

            console.log(response);
            await logErrorToSalesforce(conn, new Error('UPDATE_ERROR'), JSON.stringify(response));
            res.status(200).json({ res: 'Error: UPSERT ERROR '});
        } else {
            /*console.log(contacts);
            if (Array.isArray(contacts)) {
                for (const contact of contacts) {
                    const additionalInfo = {
                        Odoo_Id__c: isComplete(contact.id),
                        Name__c: isComplete(contact.name),
                        Mobile__c: isComplete(contact.mobile),
                        Phone__c: isComplete(contact.phone),
                        Email__c: isComplete(contact.email),
                        Nif__c: isComplete(contact.nif),
                        Languaje__c: isComplete(contact.language),
                        JobPosition__c: isComplete(contact.jobposition),
                        Website__c: isComplete(contact.website),
                        Street__c: isComplete(contact.street),
                        City__c: isComplete(contact.city),
                        Cp__c: isComplete(contact.cp),
                        Account__c: response.id,
                    };
                    await conn.sobject("Additional_Info__c").create(additionalInfo);
                }
            }   */
            console.log(`Operación exitosa: ${response.id}`);
            res.status(200).json({ res: response.id });
        }
    });   
}
          
    const truncatePostalCode = (postalCode, maxLength = 20) => {
        if (postalCode && postalCode.length > maxLength) {
        return postalCode.slice(0, maxLength);
        }
        return postalCode;
    };
    const isComplete = (value) => {
         return value && value !== 'false' && value !== '' ? value : '';
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
    
            
module.exports = { newPartner, updatePartner };
