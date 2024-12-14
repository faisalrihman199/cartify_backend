const model = require("../models");
const { Op } = require("sequelize");

exports.getPaginatedCustomerPaymentHistory = async (req, res) => {
    const user = req.user;

    if (user.role !== "customer") {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to access this endpoint."
        });
    }
    const { page = 1, limit = 10 } = req.query;
    const { startRange, endRange,  } = req.body;

    try {
        // Find the customer record for the logged-in user
        const customer = await model.customer.findOne({ where: { userId: user.id } });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        // Fetch billing records to get all billIds related to the customer
        const billingRecords = await model.billing.findAll({
            where: { customerId: customer.id },
            attributes: ['billId'] // Only fetch billId associated with the customer
        });

        // Extract billIds from the billing records
        const billIds = billingRecords.map(billing => billing.billId);

        if (billIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No billing records found for this customer."
            });
        }

        // Build the query conditions for posBills
        const conditions = {
            billId: { [Op.in]: billIds }, // Filter posBills by the found billIds
            status: 'paid',
        };

        if (startRange && endRange) {
            conditions.createdAt = {
                [Op.between]: [new Date(startRange), new Date(endRange)]
            };
        } else if (startRange) {
            conditions.createdAt = {
                [Op.gte]: new Date(startRange)
            };
        } else if (endRange) {
            conditions.createdAt = {
                [Op.lte]: new Date(endRange)
            };
        }

        // Fetch paginated results
        const offset = (page - 1) * limit;
        const posBills = await model.posBills.findAndCountAll({
            where: conditions,
            limit,
            offset,
            order: [['createdAt', 'DESC']] // Sort by creation date, newest first
        });

        return res.status(200).json({
            success: true,
            message: "POS bills retrieved successfully.",
            data: {
                posBills: posBills.rows,
                total: posBills.count,
                currentPage: page,
                totalPages: Math.ceil(posBills.count / limit),
            }
        });

    } catch (error) {
        console.error('Error fetching paginated POS bills:', error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching POS bills.",
            error: error.message
        });
    }
};
