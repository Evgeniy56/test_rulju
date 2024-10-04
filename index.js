const { Sequelize } = require('sequelize');
const Validator = require("fastest-validator");

const v = new Validator();

const sequelize = new Sequelize(process.env.DATABASE, process.env.LOGIN, process.env.PASWWORD, {
  host: process.env.HOST,
  dialect: process.env.DIALECT,
  port: process.env.PORT,
  logging: false,
});

const context = {
    _data:{
        httpMethod: "POST",
        path: "/create",
        queryStringParameters: {},
        body: JSON.stringify({
            full_name: "Some new", 
            role: "admin",  
            efficiency: 100
        }),
    }
};

/**
 * Схема валидации данных
 */
const schema = {
    id: { type: "number", positive: true, integer: true , optional: true},
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
            throw new Error(err.errors[0]);
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
        throw new Error(err.errors[0]);
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
        throw new Error(err.errors[0]);
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
    const getStr = context._data.path.match(/\/(create|get|update|delete)\/?[0-9]{0,}\/?$/iu);
      
    if (getStr) {
        getArr = getStr[0].split('\/');
        var func = getArr[1];
        if (getArr[2]) {
            context._data.queryStringParameters.id = getArr[2];
        }
    }

    return {
        method : context._data.httpMethod,
        func : func,
        data: {
            params: context._data.queryStringParameters,
            body: JSON.parse(context._data.body),
        }
    }
}


async function main(context) {
    var result = new Object();
    
    try {
        await sequelize.authenticate();

        const route = await routers(context);

        var checkResult = await v.validate(route.data.params, schema);
        if (checkResult != true) {
            throw new Error(checkResult[0].message);
        } 
        checkResult = await v.validate(route.data.body, schema);
        if (checkResult != true) {
            throw new Error(checkResult[0].message);
        } 

        if (route.method == "POST" & route.func == "create") {
            result = await create(route.data.body);
        } else if (route.method == "GET" && route.func == "get") {
            result = await get(route.data.params);
        } else  if (route.method== "PATCH" & route.func == "update") {
            result = await update(route.data.params.id, route.data.body); 
        } else  if (route.method== "DELETE" & route.func == "delete") {
            result = await del(route.data.params.id); 
        } else {
            throw new Error("No find");
        }

        console.log(await response(result));
        return await response(result);

    } catch (error) {
        console.error(await response({error : error.message}, false));
        return await response({error : error.message}, false);
    } finally {
        sequelize.close();
    };
}

main(context);

