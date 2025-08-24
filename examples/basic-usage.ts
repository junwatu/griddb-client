/**
 * Basic Usage Example for GridDB Client Library
 */

import { GridDB, IdGeneratorFactory } from '../src';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Initialize GridDB client
  const griddb = new GridDB({
    griddbWebApiUrl: process.env.GRIDDB_WEBAPI_URL || 'http://localhost:8080/griddb/v2',
    username: process.env.GRIDDB_USERNAME || 'admin',
    password: process.env.GRIDDB_PASSWORD || 'admin'
  });

  try {
    // 1. Create a container
    console.log('Creating container...');
    await griddb.createContainer({
      containerName: 'products',
      columns: [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'STRING' },
        { name: 'description', type: 'STRING' },
        { name: 'price', type: 'DOUBLE' },
        { name: 'stock', type: 'INTEGER' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ],
      ifNotExists: true
    });
    console.log('✓ Container created');

    // 2. Insert sample data
    console.log('\nInserting data...');
    const products = [
      {
        id: IdGeneratorFactory.random(1, 1000),
        name: 'Laptop',
        description: 'High-performance laptop',
        price: 999.99,
        stock: 50,
        created_at: new Date()
      },
      {
        id: IdGeneratorFactory.random(1001, 2000),
        name: 'Mouse',
        description: 'Wireless mouse',
        price: 29.99,
        stock: 200,
        created_at: new Date()
      },
      {
        id: IdGeneratorFactory.random(2001, 3000),
        name: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 89.99,
        stock: 75,
        created_at: new Date()
      }
    ];

    await griddb.insert({
      containerName: 'products',
      data: products
    });
    console.log(`✓ Inserted ${products.length} products`);

    // 3. Query all products
    console.log('\nQuerying all products...');
    const allProducts = await griddb.select({
      containerName: 'products'
    });
    console.log('All products:', allProducts);

    // 4. Query with conditions
    console.log('\nQuerying products with price < 100...');
    const affordableProducts = await griddb.select({
      containerName: 'products',
      where: 'price < ?',
      bindings: [100],
      orderBy: 'price',
      order: 'ASC'
    });
    console.log('Affordable products:', affordableProducts);

    // 5. Update a product
    console.log('\nUpdating product stock...');
    if (allProducts.length > 0) {
      const firstProduct = allProducts[0];
      await griddb.update({
        containerName: 'products',
        data: { ...firstProduct, stock: firstProduct.stock - 10 },
        where: 'id = ?',
        bindings: [firstProduct.id]
      });
      console.log('✓ Product updated');
    }

    // 6. Count products
    console.log('\nCounting products...');
    const count = await griddb.count('products');
    console.log(`Total products: ${count}`);

    // 7. Check if specific product exists
    console.log('\nChecking if laptop exists...');
    const exists = await griddb.exists('products', 'name = ?', ['Laptop']);
    console.log(`Laptop exists: ${exists}`);

    // 8. Execute raw SQL
    console.log('\nExecuting raw SQL...');
    const sqlResult = await griddb.executeSql(
      'SELECT name, price FROM products WHERE stock > ? ORDER BY price DESC',
      [50]
    );
    console.log('SQL Result:', sqlResult.results);

    // 9. Get container schema
    console.log('\nGetting container schema...');
    const schema = await griddb.getSchema('products');
    console.log('Container schema:', JSON.stringify(schema, null, 2));

    // 10. List all containers
    console.log('\nListing all containers...');
    const containers = await griddb.listContainers();
    console.log('Containers:', containers);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main().catch(console.error);
