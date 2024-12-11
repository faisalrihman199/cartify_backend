const { v4: uuidv4 } = require('uuid');
const model = require('../models');
const sequelize = require('../config/db');  // Sequelize instance

// Generate a unique BILL ID for the user
const generateBillId = async () => {
    let billId;
    let isUnique = false;

    while (!isUnique) {
        // Generate a UUID
        const uuid = uuidv4();

        // Extract the numeric portion (e.g., take the first 6 characters of the UUID and convert them to numbers)
        const numericPart = parseInt(uuid.replace(/[^0-9]/g, '').slice(0, 6));

        // Ensure it's a 6-digit number
        const paddedNumber = numericPart.toString().padStart(6, '0');

        // Combine with the prefix
        billId = `BILL${paddedNumber}`;

        // Check if billId already exists in the database
        const existingBill = await model.billing.findOne({ where: { billId } });

        if (!existingBill) {
            isUnique = true;  // If no existing record is found, the billId is unique
        }
    }

    return billId;
};

exports.createBilling = async (req, res) => {
    const user = req.user;
    const { productData } = req.body;  // productData contains array of { productId, quantity }
    let data = []
    let total = 0
    if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Product data is required and should be an array.',
        });
    }
    
    if (user.role !== 'customer') {
        return res.status(400).json({
            success: false,
            message: 'Only customers can create billing.',
        });
    }

    const customer = await model.customer.findOne({ where: { userId: user.id } });
    const transaction = await sequelize.transaction();

    try {
        // 1. Generate a unique bill ID for each product billing
        const billId = await generateBillId();  // Call the function to ensure uniqueness

        // 2. Loop through productData and create billing for each product
        for (let i = 0; i < productData.length; i++) {
            const { productId, quantity } = productData[i];

            let prodData

            // Fetch the product to get its price and stock
            const product = await model.product.findByPk(productId);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product with ID ${productId} not found.`,
                });
            }

            // Check if entered quantity is greater than available stock
            if (parseInt(quantity) > parseInt(product.stock)) {
                return res.status(400).json({
                    success: false,
                    message: `Entered quantity for product ${productId} exceeds available stock.`,
                });
            }

            // Calculate the total price for this product
            const productTotalPrice = parseFloat(product.productPrice) * parseInt(quantity);
            total+=productTotalPrice
            
             prodData={
                product:product.name,
                quantity:quantity,
                Total:productTotalPrice,
                price:product.productPrice
             }

                data.push(prodData)
             
            // 3. Create the billing record for this product
            await model.billing.create(
                {
                    billId,  // Use the unique billId for all products in the array
                    quantity,
                    totalPrice: productTotalPrice.toFixed(2),  // Total price rounded to 2 decimal places
                    status: 'pending',  // Default status for new billing
                    customerId: customer.id,  // Assuming the user is the customer
                    productId,  // Product ID for this specific billing
                },
                { transaction }
            );
        }

        // Commit the transaction after processing all items
        await transaction.commit();

        // 4. Return the success response
        res.status(201).json({
            success: true,
            message: 'Billing created successfully for all items.',
            
                data:{
                    productData:data,
                    billId:billId,
                    customerName:customer.name,
                    totalBilling:total
                }

            
        });
    } catch (error) {
        // Rollback the transaction on error
        await transaction.rollback();
        console.error('Error creating billing:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating billing.',
        });
    }
};




