const router = require('express').Router();

const OrderModel = require('../models/order');
const OrderStatus = require('../constants/order-status');
const Passport = require('../modules/passport');
const ProductModel = require('../models/product');
const UserModel = require('../models/user');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Các API quản trị
 */

/**
 * @swagger
 * /admin/getUser:
 *   post:
 *     summary: Lấy thông tin user hiện tại
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Trả về thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "64f1234abcd56789ef012345"
 *                 username:
 *                   type: string
 *                   example: "admin"
 *                 email:
 *                   type: string
 *                   example: "admin@example.com"
 */
router.post('/getUser', Passport.requireAuth, (req, res) => {
  res.json(req.user);
});

router.get('/', Passport.requireAuth, async (req, res) => {
  const data = {
    order: 0,
    product: 0,
    profit: 0,
    user: 0
  };

  data.order = await OrderModel.find().count();
  data.product = await ProductModel.find().count();
  data.user = await UserModel.find().count();

  const arr = await OrderModel.find(
    {
      status: OrderStatus.paid
    }
  ).lean();

  if (arr && arr.length > 0) {
    for (const x of arr) {
      data.profit += x.total;
    }
  }

  res.render('admin/index', data);
});

module.exports = router;
