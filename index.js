const port = process.env.PORT || 4000;
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://ks973111:ks80308030@cluster0.l7ct9.mongodb.net/e-commerce";
const jwtSecret = process.env.JWT_SECRET || "secret_ecom";

// Set NODE_ENV for production
if (process.env.PORT) {
  process.env.NODE_ENV = 'production';
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { count } = require("console");

app.use(express.json());
// Allowing Cross Origin Resource Sharing for Admin and Frontend
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://web-production-52db.up.railway.app'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true // Allow credentials (if needed)
};

app.use(cors(corsOptions));

// Database Connection with MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000, // Increase timeout to 60 seconds
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1); // Exit if cannot connect to database
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

// Add this function after the mongoose connection setup
// Helper function to transform image URLs
function transformImageUrls(data, req) {
  if (!data) return data;
  
  // If in production, ensure HTTPS URLs
  const isProduction = process.env.NODE_ENV === 'production';
  const host = req ? req.get('host') : '';
  const baseUrl = isProduction ? `https://${host}` : '';
  
  // Function to transform a single item
  const transformItem = (item) => {
    if (item.image) {
      // Check if the image URL is a full URL or a relative path
      if (item.image.startsWith('http://')) {
        // Replace http:// with https:// in production
        item.image = isProduction ? item.image.replace('http://', 'https://') : item.image;
      } else if (item.image.startsWith('https://')) {
        // Already a full HTTPS URL, leave it as is
        return item;
      } else {
        // For relative paths, add the full base URL in production
        if (isProduction) {
          // If path starts with a slash, remove it to avoid double slashes
          const imagePath = item.image.startsWith('/') ? item.image.substring(1) : item.image;
          item.image = `${baseUrl}/${imagePath}`;
        } else if (!item.image.startsWith('/')) {
          // In development, just ensure it starts with a slash
          item.image = `/${item.image}`;
        }
      }
    }
    return item;
  };
  
  // Handle both arrays and single objects
  if (Array.isArray(data)) {
    return data.map(item => transformItem({...item._doc || item}));
  }
  
  return transformItem({...data._doc || data});
}

// API Creation

app.get("/", (req, res)=>{
  res.send("Express App is Running")
})

// Image Storage Engine

const storage = multer.diskStorage({
  destination: './uploads/images',
  filename: (req, file, cb)=>{
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  }
})

const upload = multer({storage: storage})

// Creating Upload Endpoint for images
app.use('/images', (req, res, next) => {
  // Add CORS headers specifically for images
  res.header('Access-Control-Allow-Origin', '*'); // Allow from any origin
  res.header('Cache-Control', 'max-age=86400'); // Cache for 1 day
  next();
}, express.static(path.join(__dirname, 'uploads/images'), {
  maxAge: '1d', // Set cache for 1 day
  etag: true,
  lastModified: true
}));

app.post("/images", upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image upload failed. No file was provided.",
    });
  }

  // Use absolute URL with HTTPS when in production, otherwise use relative URL
  const baseUrl = process.env.NODE_ENV === 'production'
    ? `https://${req.get('host')}`
    : '';
  
  // Ensure the path is correct for images
  const imagePath = `images/${req.file.filename}`;
  
  res.status(201).json({
    success: true,
    image_url: baseUrl ? `${baseUrl}/${imagePath}` : `/${imagePath}`
  });
});


// Schema for Creating Products
const Product = mongoose.model("Product", {
  name:{
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
})

// Helper function to validate and convert id
function validateAndConvertId(id, res) {
  // Validate the format of the id
  if (!ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid product ID format",
    });
    return null; // Return null if invalid
  }

  // Convert to ObjectId and return
  return ObjectId.createFromHexString(id);
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing",
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing",
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
}


