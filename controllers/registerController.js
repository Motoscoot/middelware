
/*const { Prohairesis } = require('prohairesis');
const env = require('./env');
// create new database instance//
const database = new Prohairesis(env.JAWS_DATABASE_URL);
const usersDB = {
    users: require('../models/users'),
    setUsers: function(data) {
         //this.users = data
        database
            .query(`
                INSERT INTO auth (
                    user,
                    password,
                    key
                ) VALUES (
                    ${data.username},
                    ${data.password}
                )`
            ).then((res) => {
                console.log(res);
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() => {
                database.close();
            });
                
        }
}
const fsPromise = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const handlerNewUser = async (req, res) => {
    const { user, pwd } = req.body;
    if(!user || !pwd) return res.status(400).json({'message' : 'Se require usuario y password'});
    //comprobar usuarios duplicados
    const duplicate = usersDB.users.find(person => person.username === user);
    if(duplicate) return res.sendStatus(409); //Conflicto
    console.log('accedo al registro ');
    try{
        //encriptar la password
        const hashedPWd = await bcrypt.hash(pwd, 10);
        //store nuevo usuario
        const newUser = {"username" : user, "password" : hashedPWd};
        usersDB.setUsers([...usersDB.users, newUser]);

        res.status(201).json({'success' : `New User ${user} created`});
    }catch(err){
        res.status(500).json({'message' : err.message});
    }
}

*/
module.exports = {handlerNewUser};