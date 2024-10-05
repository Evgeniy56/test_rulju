const { Sequelize } = require('sequelize');
const Validator = require("fastest-validator");

const v = new Validator();

const sequelize = new Sequelize(process.env.DATABASE, process.env.LOGIN, process.env.PASWWORD, {
  host: process.env.HOST,
  dialect: process.env.DIALECT,
  port: process.env.PORT,
  logging: false,
});

/**
 * Схема валидации данных
 */
const schema = {
    full_name: { type: "string", min: 3, max: 30, optional: true },
    role: { type: "string", min: 3, max: 40 , optional: true},
    efficiency: { type: "number", positive: true, integer: true ,optional: true,  }, 
    $$strict: "remove",
};

/**
 * Модель таблицы
 */
const User = sequelize.define('User', 
    {
        id : {
            type: Sequelize.INTEGER, 
            autoIncrement: true, 
            primaryKey: true, 
            allowNull: false,
        },
        full_name : {
            type: Sequelize.STRING,
            allowNull: false,
        },
        role : {
            type: Sequelize.STRING,
            allowNull: false,},
        efficiency: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
 
    },
    {
        tableName: 'user',
        timestamps: false,
        raw: true,
    }   
);

/**
 * Добавление новой записи в таблицу
 * @param {object} user - Данные пользователя, должны быть следующие элементы full_name, role, efficiency
 * @returns 
 */
async function create(user) {
    var result = await User.create(user)
        .then((result) => {
            return {id: result.id}
        }).catch((err) => {
            throw new Error(err.errors[0].message);
        });
    return result;
}

/**
 * Список пользователей, в зависимсти от запроса
 * @param {object} date - Параметры фильтра 
 * @returns 
 */
async function get(date = null) {
    
    var result =[]; 
    var users = await User.findAll({
        attributes: [
            'id',
            'full_name', 
            'role', 
            'efficiency'
        ],
        where: date 
    })
    .then((result) => {
        return result;
    }).catch((err) => {
        throw new Error(err.errors[0].message);
    });

    for (const user of users) {
        result.push(user.dataValues);
    }

    return {users: result};
}

/**
 * Изменение данных в таблицу
 * @param {INTEGER} id - Идентификатор пользователя, обязательный параметр
 * @param {Object} date - Данные которые требуется изменить в таблице. должен быть хотябы один из параметров full_name, role, efficiency
 * @returns 
 */
async function update(id, date) {
    await User.update(
        date, 
        {
            where: {id: id}
        }
    ).catch((err) => {
        throw new Error(err.errors[0].message);
    });

    const result = await User.findOne({
        where: {id: id}
    });

    return result === null ? {} : result.dataValues;
}

/**
 * Удаление одной записи или все сразу
 * @param {INTEGER} id - Номер удаляемой записи, если значение не указано или равно 0, удаляются все записи
 * @returns 
 */
async function del(id = 0) {

    if (id == 0 ) {
        await User.destroy({
            truncate: true,
          });
        return null;

    } else {
        var result = await User.findOne({
            where:{
                id: id
            }
        });

        await User.destroy({
            where: {
                id: id
            }
        });

        return result === null ? {} : result.dataValues;
    }
}

/**
 * Подготовка ответа на запрос
 * @param {Object} date - Результат выполения запроса
 * @param {Boolean} status - Статус ответа
 * @returns 
 */
async function response(data = null, status = true){
    var result = new Object();
    result.success= status;
    if (data) {
        result.result = data;
    }
    return JSON.stringify(result);
}

/**
 * Обрабатываем входящий запрос и прооброзовываем в нужный формат.
 * @param {Object} context - Данные в запросе 
 * @returns 
 */
async function routers(context) {

    try{
        var body = JSON.parse(context._data.body);
    } catch {
        var body = {};
    }    

    return {
        method: context._data.httpMethod,
        path: context._data.path,
        id: context._data.params.user_id ? context._data.params.user_id : null,
        params: context._data.queryStringParameters ? context._data.queryStringParameters : {},
        body: body,
    }
}


module.exports.handler = async function (event, context) {
    var result = new Object();
    
    try {
        await sequelize.authenticate();

        const route = await routers(context);

        var checkResult = await v.validate(route.body, schema)
        if ( checkResult != true & (route.path == "/create" | route.path == "/update/{user_id}")) 
            throw new Error(checkResult[0].message);

        if (route.method == "POST" & route.path == "/create") {
            result = await create(route.body);
        } else if (route.method == "GET" & route.path == "/get") {
            result = await get(route.params);
        } else if (route.method == "GET" & route.path == "/get/{user_id}") {
            result = await get(Object.assign({id: route.id},route.params));
        } else  if (route.method== "PATCH" & route.path == "/update/{user_id}") {
            result = await update(route.id, route.body); 
        } else  if (route.method== "DELETE" &  route.path == "/delete/{user_id}") {
            result = await del(route.id); 
        } else if (route.method== "DELETE" & route.path == "/delete"){
            result = await del(); 
        } else {
            throw new Error("No find");
        }

        return {
            'statusCode': 200,
            'body': await response(result),
            'headers': {
                'Content-Type': 'application/json',
            },
            'isBase64Encoded': false,
        }

    } catch (error) {
        return {
            'statusCode': 500,
            'body': await response({error : error.message}, false),
            'headers': {
                'Content-Type': 'application/json',
            },
            'isBase64Encoded': false,
        };
    };
}