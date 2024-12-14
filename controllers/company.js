const model = require('../models');

const { Op } = require('sequelize');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET ); // Replace with your Stripe secret key

exports.getAllPendingPosBillsPaginated = async (req, res) => {
    const user = req.user;

    // Ensure the user is an admin
    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to perform this action.'
        });
    }

    try {
        // Retrieve company details associated with the user
        const company = await model.company.findOne({ where: { userId: user.id } });

        // Handle case where company is not found
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found for this user.'
            });
        }

        // Extract pagination and search parameters from request query
        const { page = 1, limit = 10, search = '' } = req.query; // Defaults: page 1, 10 records per page, empty search
        const offset = (page - 1) * limit;

        // Fetch pending POS bills for the company with pagination
        const { count, rows: pendingBills } = await model.posBills.findAndCountAll({
            where: {
                companyId: company.id,
                status: 'pending' // Filter by pending status
            },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']] // Order by most recent
        });

        // Fetch detailed data for each pending bill
        const detailedPendingBills = await Promise.all(
            pendingBills.map(async (bill) => {
                // Fetch billing records for the bill ID
                const billingDetails = await model.billing.findAll({
                    where: { billId: bill.billId },
                    include: [{ model: model.product, attributes: ['productName', 'productPrice', 'weight'] }]
                });

                if (billingDetails.length === 0) {
                    return null; // Skip if no billing details exist for this bill
                }

                // Use the customerId from the first billing record (all should belong to the same customer)
                const customerId = billingDetails[0].customerId;
                const customer = await model.customer.findOne({
                    where: {
                        id: customerId,
                        name: { [Op.like]: `%${search}%` } // Search by customer name
                    }
                });

                // If no customer matches the search, skip this bill
                if (!customer) return null;

                let totalBilling = 0;
                let totalWeight = 0;
                const productData = billingDetails.map((billing) => {
                    const product = billing.product; // Get associated product details
                    const totalPrice = parseFloat(billing.totalPrice);
                    const weight = parseFloat(product.weight) * billing.quantity;

                    totalBilling += totalPrice;
                    totalWeight += weight;

                    return {
                        product: product.productName,
                        quantity: billing.quantity,
                        total: totalPrice.toFixed(2),
                        price: product.productPrice,
                        weight: weight.toFixed(2)
                    };
                });

                return {
                    id: bill.id,
                    billId: bill.billId,
                    customerName: customer.name,
                    totalBilling: totalBilling.toFixed(2),
                    totalWeight: totalWeight.toFixed(2),
                    productData
                };
            })
        );

        // Remove null entries (in case some bills have no billing details or do not match the search)
        const filteredBills = detailedPendingBills.filter((bill) => bill !== null);

        // Prepare response with pagination details
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            success: true,
            data: {
                pendingBills: filteredBills,
                currentPage: parseInt(page),
                totalPages,
                totalRecords: count
            }
        });
    } catch (error) {
        console.error('Error fetching pending POS bills:', error);

        // Handle server error
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};


