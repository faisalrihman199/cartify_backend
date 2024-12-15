const { v4: uuidv4 } = require('uuid');
const model = require('../models');
const sequelize = require('../config/db');  // Sequelize instance
const PDFDocument = require('pdfkit');
const fs = require('fs');
const schedule = require('node-schedule'); require("dotenv").config();
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { Op } = require('sequelize');

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
    let totalWeight = 0
    if (!Array.isArray(productData) || productData.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Product data is required and should be an array.',
        });
    }
    
    if (user.role !== 'customer') {
        return res.status(401).json({
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
                    message: `Entered quantity for product ${product.productName} exceeds available stock.`,
                });
            }

            // Calculate the total price for this product
            const productTotalPrice = parseFloat(product.productPrice) * parseInt(quantity);
            const productWeight = parseFloat(product.weight) * parseInt(quantity);
            total+=productTotalPrice
            totalWeight+=productWeight
            
             prodData={
                product:product.productName,
                quantity:quantity,
                Total:productTotalPrice,
                price:product.productPrice,
                weight:productWeight
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
                    totalBilling:total,
                    totalWeight:totalWeight.toFixed(2)
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






exports.getBillingDetails = async (req, res) => {
  const { billId } = req.query;
  const user = req.user;

  if (!billId) {
    return res.status(400).json({
      success: false,
      message: 'Bill ID is required.',
    });
  }

  try {
    // // Fetch customer and billing details
    // const customer = await model.customer.findOne({ where: { userId: user.id } });
    // if (!customer) {
    //   return res.status(404).json({ success: false, message: 'Customer not found.' });
    // }

    const billingRecords = await model.billing.findAll({
      where: { billId },
      include: [{ model: model.product, attributes: ['productName', 'productPrice', 'weight'] }],
    });

    let customerId = billingRecords[0].customerId;
    const customer = await model.customer.findOne({ where: { id: customerId } });

    if (billingRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'No billing records found.' });
    }

    // Prepare data for the PDF
    let totalBilling = 0;
    let totalWeight = 0;
    const productData = billingRecords.map((record) => {
      const { quantity, totalPrice } = record;
      const { productName, productPrice, weight } = record.product;

      totalBilling += parseFloat(totalPrice);
      const totalProductWeight = parseFloat(weight) * parseInt(quantity);
      totalWeight += totalProductWeight;

      return {
        product: productName,
        quantity,
        price: productPrice,
        total: totalPrice,
        weight: totalProductWeight, // Keep weight up to 2 decimal places
      };
    });

    // Create a new PDF document and set headers for response
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="billing_${billId}.pdf"`);

    // Pipe the document to the response
    doc.pipe(res);

    // Header
    doc.font('Helvetica-Bold').fontSize(24).text('Cartify', { align: 'center' });
    doc.moveDown(0.5);

    // Bill ID and Customer Name
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`Bill ID: ${billId}`, 50, doc.y);
    doc.text(`Customer: ${customer.name}`, 50, doc.y + 15);
    doc.moveDown();

    // Table Header
    const columnPositions = { product: 50, quantity: 100, price: 150, total: 200, weight: 250 };
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Product', columnPositions.product, doc.y, { continued: true });
    doc.text('Quantity', columnPositions.quantity, doc.y, { continued: true });
    doc.text('Price', columnPositions.price, doc.y, { continued: true });
    doc.text('Total', columnPositions.total, doc.y, { continued: true });
    doc.text('Weight', columnPositions.weight, doc.y);
    doc.moveDown();

    // Table Rows
    doc.font('Helvetica').fontSize(12);
    productData.forEach((item) => {
      doc.text(item.product, columnPositions.product, doc.y, { continued: true });
      doc.text(item.quantity.toString(), columnPositions.quantity, doc.y, { continued: true });
      doc.text(`$${item.price}`, columnPositions.price, doc.y, { continued: true });
      doc.text(`$${item.total}`, columnPositions.total, doc.y, { continued: true });
      doc.text(`${item.weight} kg`, columnPositions.weight, doc.y);
      doc.moveDown();
    });

    // Totals
    doc.moveDown();
    doc.font('Helvetica-Bold');
    doc.text(`Total Billing: $${totalBilling.toFixed(2)}`, { align: 'left' });
    doc.text(`Total Weight: ${totalWeight.toFixed(2)} kg`, { align: 'left' });

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


exports.createPosBills = async (req, res) => {
  const billId = req.query.billId;
  if (!billId) {
    return res.status(400).json({
      success: false,
      message: 'Bill ID is required.',
    });
  }

  try {
    let existingPosBill = await model.posBills.findOne({ where: { billId } });
    if (existingPosBill) {
      return res.status(400).json({ success: false, message: 'POS bill already exists.' });
    }

    const billing = await model.billing.findOne({ where: { billId } });
    if (!billing) {
      return res.status(404).json({ success: false, message: 'Billing record not found.' });
    }

    const product = await model.product.findByPk(billing.productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const company = await model.company.findOne({ where: { userId: product.userId } });
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found.' });
    }

    const posBill = await model.posBills.create({ billId, status: 'pending', companyId: company.id });

    // Schedule a job to cancel the bill if not paid within 30 minutes
    schedule.scheduleJob(new Date(Date.now() + 30 * 60 * 1000), async () => {
      try {
        const currentBill = await model.posBills.findOne({ where: { billId } });
        if (currentBill && currentBill.status === 'pending') {
          await model.posBills.update({ status: 'cancelled' }, { where: { billId } });
          console.log(`POS bill with ID ${billId} has been automatically cancelled.`);
        }
      } catch (error) {
        console.error(`Error during scheduled cancellation of POS bill ${billId}:`, error);
      }
    });

    return res.status(200).json({
      success: true,
      message: 'POS bill created successfully.',
      posBill,
    });
  } catch (error) {
    console.error('Error creating POS bill:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Scheduler to check every 1 minute for pending bills that are older than 30 minutes
schedule.scheduleJob('*/1 * * * *', async () => {
  try {
    // Get the current date and time
    const currentTime = new Date();

    // Find bills that are pending and have been created more than 30 minutes ago
    const pendingBills = await model.posBills.findAll({
      where: {
        status: 'pending',
        createdAt: {
          [Op.lte]: new Date(currentTime - 30 * 60 * 1000) // 30 minutes ago
        }
      }
    });

    if (pendingBills.length > 0) {
      // Update the status of the pending bills to 'cancelled'
      for (let bill of pendingBills) {
        await model.posBills.update(
          { status: 'cancelled' },
          { where: { billId: bill.billId } }
        );
        console.log(`POS bill with ID ${bill.billId} has been automatically cancelled.`);
      }
    } else {
      console.log('No pending bills older than 30 minutes found.');
    }
  } catch (error) {
    console.error('Error during the scheduled bill check:', error);
  }
});