const model = require("../models");
const { Op } = require("sequelize");

exports.getPaginatedCustomerPaymentHistory = async (req, res) => {
    const user = req.user;

    // Check if the user is a customer or admin
    if (user.role !== "customer" && user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to access this endpoint."
        });
    }

    const { page = 1, limit = 10, billId } = req.query;  // Get billId from query parameters
    const { startRange, endRange } = req.query;

    try {
        let conditions = {
            status: 'paid',
        };

        if (user.role === "customer") {
            // For customers, find the customer record and use their billIds
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
                attributes: ['billId']
            });

            const billIds = billingRecords.map(billing => billing.billId);

            if (billIds.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No billing records found for this customer."
                });
            }

            // Apply the customer-specific filter for billIds
            conditions.billId = { [Op.in]: billIds };
        } else if (user.role === "admin") {
            // For admins, find the company and filter posBills based on the company
            const company = await model.company.findOne({ where: { userId: user.id } });
            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "Company not found for admin."
                });
            }

            // Apply the company-specific filter for posBills
            conditions.companyId = company.id;
        }

        // Optionally add billId search condition
        if (billId) {
            conditions.billId = { [Op.like]: `%${billId}%` };  // Allow partial match on billId
        }

        // Apply date range filters if provided
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

