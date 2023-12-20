const axios = require('axios');
const xml2js = require('xml2js');
const jsforce = require('jsforce');
const he = require('he');

// Función para procesar el XML y extraer los datos necesarios
const processData = (xml) => {
    const parser = new xml2js.Parser();
    let data = [];

    parser.parseString(xml, (err, result) => {
        if (err) {
            throw err;
        }
        console.log('Se lanza el parseString');
        //console.log('result corresponde a ' + JSON.stringify(result));
        // Comprobar si 'channel' y 'item' existen en el objeto result
        if(result['rss'] && result['rss']['channel'] && result['rss']['channel'][0]['item']){
            const products = result['rss']['channel'][0]['item'];
            console.log('Obtengo producto');
            for (let product of products) {
                let description = product['description'] ? product['description'][0] : null;
                if (description && description.length > 225) {
                    description = description.substring(0, 225) + "[...]";
                }
                data.push({
                    id: product['g:id'] ? product['g:id'][0] : null,
                    description: he.decode(description),
                    image_url: product['g:image_link'] ? product['g:image_link'][0] : null,
                    link: product['link'] ? product['link'] : null,
                });
            }            
        } else {
            console.error("XML no tiene la estructura esperada. No se encontraron 'channel' o 'item'.");
        }
    });

    return data;
};


const downloadAndProcessXmlData = async (req, res) => {
    const { username, password } = req.body;
    
    let i = 1;
    let response;
    const conn = new jsforce.Connection();

    await conn.login(username, password);

    do {
        try {
            console.log(`URL DE DESCARGA : https://www.motoscoot.net/amfeed/main/get/file/google${i}`);
            response = await axios.get(`https://www.motoscoot.net/amfeed/main/get/file/google${i}`);
            const xml = response.data;
            
            const data = processData(xml);
            if(data != null) {
                console.log('Data es diferente de null');
            }
            for (let item of data) {
                const product = await conn.sobject('LoyaltyForce__Product__c').findOne({ LoyaltyForce__ProductCode__c: item.id });

                if (product) {
                    console.log('Producto localizado ' + product);
                    await conn.sobject('LoyaltyForce__Product__c').update({
                        Id: product.Id,
                        LoyaltyForce__ProductDescription__c: item.description,
                        LoyaltyForce__ImageURL__c: item.image_url,
                        LoyaltyForce__ProductURL_del__c: item.link,
                        magento_sync__c: true
                    });
                }
            }

            i++;
        } catch (err) {
            if (err.response && err.response.status >= 400) {
                break;
            } else {
                throw err;
            }
        }
    } while (true);

    res.status(200).send({ message: 'Data processed successfully' });
}

module.exports = {
    downloadAndProcessXmlData
};
