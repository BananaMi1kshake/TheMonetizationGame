// staff.js
// Defines the data for different staff departments, shared across multiple scripts.
const staffData = {
    sales: {
        name: 'Sales',
        cost: 5,
        costMultiplier: 3.5,
        members: ['Artyom', 'Alan', 'Aruna', 'Dora', 'Syrym', 'Aidos', 'Alimzhan', 'Anna', 'Bolat', 'Yerbol', 'Madi'],
    },
    accounts: {
        name: 'Accounts',
        cost: 5,
        costMultiplier: 3.5,
        members: ['Azret', 'Asiya', 'Daniil', 'Aizhan', 'Amir', 'Akzhan', 'Anuar', 'Hakim', 'Saniya', 'Sanzhar'],
    },
    products: {
        name: 'Products',
        cost: 100,
        costMultiplier: 1, // No multiplier for single member
        members: ['Emil'],
    }
};
