//Todo implementar un modelo de datos real, bbdd
const usersDB = {
    users: require('../models/users'),
    setUsers: function(data) { this.users = data}
}

const bcrypt = require('bcryptjs');

const handleLogin = async (req, res) => {
    const { user, pwd } = req.body;
    if(!user || !pwd) return res.status(400).json({'message' : 'Se require usuario y password'});
    console.log('Entro en handle ')
    const foundUser = usersDB.users.find(person => person.username ===user);
    if(!foundUser) return res.sendStatus(401); //Unauthorized
    // evaluar password

    const match = await bcrypt.compare(pwd, foundUser.password);

    if(match){
        //Crear JWT token
        res.json({'success' : `User ${user} logeado correctamente`});
    }else{
        res.sendStatus(401);
    }
}

module.exports = {handleLogin}