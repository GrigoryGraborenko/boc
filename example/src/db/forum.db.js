/**
 * Created by Grigory on 24/03/2018.
 */

module.exports = function(Sequelize, DataTypes) {
    var model = Sequelize.define('forum', {
        id: {
            type: DataTypes.UUID
            ,defaultValue: DataTypes.UUIDV4
            ,primaryKey: true
        }
        ,name: {
            type: DataTypes.STRING
            ,unique: true
            ,allowNull: false
        }
    }, {
        freezeTableName: true
        ,getterMethods: {
            public: function() {
                var obj = { id: this.id, name: this.name, forum_threads: [] };

                var get_public = function(item) {
                    return item.get("public");
                };
                if(this.forum_threads !== undefined) {
                    obj.forum_threads = this.forum_threads.map(get_public);
                }

                return obj;
            }
        }
    });

    model.associate = function(models) {
        this.hasMany(models.thread, { as: 'forum_threads', foreignKey: { name: "forum_id", allowNull: false } });
    };

    return model;
};