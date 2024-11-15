const express = require('express')
const router = express.Router()
const auth = require('../../middleware/auth')
const { sendSuccessMessage, sendErrorMessage } = require('../../utils/messages')
const { statusCode } = require('../../utils/statusCode')
const Category = require('../../model/categories')

const { upload } = require('../../utils/functions')

router.post('/add', auth, upload.none(), async (req, res) => {
    try {
        const { name, dispensary } = req.body

        if (!name || !dispensary) {
            return sendErrorMessage(
                statusCode.NOT_ACCEPTABLE,
                'Required: name | dispensary',
                res
            )
        }

        const Exist = await Category.findOne({ name, dispensary })
            .sort({ position: -1 })
            .exec()

        if (Exist) {
            return sendErrorMessage(
                statusCode.NOT_ACCEPTABLE,
                'Category already exist',
                res
            )
        }

        const lastCategory = await Category.findOne({ dispensary })
            .sort({ position: -1 })
            .exec() 
        const newPosition = lastCategory ? lastCategory?.position + 1 : 1 
        let SaveObject = {
            name: name,
            dispensary: dispensary,
            position: newPosition,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        const result = await Category.create(SaveObject)
        if (result) {
            sendSuccessMessage(
                statusCode.OK,
                result,
                'Category successfully created.',
                res
            )
        } else {
            return sendErrorMessage(statusCode.NOT_FOUND, 'Invalid data', res)
        }
    } catch (error) {
        return sendErrorMessage(statusCode.SERVER_ERROR, error?.message, res)
    }
})

router.delete('/delete', auth, upload.none(), async (req, res) => {
    try {
        const { id, dispensary } = req.body

        const Exist = await Category.findOne({
            _id: id,
            dispensary: dispensary,
        })
        if (!Exist) {
            return sendErrorMessage(
                statusCode.NOT_ACCEPTABLE,
                'Invalid category/dispensary id',
                res
            )
        }
        if (Exist) {
            const _details = await Category.findByIdAndDelete(id)
            sendSuccessMessage(
                statusCode.OK,
                _details,
                'Category deleted successfully',
                res
            )
        }
    } catch (error) {
        return sendErrorMessage(statusCode.SERVER_ERROR, error.message, res)
    }
})

router.patch('/update', auth, upload.none(), async (req, res) => {
    try {
        const { id, dispensary } = req.body
        if (!id || !dispensary) {
            return sendErrorMessage(
                statusCode.NOT_ACCEPTABLE,
                'Required: id | dispensary ',
                res
            )
        }

        const Exist = await Category.findById(id)

        if (!Exist) {
            return sendErrorMessage(
                statusCode.NOT_ACCEPTABLE,
                'Invalid Category id',
                res
            )
        }
        const clone = { ...req.body }
        delete clone.id
        delete clone.dispensary
        let SaveObject = {
            ...clone,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        const result = await Category.findByIdAndUpdate(id, SaveObject, {
            new: true,
        })
        if (result) {
            sendSuccessMessage(
                statusCode.OK,
                result,
                'Category successfully updated.',
                res
            )
        } else {
            return sendErrorMessage(
                statusCode.SERVER_ERROR,
                'Invalid data',
                res
            )
        }
    } catch (error) {
        return sendErrorMessage(statusCode.SERVER_ERROR, error.message, res)
    }
})

// router.get('/', upload.none(), async (req, res) => {
//     const dispensaryId = req.body.dispensary // Get the dispensary ID from the request body

//     try {
//         let query = {}

//         if (dispensaryId) {
//             query = { dispensary: mongoose.Types.ObjectId(dispensaryId) }
//         }

//         const categories = await Category.aggregate([
//             { $match: query }, // Add the $match stage to filter based on the dispensary ID
//         ])

//         sendSuccessMessage(
//             statusCode.OK,
//             {
//                 data: categories,
//             },
//             'Categories successfully fetched.',
//             res
//         )
//     } catch (error) {
//         console.error(error)
//         return sendErrorMessage(
//             statusCode.SERVER_ERROR,
//             'An error occurred while fetching categories',
//             res
//         )
//     }
// })

router.get('/', upload.none(), async (req, res) => {
    const dispensaryId = req.query?.dispensary // Get the dispensary ID from the request body
    try {
        let query = {}

        if (dispensaryId) {
            query = { dispensary: dispensaryId }
        }
        const categoriesWithProducts = await Category.aggregate([
            {
                $match: query, // Match all categories (you can add any specific query here if needed)
            },
            {
                $lookup: {
                    from: 'products', // Replace 'products' with the actual name of the "Products" collection
                    let: { categoryId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$category', '$$categoryId'] },
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                description: 1,
                                amount: 1,
                                quantity: 1,
                                image: 1,
                                category: 1,
                                dispensary: 1,
                                // Add other fields you want to include from the "Product" collection
                            },
                        },
                    ],
                    as: 'products',
                },
            },
            {
                $project: {
                    _id: 1,
                    dispensary: '$dispensary',
                    name: '$name', // Replace 'name' with the actual field name of the category name in the "Category" collection
                    products: 1,
                },
            },
        ])

        sendSuccessMessage(
            statusCode.OK,

            categoriesWithProducts,

            'Categories and their products successfully fetched.',
            res
        )
    } catch (error) {
        console.error(error)
        return sendErrorMessage(statusCode.SERVER_ERROR, error.message, res)
    }
})

module.exports = router
