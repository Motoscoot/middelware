const provincias = {
    "Alacant (Alicante)": "420",
    "Albacete": "419",
    "Almería": "421",
    "Ávila": "423",
    "Barcelona": "426",
    "Badajoz": "424",
    "Bizkaia (Vizcaya)": "466",
    "Burgos": "427",
    "A Coruña (La Coruña)": "417",
    "Cádiz": "429",
    "Cáceres": "428",
    "Ceuta": "432",
    "Córdoba": "434",
    "Ciudad Real": "433",
    "Castelló (Castellón)": "431",
    "Cuenca": "435",
    "Las Palmas": "444",
    "Girona (Gerona)": "436",
    "Granada": "437",
    "Guadalajara": "438",
    "Huelva": "440",
    "Huesca": "441",
    "Jaén": "442",
    "Lleida (Lérida)": "446",
    "León": "445",
    "La Rioja": "443",
    "Lugo": "447",
    "Madrid": "448",
    "Málaga": "449",
    "Melilla": "450",
    "Murcia": "451",
    "Navarra (Nafarroa)": "452",
    "Asturias": "422",
    "Ourense (Orense)": "453",
    "Palencia": "454",
    "Illes Balears (Islas Baleares)": "425",
    "Pontevedra": "455",
    "Cantabria": "430",
    "Salamanca": "456",
    "Sevilla": "459",
    "Segovia":"458",	
    "Soria":"460",	
    "Gipuzkoa":"439",	
    "Tarragona":"461",	
    "Teruel":"462",	
    "Santa Cruz de Tenerife":"457",	
    "Toledo":"463",	
    "Valencia":"464",	
    "Valladolid":"465",	
    "Araba/Álava":"418",	
    "Zaragoza":"468",	
    "Zamora":"467"
  };
  
  // El método que, dado el nombre de una provincia, retorna su código de provincia
  function obtenerCodigoProvincia(nombreProvincia) {
    // Si el nombre de la provincia se encuentra en el objeto de equivalencias, retornamos su código de provincia
    if (provincias.hasOwnProperty(nombreProvincia)) {
      return parseInt(provincias[nombreProvincia]);
    }
    // Si no se encuentra el nombre de la provincia en el objeto de equivalencias, retornamos null
    return 426;
  }

  exports.obtenerCodigoProvincia = obtenerCodigoProvincia;