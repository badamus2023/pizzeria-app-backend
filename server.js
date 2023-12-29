import fs from 'node:fs/promises'
import express from "express";
import bodyParser from "body-parser";
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from "url";

const app = express();

dotenv.config();

const PORT = process.env.PORT

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'build')))

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-Requested-With,content-type'
    );
    next();
  });

  app.get('/', async (req,res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  })

  //pizzas

  app.get('/pizzas', async (req,res) => {
    const pizzasContent = await fs.readFile('./data/pizzas.json');
    let pizzas = JSON.parse(pizzasContent);

    res.json({
        pizzas: pizzas.map((pizza) => ({
            id: pizza.id,
            name: pizza.name,
            description: pizza.description,
            price: pizza.price,
        })),
    });
  });


  app.post('/pizzas', async (req,res) => {
    const { pizza } = req.body;

    if(!pizza) {
        return res.status(400).json({message: 'pizza is required'})
    }

    if(
        !pizza.name?.trim() ||
        !pizza.description?.trim() ||
        !pizza.price?.trim()
      ) {
        return res.status(400).json({message: 'Invalid data provided'})
      }

      const pizzasContent = await fs.readFile('./data/pizzas.json');
      const pizzas = JSON.parse(pizzasContent);
      const newId = pizzas.length + 1;

      const newPizza = {
        id: newId,
        ...pizza
      }

      pizzas.push(newPizza);

      await fs.writeFile('./data/pizzas.json', JSON.stringify(pizzas));

      res.json({pizza: newPizza});

      console.log('new pizza added')
  });

  app.delete('/pizzas/:id', async (req,res) => {
    const id = parseInt(req.params.id);
    const pizzasContent = await fs.readFile('./data/pizzas.json');
    const pizzas = JSON.parse(pizzasContent);

    const index = pizzas.findIndex((pizza) => pizza.id === id)

    if(index === -1) {
        return res.status(404).json({message: "Couldnt find a pizza"});
    }

    pizzas.splice(index,1);

    await fs.writeFile('./data/pizzas.json', JSON.stringify(pizzas));

    res.json({message: 'Pizza deleted'});
    console.log('Pizza deleted');
  });
  
  // cart

  let cart = [];
  let lastActivityTime;
  const tempDataDuration = 1800000;

  app.use((req,res,next) => {
    lastActivityTime = new Date();
    next();
  })

  const checkInactivityAndClearCart = () => {
    const currentTime = new Date();
    const elapsedTime = currentTime - lastActivityTime;

    if(elapsedTime >= tempDataDuration) {
      cart=[]
    }
  };

  setInterval(checkInactivityAndClearCart, tempDataDuration)


  app.get('/cart', async (req, res) => {
    res.json({
      cart: cart.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price
      })),
    });

    checkInactivityAndClearCart();
  });

  const clearCart = (req, res) => {
    cart.length = 0;
    lastActivityTime = new Date();
    res.json({ message: 'Cart cleared successfully' });
  };
  
  app.get('/clear-cart', clearCart);

  app.post('/cart/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const quantity = 1;

    const pizzasContent = await fs.readFile('./data/pizzas.json');
    const pizzas = JSON.parse(pizzasContent);

    const product = pizzas.find((product) => product.id === id);
    const cartItem = cart.find((item) => item.id === id);

    if(!product) {
      return res.status(404).json(({message: 'Nie znaleziono produktu'}));
    }
    const fixedPrice = parseFloat(product.price);
    if(cartItem) {
      cartItem.quantity += quantity;
    } else {
      cart.push({
        id: id,
        quantity: quantity,
        name: product.name,
        price: fixedPrice,
      });
    };

    res.json(cart);
  });

  app.delete('/cart/:id', async (req,res) => {
    const id = parseInt(req.params.id);

    const cartItem = cart.find((item) => item.id === id);

    if(cartItem) {
      if(cartItem.quantity > 1) {
        cartItem.quantity -= 1;
      } else {
        cart = cart.filter((item) => item.id !== id);
      }
      checkInactivityAndClearCart();
      res.json(cart);
    } else {
      res.status(404).json({ message: 'Couldnt find a pizza in the cart'});
    }
  })

  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
})