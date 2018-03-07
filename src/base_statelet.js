/**
 * Created by Grigory on 22/02/2017.
 */

function CreateStatelet(name, obj) {

    var m_Api = {};
    m_Api.getName = function () {
        return name;
    };

    m_Api.execute = function(builder, db, route) {

        if(obj.dependencies !== undefined) {
            // loop thru and wait
            return Promise.all(obj.dependencies.map(function(depend) {
                return builder.get(depend);
            })).then(function(args) {
                return obj.process.apply(obj, [builder, db, route].concat(args));
            });
        }

        return obj.process(builder, db, route);
    };

    return m_Api;
}

module.exports = CreateStatelet;