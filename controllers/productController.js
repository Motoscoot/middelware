const jsforce = require("jsforce");

const findCategoryById = async (conn, categoryId) => {
  const queryCategory = `SELECT Id FROM LoyaltyForce__Category__c WHERE LoyaltyForce__CategoryId__c = '${categoryId}'`;
  const resultCategory = await conn.query(queryCategory);

  if (resultCategory.totalSize !== 0) {
    return resultCategory.records[0].Id;
  }

  // Devuelve la categoría con externalid 1 si no se encuentra la categoría especificada.
  const fallbackCategoryQuery = `SELECT Id FROM LoyaltyForce__Category__c WHERE LoyaltyForce__CategoryId__c = '1'`;
  const fallbackCategoryResult = await conn.query(fallbackCategoryQuery);
  if (fallbackCategoryResult.totalSize !== 0) {
    return fallbackCategoryResult.records[0].Id;
  }
  return null;
};


const createCategoryIfNotExists = async (conn, categoryId) => {
  const queryCategory = `SELECT Id FROM LoyaltyForce__Category__c WHERE Id = '${categoryId}'`;

  const resultCategory = await conn.query(queryCategory);

  if (resultCategory.totalSize === 0) {
    const categoryData = {
      LoyaltyForce__CategoryId__c: categoryId,
      LoyaltyForce__CategoryCode__c: categoryId,
      Name: "Categoria pendiente de nombrar",
    };

    await conn.sobject("LoyaltyForce__Category__c").create(categoryData);
  }
};

const handleMalformedIdError = async (conn, productData, error) => {
  const malformedIdRegex = /MALFORMED_ID:.*?LoyaltyForce__CategoryCode1__c/;
  const categoryCode1Id = productData.LoyaltyForce__CategoryCode1__c;

  if (error.message.match(malformedIdRegex)) {
    if (categoryCode1Id) {
      await createCategoryIfNotExists(conn, categoryCode1Id);
      return await conn.sobject("LoyaltyForce__Product__c").create(productData);
    }
  }

  return null;
};

const newProduct = async (req, res) => {
  console.log("Nueva llamada entrante - newProductController");
  const {
    name,
    id,
    description,
    extra_code,
    price,
    standard_price,
    default_code,
    categ_id,
    magentoId,
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
    console.log("antes");
    console.log("default_code" + default_code);
    console.log("extra_code" + extra_code);
    console.log("id" + id);
    const queryByCode = `SELECT Id FROM LoyaltyForce__Product__c WHERE LoyaltyForce__ProductCode__c = '${extra_code}'`;

    const resultByCode = await conn.query(queryByCode);

    const sfCategoryId = await findCategoryById(conn, categ_id);

    if (!sfCategoryId) {
      await logErrorToSalesforce(conn, 'GET ERROR', JSON.stringify(res), null);
      res.status(201).json({ res: 'Error: Category not found. '});
      return;
    }

    const productData = {
      LoyaltyForce__ProductCode__c: isComplete(extra_code),
      Odoo_id__c: isComplete(id),
      magento_code__c: isComplete(magentoId),
      Name: isCompleteProduct(name),
      LoyaltyForce__ProductDescription__c: isComplete(description),
      LoyaltyForce__SKU__c: isComplete(default_code),
      LoyaltyForce__StandardPriceEur__c: isComplete(standard_price),
      LoyaltyForce__CategoryCode1__c: sfCategoryId,
    };

    let response = {};

    if (resultByCode.totalSize !== 0) {
      console.log("upsert");
      response = await conn
        .sobject("LoyaltyForce__Product__c")
        .upsert(productData, "LoyaltyForce__ProductCode__c");
        response.id = resultByCode.records[0].Id;  // Corrección aquí: cambiar 'resultByEmail' por 'resultByCode'
      } else {
        console.log("create");
      try {
        response = await conn
          .sobject("LoyaltyForce__Product__c")
          .create(productData);
      } catch (error) {
        response = await handleMalformedIdError(conn, productData, error);
        if (!response) {
          throw error;
        }
      }
    }
    if (!response.success) {
      console.log(response);
      await logErrorToSalesforce(conn, 'INSERT ERROR', JSON.stringify(res), null);
      res.status(201).json({ res: 'Error: Category not found. '});
    } else {
      console.log(`Operación exitosa: ${response.id}`);
      res.status(200).json({ res: response.id });
    }
  });
};

const updateProduct = async (req, res) => {
  const {
    x_SalesforceId,
    name,
    id,
    description,
    list_price,
    price,
    standard_price,
    default_code,
    type,
    categ_id,
    uom_id,
    magentoId,
    username: sfUsername,
    password: sfPassword,
    clientID: clientId,
    clientSecret,
    loginUrl,
  } = req.body;
  if (!x_SalesforceId) {
    newProduct(req, res);
    console.info("Creación iniciada");
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
    const sfCategoryId = await findCategoryById(conn, categ_id);

    if (!sfCategoryId) {
      console.log(response);
      await logErrorToSalesforce(conn, 'GET ERROR', JSON.stringify(res), null);
      res.status(201).json({ res: 'Error: Category not found. '});
      return;
    }

    const productData = {
      Id: x_SalesforceId,
      LoyaltyForce__ProductCode__c: isComplete(extra_code),
      Odoo_id__c: isComplete(id),
      magento_code__c: isComplete(magentoId),
      Name: isCompleteProduct(name),
      LoyaltyForce__ProductDescription__c: isComplete(description),
      LoyaltyForce__SKU__c: isComplete(default_code),
      //o lst_price
      LoyaltyForce__StandardPriceEur__c: isComplete(standard_price),
      LoyaltyForce__CategoryCode1__c: sfCategoryId,
    };

    const response = await conn
    .sobject("LoyaltyForce__Product__c")
    .upsert(productData, 'Id');
  

    if (!response.success) {
      console.log(response);
      await logErrorToSalesforce(conn, 'UPSERT ERROR', JSON.stringify(res), null);
      res.status(201).json({ res: 'Error: UPSERT ERROR '});
    } else {
      console.log(`Operación exitosa: ${response.id}`);
      res.status(200).json({ res: response.id });
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
    Name: 'Error in newPurchaseOrder method',
    Error_Message__c: error.message,
    Error_Stack__c: error.stack,
    Additional_Information__c: additionalInfo
  };
}

const isComplete = (value) => {
  return value && value !== "false" && value !== "" ? value : "";
};

module.exports = { newProduct, updateProduct };
