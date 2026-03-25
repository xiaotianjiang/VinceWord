const fetch = require('node-fetch');

const token = '*****************************************************************************************************************************************************************************************************************************************************************************';
const menuId = '8db62f13-7264-456e-b847-4e775fcc916a';

const testEditMenu = async () => {
  try {
    const response = await fetch(`http://localhost:3000/api/admin/menu/${menuId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: '测试菜单',
        path: '/test',
        icon: '',
        parent_id: null,
        sort: 0,
        status: 'active',
        access_level: 'use'
      })
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testEditMenu();