exports.setPosBillAsPaid = async (req, res) => {
    const user = req.user;

    // Ensure the user is an admin
    if (user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to perform this action.'
        });
    }

    const posBillId = req.query.id; // Use posBillId from query
    if (!posBillId) {
        return res.status(400).json({
            success: false,
            message: 'POS Bill ID is required.'
        });
    }

    try {
        // Find the POS bill by ID
        const posBill = await model.posBills.findOne({
            where: { id: posBillId },
            include: [
                {
                    model: model.billing,
                    include: [{ model: model.product }]
                }
            ]
        });

        // Check if the POS bill exists
        if (!posBill) {
            return res.status(404).json({
                success: false,
                message: 'POS bill not found.'
            });
        }

        // Validate ownership (ensure the user owns all products in the bill)
        const unauthorized = posBill.billing.some(
            (billing) => billing.product.userId !== user.id
        );

        if (unauthorized) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to perform this action.'
            });
        }

        // Deduct the quantity from stock for each product in the bill
        for (const billing of posBill.billing) {
            const product = billing.product;
            const newStock = product.stock - billing.quantity;

            // Check if the stock is sufficient
            if (newStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for product: ${product.productName}.`
                });
            }

            // Update the product's stock
            await model.product.update(
                { stock: newStock },
                { where: { id: product.id } }
            );
        }

        // Update the POS bill's status to 'paid'
        await model.posBills.update({ status: 'paid' }, { where: { id: posBillId } });

        return res.status(200).json({
            success: true,
            message: 'POS bill marked as paid, and stock updated successfully.'
        });
    } catch (error) {
        console.error('Error updating POS bill:', error);

        // Handle server error
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};


exports.posOnlinePayment = async (req, res) => {
    const user = req.user;

    // // Ensure the user is an admin or authorized user (depending on your logic)
    // if (user.role !== 'admin') {
    //     return res.status(403).json({
    //         success: false,
    //         message: 'You are not authorized to perform this action.',
    //     });
    // }

    const billId = req.query.id; // Use billId from query
    if (!billId) {
        return res.status(400).json({
            success: false,
            message: 'Bill ID is required.',
        });
    }

    try {
        // Find the billing details by Bill ID
        const billings = await model.billing.findAll({
            where: { billId },
            include: [{ model: model.product }],
        });

        // Check if any billing records exist for the given Bill ID
        if (!billings || billings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Billing details not found for the given Bill ID.',
            });
        }

        // Validate ownership (ensure the user owns all products in the billing records)
        const unauthorized = billings.some(
            (billing) => billing.product.userId !== user.id
        );

        // if (unauthorized) {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'You are not authorized to perform this action.',
        //     });
        // }

        // Calculate the total amount of the POS bill
        let totalAmount = 0;
        const billingDetails = [];
        for (const billing of billings) {
            const product = billing.product;
            const productTotal = parseFloat(product.productPrice) * billing.quantity;
            totalAmount += productTotal;

            billingDetails.push({
                productName: product.productName,
                quantity: billing.quantity,
                totalPrice: productTotal.toFixed(2),
            });
        }

        // Fetch the company ID using the first product's userId
        const firstProduct = billings[0].product;
        const userId = firstProduct.userId;

        const company = await model.company.findOne({ where: { userId } });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found for the user.',
            });
        }

        // Create the POS Bill with status "pending"
        const posBill = await model.posBills.create({
            companyId: company.id,
            billId,
            totalAmount: totalAmount.toFixed(2),
            status: 'pending', // Initial status
        });

        // Create the Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: 'usd', // Adjust according to your currency
            description: `Payment for Bill ID ${billId}`,
            metadata: { billId },
        });

        // Send the client secret to the frontend to complete the payment
        return res.status(200).json({
            success: true,
            message: 'Stripe payment intent created successfully, POS Bill created with status pending.',
            data: {
                clientSecret: paymentIntent.client_secret,
                billingDetails,
                totalAmount: totalAmount.toFixed(2), // Send total amount as well
                posBill, // Return the created POS Bill
            },
        });
    } catch (error) {
        console.error('Error processing POS online payment:', error);

        // Handle server error
        return res.status(500).json({
            success: false,
            message: 'Internal server error while processing online payment.',
        });
    }
};


exports.stripeWebhook = async (req, res) => {
    let event;

    try {
        // Parse the incoming Stripe event
        event = req.body;

        // Uncomment if you want to verify the webhook signature
        // const sig = req.headers['stripe-signature'];
        // event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);

        console.log('Stripe Event Received:', event.type);
    } catch (error) {
        console.error('Error parsing Stripe event:', error);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Handle different event types
    switch (event.type) {
        case 'payment_intent.succeeded':
            try {
                const paymentIntent = event.data.object;
                const billId = paymentIntent.metadata.billId;

                if (!billId) {
                    console.error('Bill ID missing in payment intent metadata.');
                    return res.status(400).send('Bill ID is required in metadata.');
                }

                // Find the posBill using the billId
                const posBill = await model.posBills.findOne({
                    where: { billId },
                    include: [
                        {
                            model: model.billing,
                            include: [{ model: model.product }]
                        }
                    ]
                });

                if (!posBill) {
                    console.error('POS Bill not found for the given Bill ID:', billId);
                    return res.status(404).send('POS Bill not found.');
                }

                // Update the status of the posBill to "paid"
                await model.posBills.update(
                    { status: 'paid' },
                    { where: { billId } }
                );

                // Deduct the quantity from stock for each product in the bill
                for (const billing of posBill.billing) {
                    const product = billing.product;
                    const newStock = product.stock - billing.quantity;

                    // Check if the stock is sufficient
                    if (newStock < 0) {
                        console.error('Insufficient stock for product:', product.productName);
                        return res.status(400).send(`Insufficient stock for product: ${product.productName}`);
                    }

                    // Update the product's stock
                    await model.product.update(
                        { stock: newStock },
                        { where: { id: product.id } }
                    );
                }

                console.log(`POS Bill with ID ${billId} marked as paid and stock updated.`);
                res.status(200).send('POS Bill status updated to paid and stock updated.');
            } catch (error) {
                console.error('Error processing payment intent:', error);
                res.status(500).send('Internal server error.');
            }
            break;

        case 'payment_intent.payment_failed':
            try {
                const paymentIntent = event.data.object;
                const billId = paymentIntent.metadata.billId;

                if (!billId) {
                    console.error('Bill ID missing in payment intent metadata.');
                    return res.status(400).send('Bill ID is required in metadata.');
                }

                // Find the posBill using the billId
                const posBill = await model.posBills.findOne({ where: { billId } });

                if (!posBill) {
                    console.error('POS Bill not found for the given Bill ID:', billId);
                    return res.status(404).send('POS Bill not found.');
                }

                // Update the status of the posBill to "failed"
                await model.posBills.update(
                    { status: 'failed' },
                    { where: { billId } }
                );

                console.log(`POS Bill with ID ${billId} marked as failed.`);
                res.status(200).send('POS Bill status updated to failed.');
            } catch (error) {
                console.error('Error updating POS Bill status on failure:', error);
                res.status(500).send('Internal server error.');
            }
            break;

        case 'payment_intent.canceled':
            try {
                const paymentIntent = event.data.object;
                const billId = paymentIntent.metadata.billId;

                if (!billId) {
                    console.error('Bill ID missing in payment intent metadata.');
                    return res.status(400).send('Bill ID is required in metadata.');
                }

                // Find the posBill using the billId
                const posBill = await model.posBills.findOne({ where: { billId } });

                if (!posBill) {
                    console.error('POS Bill not found for the given Bill ID:', billId);
                    return res.status(404).send('POS Bill not found.');
                }

                // Update the status of the posBill to "canceled"
                await model.posBills.update(
                    { status: 'canceled' },
                    { where: { billId } }
                );

                console.log(`POS Bill with ID ${billId} marked as canceled.`);
                res.status(200).send('POS Bill status updated to canceled.');
            } catch (error) {
                console.error('Error updating POS Bill status on cancellation:', error);
                res.status(500).send('Internal server error.');
            }
            break;

        default:
            // Return a 200 response for all unhandled event types
            console.log(`Unhandled event type: ${event.type}`);
            res.status(200).send('Event received.');
            break;
    }
};
