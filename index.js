const { Sequelize, Model } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE, process.env.LOGIN, process.env.PASWWORD, {
  host: process.env.HOST,
  dialect: process.env.DIALECT,
  port: process.env.PORT,
  poll:{
    max:10,// максимальное кол-во попыток
    min:0,// минимальное кол-во попыток
    idle:20000, // максимальное время ожидания в миллисекундах
    acquire: 20000, // максимальное время ожидания в миллисекундах
    evict: 20000, // максимальное время ожидания в миллисекундах

  }
});

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


async function response(data = null, status = true){
    var result = new Object();
    result.success= status;
    if (data) {
        result.result = data;
    }
    return JSON.stringify(result);
}

async function main() {
    try {
        await sequelize.authenticate();
       
        const result = await create({full_name: "Some Sumi", role: "some_role",  efficiency: 99 });
        // const result = await get();
        // const result = await update(2,{sdfa:"sdfa"});
        // const result = await del(4);
        
        console.log(await response(result));
        return await response(result);

    } catch (error) {
        console.error(await response({error : error.message}, false));
        return await response({error : error.message}, false);
    } finally {
        sequelize.close();
    };

}

main();

