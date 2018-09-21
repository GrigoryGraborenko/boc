/**
 * Created by Grigory on 24/03/2018.
 */

module.exports = function(Sequelize, DataTypes) {
    var model = Sequelize.define('post', {
        id: {
            type: DataTypes.UUID
            ,defaultValue: DataTypes.UUIDV4
            ,primaryKey: true
        }
        ,text: {
            type: DataTypes.STRING
            ,allowNull: false
        }
        ,seconds: {
            type: DataTypes.FLOAT
            ,allowNull: false
        }
    }, {
        freezeTableName: true
        ,getterMethods: {
            public: function() {
                var obj = { id: this.id, text: this.text, seconds: this.seconds, thread_id: this.thread_id };
                return obj;
            }
        }
    });

    model.associate = function(models) {
        this.belongsTo(models.user, { as: 'user', foreignKey: { name: "user_id", allowNull: false }});
        this.belongsTo(models.thread, { as: 'thread', foreignKey: { name: "thread_id", allowNull: false }});
    };

    return model;
};