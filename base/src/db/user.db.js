
const crypto = require('crypto');
const util = require('util');

const pbkdf2_ASYNC = util.promisify(crypto.pbkdf2);
const randomBytes_ASYNC = util.promisify(crypto.randomBytes);

module.exports = function(Sequelize, DataTypes) {
    var model = Sequelize.define('user', {
        id: {
            type: DataTypes.UUID
            ,defaultValue: DataTypes.UUIDV4
            ,primaryKey: true
        }
        ,email: {
            type: DataTypes.STRING
            ,unique: true
            ,allowNull: false
        }
        ,role: {
            type: DataTypes.ENUM('user', 'admin', 'super_admin', 'disabled')
            ,defaultValue: 'user'
            ,allowNull: false
        }
        ,password: {
            type: DataTypes.STRING(1024)
            ,allowNull: true
        }
        ,salt: {
            type: DataTypes.STRING(512)
            ,allowNull: true
        }
        ,session: {
            type: DataTypes.STRING(512)
            ,allowNull: true
        }
        ,session_valid_until: {
            type: DataTypes.DATE
            ,allowNull: true
        }
        // ,given_names: {
        //     type: DataTypes.STRING
        // }
        // ,last_name: {
        //     type: DataTypes.STRING
        // }
        ,json: {
            type: DataTypes.JSONB
            ,allowNull: true
        }
    }, {
        freezeTableName: true
        ,tableName: "user_record"
        ,getterMethods: {
            public: function() {
                var obj = { id: this.id };
                return obj;
            }
            ,selfPublic: function() {
                var obj = { id: this.id, email: this.email, role: this.role, json: this.json };
                return obj;
            }
        }
    });

    model.associate = function(models) {

    };
    model.testPasswordSync = function(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, 512, 'sha512').toString("hex");
    };
    model.genPasswordSync = function(password) {
        var salt = crypto.randomBytes(256);
        var salt_str = salt.toString("hex");
        var key = this.testPasswordSync(password, salt_str);
        return { password: key, salt: salt_str };
    };
    model.testPassword = async function(password, salt) {
        return (await pbkdf2_ASYNC(password, salt, 100000, 512, 'sha512')).toString("hex");
    };
    model.genPassword = async function(password) {
        var salt = await randomBytes_ASYNC(256);
        var salt_str = salt.toString("hex");
        var key = await this.testPassword(password, salt_str);
        return { password: key, salt: salt_str };
    };

    return model;
};