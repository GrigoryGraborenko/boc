/**
 * Created by Grigory on 24/03/2018.
 */

module.exports = function(Sequelize, DataTypes) {
    var model = Sequelize.define('thread', {
        id: {
            type: DataTypes.UUID
            ,defaultValue: DataTypes.UUIDV4
            ,primaryKey: true
        }
        ,topic: {
            type: DataTypes.STRING
            ,allowNull: false
        }
    }, {
        freezeTableName: true
        ,getterMethods: {
            public: function() {
                var obj = { id: this.id, topic: this.topic, forum_id: this.forum_id, thread_posts: [] };

                var get_public = function(item) {
                    return item.get("public");
                };
                if(this.thread_posts !== undefined) {
                    obj.thread_posts = this.thread_posts.map(get_public);
                }

                return obj;
            }
        }
    });

    model.associate = function(models) {
        this.belongsTo(models.forum, { as: 'forum', foreignKey: { name: "forum_id", allowNull: false }});
        this.hasMany(models.post, { as: 'thread_posts', foreignKey: { name: "thread_id", allowNull: false } });
    };

    return model;
};