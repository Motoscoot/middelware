const express = require('express');


class App {
    constructor(){
        this.app = express();
        this.app.use(require('body-parser').json());
        this.routes();

        this.app.listen(process.env.PORT || 3001, function(){
            console.log('escuchando puerto ' + process.env.PORT);
        });
    }
        routes(){
            this.app.use(require('./routes/entrypointSF'));
            this.app.use(require('./routes/entrypointOdoo'));
            this.app.use(require('./routes/auth'));
        }

}

new App();