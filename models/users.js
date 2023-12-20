function User(user, pwd){
    this.user = user || null;
    this.pwd = pwd || null;
}

User.prototype.getUser = function(){
    return this.user;
}

module.exports = User;