//Create a new product
app.post('/products', async (req, res) => {
  try {
    const { name, image, category, new_price, old_price } = req.body;

    // Create and Save New Product (ID automatically handled by MongoDB)
    const product = new Product({
      name,
      image,
      category,
      new_price,
      old_price,
    });

    console.log(product);
    await product.save();
    console.log("Saved");

    // Return the Created Product with a 201 Created Status
    return res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete a product
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) {
      console.log(`Invalid ID format provided: ${id}`);
      return; // Exiting here if objectId is null
    }

    const deletedProduct = await Product.findByIdAndDelete(objectId);

    if (!deletedProduct) {
      console.log(`Product not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(`Product with ID ${id} deleted successfully.`);
    // Return the deleted product
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      deletedProduct,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the product. Please try again later.",
    });
  }
});


// Get all products with filtering, sorting, and pagination options
app.get('/products', async (req, res) => {
  try {
    const { category, limit = 10, sort = '' } = req.query;

    // Initialize filter options
    let filterOptions = {};

    // Add filtering by category if specified
    if (category) {
      filterOptions.category = category;
    }

    // Sort options
    let sortOptions = {};
    if (sort === 'latest') {
      sortOptions = { createdAt: -1 }; // Sort by `createdAt` field in descending order for latest products
    }

    // Fetch products from the database with optional filtering, sorting, and limiting
    const products = await Product.find(filterOptions).sort(sortOptions).limit(limit);

    // Transform product data to fix image URLs
    const transformedProducts = transformImageUrls(products, req);

    // Return the products
    return res.status(200).json({
      success: true,
      count: transformedProducts.length,
      products: transformedProducts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Read a product
app.get('/products/:id', async (req, res) => {
  try {
    const {id} = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) return; // Exiting here if objectId is null

    const product = await Product.findById(objectId);

    // If product not found, return 404
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Transform product data to fix image URLs
    const transformedProduct = transformImageUrls(product, req);

    return res.status(200).json({
      success: true,
      product: transformedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update a product
app.put('/products/:id', async (req, res) => {
  try {
    const {id} = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) return; // Exiting here if objectId is null

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,            // Return the updated document
      runValidators: true,  // Validate updated fields
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Schema for Users
const User = mongoose.model("User", {
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  shopcart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shopcart',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Create a new user
app.post('/users', async (req, res) => {
  try {
    const {username, email, password} = req.body;

    // Check if the user already exists
    let checkUser = await User.findOne({email});
    if (checkUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create and save the new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Create a shopcart for the user and associate it with the user
    const shopcart = new Shopcart({
      user: user._id,
      items: [],
    });

    await shopcart.save();

    // Update the user's shopcart reference
    user.shopcart = shopcart._id;
    await user.save();

    const data = {
      user: {
        id: user._id,
      }
    };

    const token = jwt.sign(data, jwtSecret);
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
})

// Login User
app.post('/sessions', async (req, res) => {
  try {
    const {email, password} = req.body;

    let user = await User.findOne({email});
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const data = {
      user: {
        id: user._id,
      }
    }

    const token = jwt.sign(data, jwtSecret);
    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
})

// Read the current user's details
app.get('/users/me', authenticateToken, async (req, res) => {
  try {
    // Find the user by the ID extracted from the token
    const user = await User.findById(req.user.id).populate('shopcart');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Respond with user details (excluding sensitive fields)
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the user",
    });
  }
});


// ShopcartItem Schema
const ShopcartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  }
});

// Shopcart Schema
const ShopcartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [ShopcartItemSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Shopcart = mongoose.model("Shopcart", ShopcartSchema);

// Shopcart Endpoints

// List all shopcarts
app.get('/shopcarts', async (req, res) => {
  try {
    const shopcarts = await Shopcart.find().populate('user');
    res.status(200).json({
      success: true,
      count: shopcarts.length,
      shopcarts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create a new shopcart
app.post('/shopcarts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if the user already has a shopcart
    const user = await User.findById(userId).populate('shopcart');
    if (user.shopcart) {
      return res.status(400).json({
        success: false,
        message: "User already has a shopcart",
        shopcart: user.shopcart,
      });
    }

    const shopcart = new Shopcart({
      user: userId,
      items: [],
    });

    await shopcart.save();

    // Update the user's shopcart reference
    user.shopcart = shopcart._id;
    await user.save();


    res.status(201).json({
      success: true,
      message: "Shopcart created and assigned to usersuccessfully",
      shopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Read a shopcart
app.get('/shopcarts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) return;

    const shopcart = await Shopcart.findById(objectId).populate('user items.product');

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    res.status(200).json({
      success: true,
      shopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update a shopcart
app.put('/shopcarts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) return;

    const shopcart = await Shopcart.findById(objectId);

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    // Ensure the shopcart belongs to the authenticated user
    if (!shopcart.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Update the shopcart (excluding items)
    const { items, ...updateData } = req.body;

    Object.assign(shopcart, updateData);

    await shopcart.save();

    res.status(200).json({
      success: true,
      message: "Shopcart updated successfully",
      shopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete a shopcart
app.delete('/shopcarts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate and convert id
    const objectId = validateAndConvertId(id, res);
    if (!objectId) return;

    const shopcart = await Shopcart.findById(objectId);

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    // Ensure the shopcart belongs to the authenticated user
    if (!shopcart.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    await shopcart.remove();

    res.status(200).json({
      success: true,
      message: "Shopcart deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Shopcart Item Endpoints

// List all items in a shopcart
app.get('/shopcarts/:id/items', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate shopcart ID
    const shopcartId = validateAndConvertId(id, res);
    if (!shopcartId) return;

    const shopcart = await Shopcart.findById(shopcartId).populate('items.product');

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    res.status(200).json({
      success: true,
      items: shopcart.items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Add an item to a shopcart
app.post('/shopcarts/:id/items', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    // Validate IDs
    const shopcartId = validateAndConvertId(id, res);
    if (!shopcartId) return;

    const productObjectId = validateAndConvertId(productId, res);
    if (!productObjectId) return;

    const shopcart = await Shopcart.findById(shopcartId);

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    // Ensure the shopcart belongs to the authenticated user
    if (!shopcart.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Check if the product exists
    const product = await Product.findById(productObjectId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if the item already exists in the shopcart
    const existingItem = shopcart.items.find(item => item.product.equals(productId));

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      shopcart.items.push({
        product: productId,
        quantity: 1,
      });
    }

    await shopcart.save();

    const updatedShopcart = await Shopcart.findById(shopcartId).populate('items.product');


    res.status(201).json({
      success: true,
      message: existingItem ? "Item quantity increased by one" : "Item added to shopcart",
      shopcart: updatedShopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Read an item from a shopcart
app.get('/shopcarts/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;

    // Validate IDs
    const shopcartId = validateAndConvertId(id, res);
    if (!shopcartId) return;

    const itemObjectId = validateAndConvertId(itemId, res);
    if (!itemObjectId) return;

    const shopcart = await Shopcart.findById(shopcartId).populate('items.product');

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    const item = shopcart.items.find(item => item._id.equals(itemObjectId));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in shopcart",
      });
    }

    res.status(200).json({
      success: true,
      item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Update an item in a shopcart
app.put('/shopcarts/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;

    if (quantity == null) {
      return res.status(400).json({
        success: false,
        message: "Quantity is required",
      });
    }

    // Validate IDs
    const shopcartId = validateAndConvertId(id, res);
    if (!shopcartId) return;

    const itemObjectId = validateAndConvertId(itemId, res);
    if (!itemObjectId) return;

    const shopcart = await Shopcart.findById(shopcartId);

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    // Ensure the shopcart belongs to the authenticated user
    if (!shopcart.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const item = shopcart.items.find(item => item._id.equals(itemObjectId));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in shopcart",
      });
    }

    item.quantity = quantity;

    await shopcart.save();

    const updatedShopcart = await Shopcart.findById(shopcartId).populate('items.product');


    res.status(200).json({
      success: true,
      message: "Shopcart item updated",
      shopcart: updatedShopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete an item from a shopcart
app.delete('/shopcarts/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { id, itemId } = req.params;

    // Validate IDs
    const shopcartId = validateAndConvertId(id, res);
    if (!shopcartId) return;

    const itemObjectId = validateAndConvertId(itemId, res);
    if (!itemObjectId) return;

    const shopcart = await Shopcart.findById(shopcartId);

    if (!shopcart) {
      return res.status(404).json({
        success: false,
        message: "Shopcart not found",
      });
    }

    // Ensure the shopcart belongs to the authenticated user
    if (!shopcart.user.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const itemIndex = shopcart.items.findIndex(item => item._id.equals(itemObjectId));

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in shopcart",
      });
    }

    shopcart.items.splice(itemIndex, 1);

    await shopcart.save();

    const updatedShopcart = await Shopcart.findById(shopcartId).populate('items.product');

    res.status(200).json({
      success: true,
      message: "Shopcart item deleted",
      shopcart: updatedShopcart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


app.listen(port, (error)=>{
  if (!error) {
    console.log("Server Running on Port " + port)
  }
  else {
    console.log("Error: " + error)
  }
})
