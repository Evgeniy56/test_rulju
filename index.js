const { Sequelize, Model } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE, process.env.USER, process.env.PASWWORD, {
  host: process.env.HOST,
  dialect: process.env.DIALECT,
  port: process.env.PORT,
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
    }   
);

/**
 * Добавление новой записи в таблицу
 * @param {object} user - Данные пользователя, должны быть следующие элементы full_name, role, efficiency
 * @returns 
 */
async function create(user) {

    return await User.create(user);
}

/**
 * Список пользователей, в зависимсти от запроса
 * @param {object} date - Параметры фильтра 
 * @returns 
 */
async function get(date = null) {
    
    return await User.findAll({
        attributes: [
            'id',
            'full_name', 
            'role', 
            'efficiency'
        ],
        where: date 
    });
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
            where: {
                id: id
            }
        }
    );

    return await User.findOne({
        where: {
            id: id
        }
    });

}

/**
 * Удаление одной записи или все сразу
 * @param {INTEGER} id - Номер удаляемой записи, если значение не указано или равно 0, удаляются все записи
 * @returns 
 */
async function del(id = 0) {

    if (id == 0 ) {
        return await User.destroy({
            truncate: true,
          });

    } else {
        var user = await User.findOne({
            where:{
               id: id
            }
        });

        await User.destroy({
            where: {
                id: id
            }
        });

        return user;
    }

}


async function main() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    
       
        // const userID = await create({full_name: "Som Semi", efficiency: 90 });
        // console.log(userID.id);

        // console.log(await get());

        // const user = await update(42,{role:'admin'})
        // console.log(user.dataValues);

        const user = await del();
        console.log( user === null ? user : user.dataValues);

        sequelize.close();
    } catch (error) {
        console.error('Error message:', error.message);
      }

}

console.log(User === sequelize.models.User);
main();

